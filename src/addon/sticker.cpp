#include <napi.h>
#include <vector>
#include <string>
#include <cstring>
#include <stdexcept>
#include <sstream>
#include <random>
#include <algorithm>
#include <limits>
#include <mutex>
#include <cmath>
#include <webp/encode.h>
#include <webp/mux.h>
#include <webp/mux_types.h>
#include <webp/decode.h>
#include <webp/demux.h>

extern "C" {
#include <libavformat/avformat.h>
#include <libavutil/imgutils.h>
#include <libavutil/avutil.h>
#include <libavcodec/avcodec.h>
#include <libswscale/swscale.h>
#include <libavutil/opt.h> 
}

static inline void ensure(bool ok, const char* msg) {
  if (!ok) throw std::runtime_error(msg);
}
static inline void ensure_ptr(const void* p, const char* msg) {
  if (!p) throw std::runtime_error(msg);
}

struct AvFmtGuard { AVFormatContext* p=nullptr; ~AvFmtGuard(){ if(p) avformat_close_input(&p);} };
struct AvIOGuard  { AVIOContext*     p=nullptr; ~AvIOGuard(){ if(p){ av_free(p->buffer); avio_context_free(&p);} } };
struct AvCodecCtxG{ AVCodecContext*  p=nullptr; ~AvCodecCtxG(){ if(p) avcodec_free_context(&p);} };
struct AvFrameGuard{ AVFrame*        p=nullptr; ~AvFrameGuard(){ if(p) av_frame_free(&p);} };
struct SwsGuard   { SwsContext*      p=nullptr; ~SwsGuard(){ if(p) sws_freeContext(p);} };
struct AVOutFmtGuard { 
  AVFormatContext* oc = nullptr; 
  ~AVOutFmtGuard() { 
    if (oc) {
      if (oc->pb) {
        uint8_t* buf = nullptr;
        avio_close_dyn_buf(oc->pb, &buf);
        if (buf) av_free(buf);
        oc->pb = nullptr;
      }
      avformat_free_context(oc);
    }
  } 
};

static inline void write_le32(uint8_t* d, uint32_t x){
  d[0]=x&0xff; d[1]=(x>>8)&0xff; d[2]=(x>>16)&0xff; d[3]=(x>>24)&0xff;
}

static std::string random_hex(size_t nbytes) {
  static std::mutex mtx;
  static std::random_device rd;
  static std::mt19937 gen(rd());
  
  std::lock_guard<std::mutex> lock(mtx);
  std::uniform_int_distribution<> dis(0, 255);
  
  static const char* k="0123456789abcdef";
  std::string out;
  out.reserve(nbytes*2);
  
  for (size_t i=0; i<nbytes; ++i){ 
    unsigned v = dis(gen);
    out.push_back(k[(v>>4)&0xf]);
    out.push_back(k[v&0xf]);
  }
  return out;
}

static std::vector<uint8_t> BuildWhatsAppExif(
  const std::string& packName,
  const std::string& authorName,
  const std::vector<std::string>& emojis
){
  std::ostringstream ss;
  ss << "{"
     << "\"sticker-pack-id\":\"" << random_hex(16) << "\","
     << "\"sticker-pack-name\":\"" << packName << "\","
     << "\"sticker-pack-publisher\":\"" << authorName << "\","
     << "\"emojis\":[";
  for(size_t i=0;i<emojis.size();++i){ if(i) ss<<","; ss<<"\""<<emojis[i]<<"\""; }
  ss << "]}";
  const std::string json = ss.str();

  static const uint8_t tiff_hdr[] = {
    0x49,0x49,0x2A,0x00,0x08,0x00,0x00,0x00,0x01,0x00,0x41,0x57,0x07,0x00,
    0x00,0x00,0x00,0x00,0x16,0x00,0x00,0x00
  };
  std::vector<uint8_t> exif;
  exif.reserve(sizeof(tiff_hdr)+json.size());
  exif.insert(exif.end(), tiff_hdr, tiff_hdr+sizeof(tiff_hdr));
  write_le32(&exif[14], (uint32_t)json.size());
  exif.insert(exif.end(), json.begin(), json.end());
  return exif;
}

static std::vector<uint8_t> AttachExifToWebP(const std::vector<uint8_t>& webp,
                                             const std::vector<uint8_t>& exif){
  WebPData in; 
  in.bytes = webp.data(); 
  in.size = webp.size();
  
  WebPMux* mux = WebPMuxCreate(&in, 1); 
  ensure_ptr(mux, "WebPMuxCreate failed");
  
  WebPData ex; 
  ex.bytes = exif.data(); 
  ex.size = exif.size();
  
  WebPMuxError err = WebPMuxSetChunk(mux, "EXIF", &ex, 1);
  if (err != WEBP_MUX_OK) {
    WebPMuxDelete(mux);
    throw std::runtime_error("WebPMuxSetChunk(EXIF) failed");
  }
  
  WebPData out; 
  WebPDataInit(&out);
  
  err = WebPMuxAssemble(mux, &out);
  if (err != WEBP_MUX_OK) {
    WebPMuxDelete(mux);
    throw std::runtime_error("WebPMuxAssemble failed");
  }
  
  std::vector<uint8_t> res(out.bytes, out.bytes + out.size);
  
  WebPDataClear(&out);
  WebPMuxDelete(mux);
  
  return res;
}

static bool IsWebP(const uint8_t* d, size_t n){
  if(n<12) return false;
  return std::memcmp(d, "RIFF", 4)==0 && std::memcmp(d+8, "WEBP", 4)==0;
}

struct BufferCtx { const uint8_t* data; size_t size; size_t pos; };

static int readPacket(void* opaque, uint8_t* buf, int buf_size){
  BufferCtx* c = (BufferCtx*)opaque;
  if (!c || !buf || buf_size < 0) return AVERROR(EINVAL);
  
  size_t rem = c->size - c->pos;
  if (rem == 0) return AVERROR_EOF;
  
  size_t tocpy = std::min(rem, (size_t)buf_size);
  std::memcpy(buf, c->data + c->pos, tocpy);
  c->pos += tocpy;
  return (int)tocpy;
}

struct OpenResult {
  AvFmtGuard fmt;
  AvIOGuard  io;
  BufferCtx* ctx = nullptr;
  int stream_index = -1;
  AVStream* st = nullptr;
};

static void FreeBufferCtx(OpenResult& R){ 
  if(R.ctx){ 
    delete R.ctx; 
    R.ctx=nullptr; 
  } 
}

static OpenResult OpenFromBuffer(const uint8_t* buf, size_t len){
  OpenResult R;
  
  const size_t IO_BUF_SIZE = 32768;
  unsigned char* iobuf = (unsigned char*)av_malloc(IO_BUF_SIZE);
  ensure_ptr(iobuf, "av_malloc failed");
  
  R.ctx = new BufferCtx{buf, len, 0};
  R.io.p = avio_alloc_context(iobuf, IO_BUF_SIZE, 0, R.ctx, &readPacket, nullptr, nullptr);
  ensure_ptr(R.io.p, "avio_alloc_context failed");
  
  R.fmt.p = avformat_alloc_context();
  ensure_ptr(R.fmt.p, "avformat_alloc_context failed");
  R.fmt.p->pb = R.io.p;
  R.fmt.p->flags |= AVFMT_FLAG_CUSTOM_IO;

  int ret = avformat_open_input(&R.fmt.p, "", nullptr, nullptr);
  ensure(ret == 0, "avformat_open_input failed");
  
  ret = avformat_find_stream_info(R.fmt.p, nullptr);
  ensure(ret >= 0, "avformat_find_stream_info failed");
  
  R.stream_index = av_find_best_stream(R.fmt.p, AVMEDIA_TYPE_VIDEO, -1, -1, nullptr, 0);
  ensure(R.stream_index >= 0, "no video/image stream found");
  R.st = R.fmt.p->streams[R.stream_index];
  
  return R;
}

struct RGBAFrame { 
  std::vector<uint8_t> data; 
  int w, h; 
  int64_t pts_ms; 
};

static SwsContext* MakeSws(int sw, int sh, AVPixelFormat sfmt, int dw, int dh){
  if (sw <= 0 || sh <= 0 || dw <= 0 || dh <= 0) return nullptr;
  if (sw > 8192 || sh > 8192 || dw > 8192 || dh > 8192) return nullptr;
  
  AVPixelFormat src_fmt = sfmt;
  if (sfmt == AV_PIX_FMT_YUVJ420P) src_fmt = AV_PIX_FMT_YUV420P;
  else if (sfmt == AV_PIX_FMT_YUVJ422P) src_fmt = AV_PIX_FMT_YUV422P;
  else if (sfmt == AV_PIX_FMT_YUVJ444P) src_fmt = AV_PIX_FMT_YUV444P;
  else if (sfmt == AV_PIX_FMT_YUVJ440P) src_fmt = AV_PIX_FMT_YUV440P;
  
  SwsContext* sws = sws_getContext(
    sw, sh, src_fmt, 
    dw, dh, AV_PIX_FMT_RGBA, 
    SWS_BILINEAR, nullptr, nullptr, nullptr
  );
  
  return sws;
}

static std::vector<uint8_t> ResizeRGBA(const uint8_t* src, int sw, int sh, int dw, int dh) {
  size_t dst_size = (size_t)dw * (size_t)dh * 4;
  std::vector<uint8_t> dst(dst_size);
  
  float x_ratio = (float)sw / (float)dw;
  float y_ratio = (float)sh / (float)dh;
  
  for (int y = 0; y < dh; ++y) {
    for (int x = 0; x < dw; ++x) {
      float src_x = x * x_ratio;
      float src_y = y * y_ratio;
      
      int x1 = (int)src_x;
      int y1 = (int)src_y;
      int x2 = std::min(x1 + 1, sw - 1);
      int y2 = std::min(y1 + 1, sh - 1);
      
      float fx = src_x - x1;
      float fy = src_y - y1;
      
      size_t idx_tl = ((size_t)y1 * sw + x1) * 4;
      size_t idx_tr = ((size_t)y1 * sw + x2) * 4;
      size_t idx_bl = ((size_t)y2 * sw + x1) * 4;
      size_t idx_br = ((size_t)y2 * sw + x2) * 4;
      
      size_t dst_idx = ((size_t)y * dw + x) * 4;
      
      for (int c = 0; c < 4; ++c) {
        float tl = src[idx_tl + c];
        float tr = src[idx_tr + c];
        float bl = src[idx_bl + c];
        float br = src[idx_br + c];
        
        float top = tl + (tr - tl) * fx;
        float bot = bl + (br - bl) * fx;
        float val = top + (bot - top) * fy;
        
        dst[dst_idx + c] = (uint8_t)(val + 0.5f);
      }
    }
  }
  
  return dst;
}

static void ApplyRoundedCorners(uint8_t* rgba, int w, int h, int radius) {
  if (radius <= 0 || radius > w/2 || radius > h/2) return;
  
  for (int y = 0; y < radius; ++y) {
    for (int x = 0; x < radius; ++x) {
      float dx = radius - x - 0.5f;
      float dy = radius - y - 0.5f;
      float dist = std::sqrt(dx*dx + dy*dy);
      
      if (dist > radius) {
        size_t idx = ((size_t)y * w + x) * 4;
        rgba[idx + 3] = 0;
      } else if (dist > radius - 1.0f) {
        float alpha = radius - dist;
        alpha = std::max(0.0f, std::min(1.0f, alpha));
        size_t idx = ((size_t)y * w + x) * 4;
        rgba[idx + 3] = (uint8_t)(rgba[idx + 3] * alpha);
      }
    }
  }
  
  for (int y = 0; y < radius; ++y) {
    for (int x = w - radius; x < w; ++x) {
      float dx = x - (w - radius) + 0.5f;
      float dy = radius - y - 0.5f;
      float dist = std::sqrt(dx*dx + dy*dy);
      
      if (dist > radius) {
        size_t idx = ((size_t)y * w + x) * 4;
        rgba[idx + 3] = 0;
      } else if (dist > radius - 1.0f) {
        float alpha = radius - dist;
        alpha = std::max(0.0f, std::min(1.0f, alpha));
        size_t idx = ((size_t)y * w + x) * 4;
        rgba[idx + 3] = (uint8_t)(rgba[idx + 3] * alpha);
      }
    }
  }
  
  for (int y = h - radius; y < h; ++y) {
    for (int x = 0; x < radius; ++x) {
      float dx = radius - x - 0.5f;
      float dy = y - (h - radius) + 0.5f;
      float dist = std::sqrt(dx*dx + dy*dy);
      
      if (dist > radius) {
        size_t idx = ((size_t)y * w + x) * 4;
        rgba[idx + 3] = 0;
      } else if (dist > radius - 1.0f) {
        float alpha = radius - dist;
        alpha = std::max(0.0f, std::min(1.0f, alpha));
        size_t idx = ((size_t)y * w + x) * 4;
        rgba[idx + 3] = (uint8_t)(rgba[idx + 3] * alpha);
      }
    }
  }
  
  for (int y = h - radius; y < h; ++y) {
    for (int x = w - radius; x < w; ++x) {
      float dx = x - (w - radius) + 0.5f;
      float dy = y - (h - radius) + 0.5f;
      float dist = std::sqrt(dx*dx + dy*dy);
      
      if (dist > radius) {
        size_t idx = ((size_t)y * w + x) * 4;
        rgba[idx + 3] = 0;
      } else if (dist > radius - 1.0f) {
        float alpha = radius - dist;
        alpha = std::max(0.0f, std::min(1.0f, alpha));
        size_t idx = ((size_t)y * w + x) * 4;
        rgba[idx + 3] = (uint8_t)(rgba[idx + 3] * alpha);
      }
    }
  }
}

static std::vector<uint8_t> RGBAResize512(const uint8_t* rgba, int w, int h, bool crop, int cornerRadius){
  const int TW = 512, TH = 512;
  
  if (!rgba || w <= 0 || h <= 0 || w > 8192 || h > 8192) {
    throw std::runtime_error("Invalid input dimensions for resize");
  }
  
  if ((size_t)w > SIZE_MAX / 4 / h) {
    throw std::runtime_error("Image dimensions would cause overflow");
  }
  
  size_t expected_size = (size_t)w * (size_t)h * 4;
  if (expected_size > 256 * 1024 * 1024) {
    throw std::runtime_error("Input image too large");
  }
  
  if (crop) {
    int side = std::min(w, h);
    if (side <= 0) throw std::runtime_error("Invalid crop side");
    
    int srcX = (w - side) / 2;
    int srcY = (h - side) / 2;
    
    if ((size_t)side > SIZE_MAX / 4 / side) {
      throw std::runtime_error("Crop dimensions would cause overflow");
    }
    
    size_t cropped_size = (size_t)side * (size_t)side * 4;
    if (cropped_size == 0 || cropped_size > 256 * 1024 * 1024) {
      throw std::runtime_error("Invalid cropped size");
    }
    
    std::vector<uint8_t> cropped;
    try {
      cropped.resize(cropped_size);
    } catch (const std::bad_alloc&) {
      throw std::runtime_error("Failed to allocate memory for crop");
    }
    
    for (int y = 0; y < side; ++y) {
      size_t src_offset = ((size_t)(srcY + y) * (size_t)w + (size_t)srcX) * 4;
      size_t dst_offset = (size_t)y * (size_t)side * 4;
      size_t row_bytes = (size_t)side * 4;
      
      if (src_offset + row_bytes > expected_size) {
        throw std::runtime_error("Crop source out of bounds");
      }
      if (dst_offset + row_bytes > cropped_size) {
        throw std::runtime_error("Crop destination out of bounds");
      }
      
      std::memcpy(cropped.data() + dst_offset, rgba + src_offset, row_bytes);
    }

    auto resized = ResizeRGBA(cropped.data(), side, side, TW, TH);
    
    if (cornerRadius > 0) {
      ApplyRoundedCorners(resized.data(), TW, TH, cornerRadius);
    }
    
    return resized;
    
  } else {
    double rw = (double)TW / (double)w;
    double rh = (double)TH / (double)h;
    double scale = std::min(rw, rh);
    
    int dstW = std::max(1, (int)(w * scale));
    int dstH = std::max(1, (int)(h * scale));
    
    dstW = std::min(dstW, TW);
    dstH = std::min(dstH, TH);

    std::vector<uint8_t> scaled = ResizeRGBA(rgba, w, h, dstW, dstH);

    std::vector<uint8_t> canvas;
    try {
      canvas.resize((size_t)TW * (size_t)TH * 4, 0);
    } catch (const std::bad_alloc&) {
      throw std::runtime_error("Failed to allocate canvas buffer");
    }
    
    int offX = (TW - dstW) / 2;
    int offY = (TH - dstH) / 2;
    
    for (int y = 0; y < dstH; ++y) {
      size_t dst_offset = ((size_t)(offY + y) * (size_t)TW + (size_t)offX) * 4;
      size_t src_offset = (size_t)y * (size_t)dstW * 4;
      size_t row_bytes = (size_t)dstW * 4;
      
      std::memcpy(canvas.data() + dst_offset, scaled.data() + src_offset, row_bytes);
    }
    
    if (cornerRadius > 0) {
      std::vector<uint8_t> temp_scaled(scaled);
      ApplyRoundedCorners(temp_scaled.data(), dstW, dstH, cornerRadius);
      
      for (int y = 0; y < dstH; ++y) {
        size_t dst_offset = ((size_t)(offY + y) * (size_t)TW + (size_t)offX) * 4;
        size_t src_offset = (size_t)y * (size_t)dstW * 4;
        size_t row_bytes = (size_t)dstW * 4;
        
        std::memcpy(canvas.data() + dst_offset, temp_scaled.data() + src_offset, row_bytes);
      }
    }
    
    return canvas;
  }
}

static std::vector<uint8_t> EncodeWebPStaticRGBA512(const uint8_t* rgba512, int quality){
  if (!rgba512) throw std::runtime_error("Null RGBA data");
  
  WebPConfig cfg; 
  if (!WebPConfigPreset(&cfg, WEBP_PRESET_PICTURE, (float)quality)) {
    throw std::runtime_error("WebPConfigPreset failed");
  }
  if (!WebPValidateConfig(&cfg)) {
    throw std::runtime_error("Invalid WebP config");
  }
  
  WebPPicture pic; 
  if (!WebPPictureInit(&pic)) {
    throw std::runtime_error("WebPPictureInit failed");
  }
  
  pic.use_argb = 1; 
  pic.width = 512; 
  pic.height = 512;
  
  if (!WebPPictureImportRGBA(&pic, rgba512, 512 * 4)) {
    WebPPictureFree(&pic);
    throw std::runtime_error("WebPPictureImportRGBA failed");
  }

  WebPMemoryWriter mw; 
  WebPMemoryWriterInit(&mw);
  pic.writer = WebPMemoryWrite; 
  pic.custom_ptr = &mw;
  
  int ok = WebPEncode(&cfg, &pic);
  if (!ok) {
    WebPPictureFree(&pic);
    WebPMemoryWriterClear(&mw);
    throw std::runtime_error("WebPEncode failed");
  }
  
  std::vector<uint8_t> out(mw.mem, mw.mem + mw.size);
  
  WebPMemoryWriterClear(&mw);
  WebPPictureFree(&pic);
  
  return out;
}

static std::vector<uint8_t> EncodeWebPAnimRGBA512(const std::vector<RGBAFrame>& frames, 
                                                  int quality, int fps, bool crop, int cornerRadius){
  if (frames.empty()) throw std::runtime_error("No frames to encode");
  
  WebPAnimEncoderOptions aopt; 
  WebPAnimEncoderOptionsInit(&aopt);
  aopt.minimize_size = 1;
  
  WebPAnimEncoder* enc = WebPAnimEncoderNew(512, 512, &aopt);
  ensure_ptr(enc, "WebPAnimEncoderNew failed");

  WebPConfig cfg; 
  if (!WebPConfigPreset(&cfg, WEBP_PRESET_PICTURE, (float)quality)) {
    WebPAnimEncoderDelete(enc);
    throw std::runtime_error("WebPConfigPreset failed");
  }
  if (!WebPValidateConfig(&cfg)) {
    WebPAnimEncoderDelete(enc);
    throw std::runtime_error("Invalid WebP config");
  }

  int64_t t0 = frames.front().pts_ms;
  
  for (const auto& fr : frames) {
    std::vector<uint8_t> rgba512 = RGBAResize512(fr.data.data(), fr.w, fr.h, crop, cornerRadius);

    WebPPicture pic; 
    if (!WebPPictureInit(&pic)) {
      WebPAnimEncoderDelete(enc);
      throw std::runtime_error("WebPPictureInit failed");
    }
    
    pic.use_argb = 1; 
    pic.width = 512; 
    pic.height = 512;
    
    if (!WebPPictureImportRGBA(&pic, rgba512.data(), 512 * 4)) {
      WebPPictureFree(&pic);
      WebPAnimEncoderDelete(enc);
      throw std::runtime_error("WebPPictureImportRGBA failed");
    }

    int t_ms = (int)std::max<int64_t>(0, fr.pts_ms - t0);
    
    if (!WebPAnimEncoderAdd(enc, &pic, t_ms, &cfg)) {
      WebPPictureFree(&pic);
      WebPAnimEncoderDelete(enc);
      throw std::runtime_error("WebPAnimEncoderAdd failed");
    }
    
    WebPPictureFree(&pic);
  }
  
  int last_ts = (int)std::max<int64_t>(0, frames.back().pts_ms - t0 + (1000 / std::max(1, fps)));
  
  if (!WebPAnimEncoderAdd(enc, nullptr, last_ts, nullptr)) {
    WebPAnimEncoderDelete(enc);
    throw std::runtime_error("WebPAnimEncoderAdd flush failed");
  }

  WebPData out; 
  WebPDataInit(&out);
  
  if (!WebPAnimEncoderAssemble(enc, &out)) {
    WebPAnimEncoderDelete(enc);
    throw std::runtime_error("WebPAnimEncoderAssemble failed");
  }
  
  std::vector<uint8_t> webp(out.bytes, out.bytes + out.size);
  
  WebPDataClear(&out);
  WebPAnimEncoderDelete(enc);
  
  return webp;
}

static AvCodecCtxG OpenDecoder(AVStream* st){
  AvCodecCtxG DC;
  
  const AVCodec* codec = avcodec_find_decoder(st->codecpar->codec_id);
  ensure_ptr(codec, "decoder not found");
  
  DC.p = avcodec_alloc_context3(codec); 
  ensure_ptr(DC.p, "avcodec_alloc_context3 failed");
  
  int ret = avcodec_parameters_to_context(DC.p, st->codecpar);
  ensure(ret == 0, "parameters_to_context failed");
  
  ret = avcodec_open2(DC.p, codec, nullptr);
  ensure(ret == 0, "avcodec_open2 failed");
  
  ensure(DC.p->width > 0 && DC.p->height > 0, "invalid source dimensions");
  ensure(DC.p->width <= 8192 && DC.p->height <= 8192, "source dimensions too large");
  
  return DC;
}

static std::vector<RGBAFrame> DecodeAll(AVFormatContext* fmt, int si, AVCodecContext* dec,
                                        int maxDurationSec, int targetFps){
  if (!fmt || si < 0 || !dec) {
    throw std::runtime_error("Invalid decode parameters");
  }
  
  std::vector<RGBAFrame> out;
  out.reserve(std::min(maxDurationSec * targetFps, 1000));
  
  AvFrameGuard frame; 
  frame.p = av_frame_alloc(); 
  ensure_ptr(frame.p, "av_frame_alloc failed");
  
  SwsGuard sws;

  int64_t max_pts = std::numeric_limits<int64_t>::max();
  AVRational tb = fmt->streams[si]->time_base;
  
  if (tb.den > 0) {
    max_pts = av_rescale_q((int64_t)maxDurationSec * 1000, AVRational{1, 1000}, tb);
  }

  int64_t step_pts = 0, next_keep = 0;
  if (targetFps > 0 && tb.den > 0) {
    step_pts = av_rescale_q((int64_t)1000 / targetFps, AVRational{1, 1000}, tb);
  }

  AVPacket pkt;
  av_init_packet(&pkt);
  pkt.data = nullptr;
  pkt.size = 0;
  
  while (av_read_frame(fmt, &pkt) >= 0) {
    if (pkt.stream_index != si) { 
      av_packet_unref(&pkt); 
      continue; 
    }
    
    int ret = avcodec_send_packet(dec, &pkt);
    av_packet_unref(&pkt);
    
    if (ret < 0 && ret != AVERROR(EAGAIN)) {
      continue;
    }

    while (true) {
      int r = avcodec_receive_frame(dec, frame.p);
      if (r == AVERROR(EAGAIN) || r == AVERROR_EOF) break;
      if (r < 0) break;

      if (frame.p->width <= 0 || frame.p->height <= 0) {
        av_frame_unref(frame.p);
        continue;
      }
      
      if (frame.p->width > 8192 || frame.p->height > 8192) {
        av_frame_unref(frame.p);
        continue;
      }
      
      if (!sws.p) {
        sws.p = MakeSws(frame.p->width, frame.p->height, (AVPixelFormat)frame.p->format,
                        frame.p->width, frame.p->height);
        if (!sws.p) {
          av_frame_unref(frame.p);
          throw std::runtime_error("sws_getContext decode RGBA failed");
        }
      }

      if (max_pts != std::numeric_limits<int64_t>::max() && 
          frame.p->pts != AV_NOPTS_VALUE && 
          frame.p->pts > max_pts) {
        av_frame_unref(frame.p);
        return out;
      }

      if (step_pts > 0 && frame.p->pts != AV_NOPTS_VALUE) {
        if (frame.p->pts < next_keep) {
          av_frame_unref(frame.p);
          continue;
        }
        next_keep = frame.p->pts + step_pts;
      }

      int dstW = frame.p->width;
      int dstH = frame.p->height;
      
      if ((size_t)dstW > SIZE_MAX / 4 / dstH) {
        av_frame_unref(frame.p);
        continue;
      }
      
      size_t rgba_size = (size_t)dstW * (size_t)dstH * 4;
      size_t safe_size = rgba_size + 64;
      
      if (rgba_size == 0 || rgba_size > 256 * 1024 * 1024) {
        av_frame_unref(frame.p);
        continue;
      }
      
      std::vector<uint8_t> rgba;
      try {
        rgba.resize(safe_size);
      } catch (const std::bad_alloc&) {
        av_frame_unref(frame.p);
        continue;
      }
      
      uint8_t* dst_ptr = rgba.data();
      uint8_t* dstSlice[4] = { dst_ptr, nullptr, nullptr, nullptr };
      int dstStride[4] = { dstW * 4, 0, 0, 0 };
      
      int scale_ret = sws_scale(sws.p, frame.p->data, frame.p->linesize, 
                                0, frame.p->height, dstSlice, dstStride);
      if (scale_ret <= 0) {
        av_frame_unref(frame.p);
        continue;
      }

      rgba.resize(rgba_size);

      int64_t ms = 0;
      if (frame.p->pts != AV_NOPTS_VALUE) {
        ms = av_rescale_q(frame.p->pts, tb, AVRational{1, 1000});
      }
      
      out.push_back({ std::move(rgba), dstW, dstH, ms });
      av_frame_unref(frame.p);
      
      if (out.size() >= 1000) {
        return out;
      }
    }
  }
  
  avcodec_send_packet(dec, nullptr);
  
  while (avcodec_receive_frame(dec, frame.p) == 0) {
    if (frame.p->width <= 0 || frame.p->height <= 0) {
      av_frame_unref(frame.p);
      continue;
    }
    
    if (frame.p->width > 8192 || frame.p->height > 8192) {
      av_frame_unref(frame.p);
      continue;
    }
    
    if (!sws.p) {
      sws.p = MakeSws(frame.p->width, frame.p->height, (AVPixelFormat)frame.p->format,
                      frame.p->width, frame.p->height);
      if (!sws.p) {
        av_frame_unref(frame.p);
        continue;
      }
    }
    
    int dstW = frame.p->width;
    int dstH = frame.p->height;
    
    if ((size_t)dstW > SIZE_MAX / 4 / dstH) {
      av_frame_unref(frame.p);
      continue;
    }
    
    size_t rgba_size = (size_t)dstW * (size_t)dstH * 4;
    size_t safe_size = rgba_size + 64;
    
    if (rgba_size == 0 || rgba_size > 256 * 1024 * 1024) {
      av_frame_unref(frame.p);
      continue;
    }
    
    std::vector<uint8_t> rgba;
    try {
      rgba.resize(safe_size);
    } catch (const std::bad_alloc&) {
      av_frame_unref(frame.p);
      continue;
    }
    
    uint8_t* dst_ptr = rgba.data();
    uint8_t* dstSlice[4] = { dst_ptr, nullptr, nullptr, nullptr };
    int dstStride[4] = { dstW * 4, 0, 0, 0 };
    
    int scale_ret = sws_scale(sws.p, frame.p->data, frame.p->linesize, 
                              0, frame.p->height, dstSlice, dstStride);
    if (scale_ret <= 0) {
      av_frame_unref(frame.p);
      continue;
    }
    
    rgba.resize(rgba_size);
    
    int64_t ms = (frame.p->pts != AV_NOPTS_VALUE) ? 
                  av_rescale_q(frame.p->pts, tb, AVRational{1, 1000}) : 0;
    
    out.push_back({ std::move(rgba), dstW, dstH, ms });
    av_frame_unref(frame.p);
    
    if (out.size() >= 1000) break;
  }
  
  return out;
}

static std::vector<RGBAFrame> DecodeAnimatedWebP(const uint8_t* data, size_t len) {
  std::vector<RGBAFrame> frames;
  
  WebPData webp_data;
  webp_data.bytes = data;
  webp_data.size = len;
  
  WebPAnimDecoderOptions dec_options;
  WebPAnimDecoderOptionsInit(&dec_options);
  dec_options.color_mode = MODE_RGBA;
  
  WebPAnimDecoder* dec = WebPAnimDecoderNew(&webp_data, &dec_options);
  if (!dec) {
    throw std::runtime_error("Failed to create WebP animation decoder");
  }
  
  WebPAnimInfo anim_info;
  if (!WebPAnimDecoderGetInfo(dec, &anim_info)) {
    WebPAnimDecoderDelete(dec);
    throw std::runtime_error("Failed to get WebP animation info");
  }
  
  int width = anim_info.canvas_width;
  int height = anim_info.canvas_height;
  
  if (width <= 0 || height <= 0 || width > 8192 || height > 8192) {
    WebPAnimDecoderDelete(dec);
    throw std::runtime_error("Invalid WebP dimensions");
  }
  
  int timestamp = 0;
  while (WebPAnimDecoderHasMoreFrames(dec)) {
    uint8_t* buf;
    if (!WebPAnimDecoderGetNext(dec, &buf, &timestamp)) {
      break;
    }
    
    size_t frame_size = (size_t)width * (size_t)height * 4;
    std::vector<uint8_t> rgba_data(buf, buf + frame_size);
    
    frames.push_back({
      std::move(rgba_data),
      width,
      height,
      (int64_t)timestamp
    });
    
    if (frames.size() >= 1000) break;
  }
  
  WebPAnimDecoderDelete(dec);
  
  if (frames.empty()) {
    throw std::runtime_error("No frames decoded from animated WebP");
  }
  
  return frames;
}

Napi::Value AddExif(const Napi::CallbackInfo& info){
  Napi::Env env = info.Env();
  try {
    if (info.Length() < 2 || !info[0].IsBuffer() || !info[1].IsObject()) {
      Napi::TypeError::New(env, "addExif(webpBuffer, {packName, authorName, emojis?})").ThrowAsJavaScriptException();
      return env.Null();
    }
    
    auto webp = info[0].As<Napi::Buffer<uint8_t>>();
    Napi::Object meta = info[1].As<Napi::Object>();
    
    std::string pack = meta.Has("packName") ? meta.Get("packName").ToString().Utf8Value() : "";
    std::string author = meta.Has("authorName") ? meta.Get("authorName").ToString().Utf8Value() : "";
    std::vector<std::string> emojis;
    
    if (meta.Has("emojis") && meta.Get("emojis").IsArray()) {
      Napi::Array arr = meta.Get("emojis").As<Napi::Array>();
      for (uint32_t i = 0; i < arr.Length(); ++i) {
        if (arr.Get(i).IsString()) {
          emojis.emplace_back(arr.Get(i).ToString().Utf8Value());
        }
      }
    }

    std::vector<uint8_t> in(webp.Data(), webp.Data() + webp.Length());
    auto ex = BuildWhatsAppExif(pack, author, emojis);
    auto out = AttachExifToWebP(in, ex);
    
    return Napi::Buffer<uint8_t>::Copy(env, out.data(), out.size());
  } catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

Napi::Value MakeSticker(const Napi::CallbackInfo& info){
  Napi::Env env = info.Env();
  try {
    if (info.Length() < 1 || !info[0].IsBuffer()) {
      Napi::TypeError::New(env, "sticker(inputBuffer, options?)").ThrowAsJavaScriptException();
      return env.Null();
    }

    av_log_set_level(AV_LOG_QUIET);
    
    auto input = info[0].As<Napi::Buffer<uint8_t>>();
    
    Napi::Object opt = (info.Length() >= 2 && info[1].IsObject()) ? 
                        info[1].As<Napi::Object>() : Napi::Object::New(env);

    bool crop = true;
    if (opt.Has("crop")) {
      auto cropVal = opt.Get("crop");
      if (cropVal.IsBoolean()) {
        crop = cropVal.ToBoolean();
      } else if (cropVal.IsString()) {
        std::string cropStr = cropVal.ToString().Utf8Value();
        crop = (cropStr == "true" || cropStr == "1");
      } else if (cropVal.IsNumber()) {
        crop = cropVal.ToNumber().Int32Value() != 0;
      }
    }
    
    int quality = opt.Has("quality") ? (int)opt.Get("quality").ToNumber().Int32Value() : 80;
    int fps = opt.Has("fps") ? (int)opt.Get("fps").ToNumber().Int32Value() : 15;
    int maxDur = opt.Has("maxDuration") ? (int)opt.Get("maxDuration").ToNumber().Int32Value() : 15;
    int cornerRadius = opt.Has("cornerRadius") ? (int)opt.Get("cornerRadius").ToNumber().Int32Value() : 40;
    
    quality = std::max(1, std::min(100, quality));
    fps = std::max(1, std::min(60, fps));
    maxDur = std::max(1, std::min(60, maxDur));
    cornerRadius = std::max(0, std::min(256, cornerRadius));
    
    std::string pack = opt.Has("packName") ? opt.Get("packName").ToString().Utf8Value() : "";
    std::string author = opt.Has("authorName") ? opt.Get("authorName").ToString().Utf8Value() : "";
    std::vector<std::string> emojis;
    
    if (opt.Has("emojis") && opt.Get("emojis").IsArray()) {
      Napi::Array arr = opt.Get("emojis").As<Napi::Array>();
      for (uint32_t i = 0; i < arr.Length(); ++i) {
        if (arr.Get(i).IsString()) {
          emojis.emplace_back(arr.Get(i).ToString().Utf8Value());
        }
      }
    }

    const uint8_t* data = input.Data();
    size_t len = input.Length();

    if (IsWebP(data, len)) {
      std::vector<uint8_t> in(data, data + len);
      auto ex = BuildWhatsAppExif(pack, author, emojis);
      auto out = AttachExifToWebP(in, ex);
      return Napi::Buffer<uint8_t>::Copy(env, out.data(), out.size());
    }

    OpenResult R = OpenFromBuffer(data, len);
    auto DC = OpenDecoder(R.st);
    auto frames = DecodeAll(R.fmt.p, R.stream_index, DC.p, maxDur, fps);
    
    FreeBufferCtx(R);
    
    ensure(!frames.empty(), "No frame decoded (unsupported codec / corrupt input)");

    std::vector<uint8_t> webp;
    if (frames.size() == 1) {
      size_t expected = (size_t)frames[0].w * frames[0].h * 4;
      if (frames[0].data.size() != expected) {
        throw std::runtime_error("Corrupted frame data");
      }
      
      int frame_w = frames[0].w;
      int frame_h = frames[0].h;
      const uint8_t* frame_data_ptr = frames[0].data.data();
      
      std::vector<uint8_t> clean_buffer;
      try {
        clean_buffer.resize(expected);
        std::memcpy(clean_buffer.data(), frame_data_ptr, expected);
      } catch (const std::bad_alloc&) {
        throw std::runtime_error("Failed to reallocate frame buffer");
      }
      
      frames.clear();
      frames.shrink_to_fit();
      
      auto rgba512 = RGBAResize512(clean_buffer.data(), frame_w, frame_h, crop, cornerRadius);
      webp = EncodeWebPStaticRGBA512(rgba512.data(), quality);
      
    } else {
      webp = EncodeWebPAnimRGBA512(frames, quality, fps, crop, cornerRadius);
    }

    auto exif = BuildWhatsAppExif(pack, author, emojis);
    auto out = AttachExifToWebP(webp, exif);
    
    return Napi::Buffer<uint8_t>::Copy(env, out.data(), out.size());
  } catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

Napi::Value IsAnimatedSticker(const Napi::CallbackInfo& info){
  Napi::Env env = info.Env();
  try {
    if (info.Length() < 1 || !info[0].IsBuffer()) {
      Napi::TypeError::New(env, "isAnimated(stickerBuffer)").ThrowAsJavaScriptException();
      return env.Null();
    }
    
    av_log_set_level(AV_LOG_QUIET);
    
    auto input = info[0].As<Napi::Buffer<uint8_t>>();
    const uint8_t* data = input.Data();
    size_t len = input.Length();
    
    if (!IsWebP(data, len)) {
      return Napi::Boolean::New(env, false);
    }
    
    WebPData webp_data;
    webp_data.bytes = data;
    webp_data.size = len;
    
    WebPDemuxer* demux = WebPDemux(&webp_data);
    if (!demux) {
      return Napi::Boolean::New(env, false);
    }
    
    int frame_count = WebPDemuxGetI(demux, WEBP_FF_FRAME_COUNT);
    bool is_anim = (frame_count > 1);
    
    WebPDemuxDelete(demux);
    
    return Napi::Boolean::New(env, is_anim);
  } catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

Napi::Value StickerToImage(const Napi::CallbackInfo& info){
  Napi::Env env = info.Env();
  try {
    if (info.Length() < 1 || !info[0].IsBuffer()) {
      Napi::TypeError::New(env, "toImage(stickerBuffer)").ThrowAsJavaScriptException();
      return env.Null();
    }
    
    av_log_set_level(AV_LOG_QUIET);
    
    auto input = info[0].As<Napi::Buffer<uint8_t>>();
    const uint8_t* data = input.Data();
    size_t len = input.Length();
    
    int width, height;
    uint8_t* rgba = WebPDecodeRGBA(data, len, &width, &height);
    if (!rgba) {
      throw std::runtime_error("Failed to decode WebP sticker");
    }
    
    size_t rgba_size = (size_t)width * height * 4;
    std::vector<uint8_t> out(rgba, rgba + rgba_size);
    WebPFree(rgba);
    
    WebPConfig cfg;
    WebPConfigInit(&cfg);
    cfg.lossless = 1;
    
    WebPPicture pic;
    WebPPictureInit(&pic);
    pic.use_argb = 1;
    pic.width = width;
    pic.height = height;
    
    if (!WebPPictureImportRGBA(&pic, out.data(), width * 4)) {
      WebPPictureFree(&pic);
      throw std::runtime_error("WebPPictureImportRGBA failed");
    }
    
    WebPMemoryWriter writer;
    WebPMemoryWriterInit(&writer);
    pic.writer = WebPMemoryWrite;
    pic.custom_ptr = &writer;
    
    if (!WebPEncode(&cfg, &pic)) {
      WebPPictureFree(&pic);
      WebPMemoryWriterClear(&writer);
      throw std::runtime_error("WebP encode failed");
    }
    
    std::vector<uint8_t> result(writer.mem, writer.mem + writer.size);
    
    WebPMemoryWriterClear(&writer);
    WebPPictureFree(&pic);
    
    return Napi::Buffer<uint8_t>::Copy(env, result.data(), result.size());
  } catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

Napi::Value StickerToVideo(const Napi::CallbackInfo& info){
  Napi::Env env = info.Env();
  try {
    if (info.Length() < 1 || !info[0].IsBuffer()) {
      Napi::TypeError::New(env, "toVideo(stickerBuffer, options?)").ThrowAsJavaScriptException();
      return env.Null();
    }
    
    av_log_set_level(AV_LOG_QUIET);
    
    auto input = info[0].As<Napi::Buffer<uint8_t>>();
    Napi::Object opt = (info.Length() >= 2 && info[1].IsObject()) ? 
                        info[1].As<Napi::Object>() : Napi::Object::New(env);
    
    const uint8_t* data = input.Data();
    size_t len = input.Length();
    
    std::vector<RGBAFrame> frames;
    
    if (IsWebP(data, len)) {
      try {
        frames = DecodeAnimatedWebP(data, len);
      } catch (const std::exception& e) {
        throw std::runtime_error(std::string("WebP decode failed: ") + e.what());
      }
    } else {
      OpenResult R = OpenFromBuffer(data, len);
      auto DC = OpenDecoder(R.st);
      frames = DecodeAll(R.fmt.p, R.stream_index, DC.p, 15, 0);
      FreeBufferCtx(R);
    }
    
    if (frames.empty()) {
      throw std::runtime_error("No frames decoded from input");
    }
    
    if (frames[0].w <= 0 || frames[0].h <= 0) {
      throw std::runtime_error("Invalid frame dimensions");
    }
    
    int fps = 15;
    if (opt.Has("fps")) {
      fps = opt.Get("fps").ToNumber().Int32Value();
      fps = std::max(1, std::min(60, fps));
    } else if (frames.size() > 1) {
      int64_t total_duration = frames.back().pts_ms - frames.front().pts_ms;
      if (total_duration > 0) {
        fps = (int)std::round((frames.size() - 1) * 1000.0 / total_duration);
        fps = std::max(1, std::min(30, fps));
      }
    }
    
    AVOutFmtGuard out_guard;
    ensure(avformat_alloc_output_context2(&out_guard.oc, nullptr, "mp4", nullptr) == 0, 
           "alloc output context failed");
    ensure(avio_open_dyn_buf(&out_guard.oc->pb) == 0, "avio_open_dyn_buf failed");
    
    const AVCodec* enc = avcodec_find_encoder(AV_CODEC_ID_H264);
    ensure_ptr(enc, "H264 encoder not found");
    
    AVStream* out_st = avformat_new_stream(out_guard.oc, enc);
    ensure_ptr(out_st, "new stream failed");
    
    AvCodecCtxG enc_ctx;
    enc_ctx.p = avcodec_alloc_context3(enc);
    ensure_ptr(enc_ctx.p, "alloc enc ctx failed");
    
    enc_ctx.p->codec_id = AV_CODEC_ID_H264;
    enc_ctx.p->codec_type = AVMEDIA_TYPE_VIDEO;
    enc_ctx.p->width = frames[0].w;
    enc_ctx.p->height = frames[0].h;
    enc_ctx.p->pix_fmt = AV_PIX_FMT_YUV420P;
    
    enc_ctx.p->time_base = {1, 1000};
    enc_ctx.p->framerate = {fps, 1};
    enc_ctx.p->gop_size = 10;
    enc_ctx.p->max_b_frames = 0;
    
    av_opt_set(enc_ctx.p->priv_data, "preset", "fast", 0);
    av_opt_set_int(enc_ctx.p->priv_data, "crf", 23, 0);
    
    if (out_guard.oc->oformat->flags & AVFMT_GLOBALHEADER) {
      enc_ctx.p->flags |= AV_CODEC_FLAG_GLOBAL_HEADER;
    }
    
    ensure(avcodec_open2(enc_ctx.p, enc, nullptr) == 0, "encoder open failed");
    ensure(avcodec_parameters_from_context(out_st->codecpar, enc_ctx.p) == 0, 
           "params from context failed");
    out_st->time_base = enc_ctx.p->time_base;
    
    ensure(avformat_write_header(out_guard.oc, nullptr) == 0, "write header failed");
    
    SwsGuard sws;
    sws.p = sws_getContext(frames[0].w, frames[0].h, AV_PIX_FMT_RGBA,
                          enc_ctx.p->width, enc_ctx.p->height, AV_PIX_FMT_YUV420P,
                          SWS_BILINEAR, nullptr, nullptr, nullptr);
    ensure_ptr(sws.p, "sws_getContext failed");
    
    AvFrameGuard yuv_frame;
    yuv_frame.p = av_frame_alloc();
    ensure_ptr(yuv_frame.p, "av_frame_alloc failed");
    yuv_frame.p->format = AV_PIX_FMT_YUV420P;
    yuv_frame.p->width = enc_ctx.p->width;
    yuv_frame.p->height = enc_ctx.p->height;
    ensure(av_frame_get_buffer(yuv_frame.p, 0) == 0, "av_frame_get_buffer failed");
    
    int64_t first_pts = frames[0].pts_ms;
    
    for (size_t i = 0; i < frames.size(); ++i) {
      const uint8_t* rgba_data = frames[i].data.data();
      const uint8_t* src_slice[4] = { rgba_data, nullptr, nullptr, nullptr };
      int src_stride[4] = { frames[i].w * 4, 0, 0, 0 };
      
      sws_scale(sws.p, src_slice, src_stride, 0, frames[i].h,
                yuv_frame.p->data, yuv_frame.p->linesize);
      
      yuv_frame.p->pts = frames[i].pts_ms - first_pts;
      
      ensure(avcodec_send_frame(enc_ctx.p, yuv_frame.p) == 0, "send_frame failed");
      
      AVPacket pkt;
      av_init_packet(&pkt);
      pkt.data = nullptr;
      pkt.size = 0;
      
      while (avcodec_receive_packet(enc_ctx.p, &pkt) == 0) {
        av_packet_rescale_ts(&pkt, enc_ctx.p->time_base, out_st->time_base);
        pkt.stream_index = out_st->index;
        av_interleaved_write_frame(out_guard.oc, &pkt);
        av_packet_unref(&pkt);
      }
    }

    avcodec_send_frame(enc_ctx.p, nullptr);
    AVPacket pkt;
    av_init_packet(&pkt);
    while (avcodec_receive_packet(enc_ctx.p, &pkt) == 0) {
      av_packet_rescale_ts(&pkt, enc_ctx.p->time_base, out_st->time_base);
      pkt.stream_index = out_st->index;
      av_interleaved_write_frame(out_guard.oc, &pkt);
      av_packet_unref(&pkt);
    }
    
    av_write_trailer(out_guard.oc);
    
    uint8_t* out_buf = nullptr;
    int out_size = avio_close_dyn_buf(out_guard.oc->pb, &out_buf);
    out_guard.oc->pb = nullptr;
    ensure(out_size > 0 && out_buf, "output buffer invalid");
    
    std::vector<uint8_t> result(out_buf, out_buf + out_size);
    av_free(out_buf);
    
    return Napi::Buffer<uint8_t>::Copy(env, result.data(), result.size());
  } catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

Napi::Object Init(Napi::Env env, Napi::Object exports){
  exports.Set("addExif", Napi::Function::New(env, AddExif));
  exports.Set("sticker", Napi::Function::New(env, MakeSticker));
  exports.Set("makeSticker", Napi::Function::New(env, MakeSticker));
  exports.Set("isAnimated", Napi::Function::New(env, IsAnimatedSticker));
  exports.Set("toImage", Napi::Function::New(env, StickerToImage));
  exports.Set("toVideo", Napi::Function::New(env, StickerToVideo));
  return exports;
}

NODE_API_MODULE(sticker, Init)