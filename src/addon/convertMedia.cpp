/**
 * @file src/addon/convertMedia.cpp
 * Media conversion and image upscaling using FFmpeg libraries.
 * Supports image upscaling with configurable scale factor and quality settings.
 * Provides functions for image format conversion and video frame extraction.
 * Includes utilities for working with audio and video streams.
 * Offers a high-level API for common media processing tasks.
 */

#include <napi.h>
#include <string>
#include <vector>
#include <stdexcept>
#include <cstring>
#include <algorithm>
#include <cmath>

extern "C" {
#include <libavformat/avformat.h>
#include <libavcodec/avcodec.h>
#include <libavutil/avutil.h>
#include <libavutil/opt.h>
#include <libavutil/imgutils.h>
#include <libavfilter/avfilter.h>
#include <libavfilter/buffersrc.h>
#include <libavfilter/buffersink.h>
#include <libswscale/swscale.h>
}

static inline void ensure(bool ok, const char* msg){ if(!ok) throw std::runtime_error(msg); }
static inline void* ensure_ptr(void* p, const char* msg){ if(!p) throw std::runtime_error(msg); return p; }
static inline const void* ensure_cptr(const void* p, const char* msg){ if(!p) throw std::runtime_error(msg); return p; }

struct AVFmtGuard { AVFormatContext* p=nullptr; ~AVFmtGuard(){ if(p) avformat_close_input(&p);} };
struct AVIOGuard  { AVIOContext* p=nullptr; ~AVIOGuard(){ if(p){ av_free(p->buffer); avio_context_free(&p);} } };
struct AVCodecCtxG{ AVCodecContext* p=nullptr; ~AVCodecCtxG(){ if(p) avcodec_free_context(&p);} };
struct AVFrameG   { AVFrame* p=nullptr; ~AVFrameG(){ if(p) av_frame_free(&p);} };
struct SwsGuard   { SwsContext* p=nullptr; ~SwsGuard(){ if(p) sws_freeContext(p);} };
struct FilterGraphG { AVFilterGraph* p=nullptr; ~FilterGraphG(){ if(p) avfilter_graph_free(&p);} };

struct AVOutFmtGuard {
  AVFormatContext* oc=nullptr;
  ~AVOutFmtGuard(){
    if (oc) {
      if (oc->pb) {
        uint8_t* tmp=nullptr;
        int sz=avio_close_dyn_buf(oc->pb, &tmp);
        (void)sz;
        oc->pb=nullptr;
        if (tmp) av_free(tmp);
      }
      avformat_free_context(oc);
      oc=nullptr;
    }
  }
};

struct BufferCtx { const uint8_t* data; size_t size; size_t pos; };

static int readPacket(void* opaque, uint8_t* buf, int buf_size){
  BufferCtx* c = (BufferCtx*)opaque;
  size_t rem = (c->pos < c->size) ? (c->size - c->pos) : 0;
  int tocpy = (int)std::min(rem, (size_t)buf_size);
  if (tocpy <= 0) return AVERROR_EOF;
  std::memcpy(buf, c->data + c->pos, tocpy);
  c->pos += tocpy;
  return tocpy;
}

static int64_t seekPacket(void* opaque, int64_t offset, int whence){
  BufferCtx* c = (BufferCtx*)opaque;
  if (whence == AVSEEK_SIZE) return (int64_t)c->size;
  size_t newpos;
  switch (whence) {
    case SEEK_SET: newpos = (size_t)offset; break;
    case SEEK_CUR: newpos = c->pos + (size_t)offset; break;
    case SEEK_END: newpos = c->size + (size_t)offset; break;
    default: return -1;
  }
  if (newpos > c->size) return -1;
  c->pos = newpos;
  return (int64_t)c->pos;
}

struct OpenInputResult {
  AVFmtGuard fmt;
  AVIOGuard io;
  BufferCtx* ctx = nullptr;
};

static void freeBufferCtx(OpenInputResult& R){ if(R.ctx){ delete R.ctx; R.ctx=nullptr; } }

static OpenInputResult OpenFromBuffer(const uint8_t* data, size_t len){
  OpenInputResult R;
  unsigned char* iobuf = (unsigned char*)ensure_ptr(av_malloc(1<<16), "av_malloc failed");
  R.ctx = new BufferCtx{ data, len, 0 };
  R.io.p = (AVIOContext*)ensure_cptr(
    avio_alloc_context(iobuf, 1<<16, 0, R.ctx, &readPacket, nullptr, &seekPacket),
    "avio_alloc_context failed"
  );
  R.fmt.p = (AVFormatContext*)ensure_cptr(avformat_alloc_context(), "avformat_alloc_context failed");
  R.fmt.p->pb = R.io.p;
  R.fmt.p->flags |= AVFMT_FLAG_CUSTOM_IO;

  av_log_set_level(AV_LOG_QUIET);
  ensure(avformat_open_input(&R.fmt.p, "", nullptr, nullptr) == 0, "avformat_open_input failed");
  ensure(avformat_find_stream_info(R.fmt.p, nullptr) >= 0, "avformat_find_stream_info failed");
  return R;
}

static std::vector<uint8_t> upscaleImage(
  const uint8_t* input, size_t inLen,
  double scaleFactor,
  int quality
){
  auto Rin = OpenFromBuffer(input, inLen);
  int vidx = av_find_best_stream(Rin.fmt.p, AVMEDIA_TYPE_VIDEO, -1, -1, nullptr, 0);
  ensure(vidx >= 0, "No video/image stream found");

  AVStream* in_st = Rin.fmt.p->streams[vidx];
  const AVCodec* dec = avcodec_find_decoder(in_st->codecpar->codec_id);
  ensure_cptr(dec, "Decoder not found");

  AVCodecCtxG dec_ctx;
  dec_ctx.p = avcodec_alloc_context3(dec);
  ensure_cptr(dec_ctx.p, "alloc dec ctx failed");
  ensure(avcodec_parameters_to_context(dec_ctx.p, in_st->codecpar) == 0, "params->dec_ctx failed");
  ensure(avcodec_open2(dec_ctx.p, dec, nullptr) == 0, "open decoder failed");

  int src_w = dec_ctx.p->width;
  int src_h = dec_ctx.p->height;
  int dst_w = (int)(src_w * scaleFactor);
  int dst_h = (int)(src_h * scaleFactor);

  AVOutFmtGuard out_guard;
  ensure(avformat_alloc_output_context2(&out_guard.oc, nullptr, "mjpeg", nullptr) == 0 && out_guard.oc, "alloc outctx failed");
  ensure(avio_open_dyn_buf(&out_guard.oc->pb) == 0, "avio_open_dyn_buf failed");

  const AVCodec* enc = avcodec_find_encoder(AV_CODEC_ID_MJPEG);
  ensure_cptr(enc, "MJPEG encoder not found");

  AVStream* out_st = avformat_new_stream(out_guard.oc, enc);
  ensure_cptr(out_st, "new out stream failed");

  AVCodecCtxG enc_ctx;
  enc_ctx.p = avcodec_alloc_context3(enc);
  ensure_cptr(enc_ctx.p, "alloc enc ctx failed");

  enc_ctx.p->codec_id = AV_CODEC_ID_MJPEG;
  enc_ctx.p->codec_type = AVMEDIA_TYPE_VIDEO;
  enc_ctx.p->width = dst_w;
  enc_ctx.p->height = dst_h;
  enc_ctx.p->pix_fmt = AV_PIX_FMT_YUVJ420P;
  enc_ctx.p->time_base = AVRational{1, 25};
  enc_ctx.p->flags |= AV_CODEC_FLAG_QSCALE;
  enc_ctx.p->global_quality = quality * FF_QP2LAMBDA;

  ensure(avcodec_open2(enc_ctx.p, enc, nullptr) == 0, "open encoder failed");

  out_st->time_base = enc_ctx.p->time_base;
  ensure(avcodec_parameters_from_context(out_st->codecpar, enc_ctx.p) == 0, "enc params -> stream failed");
  ensure(avformat_write_header(out_guard.oc, nullptr) == 0, "write header failed");

  SwsGuard sws;
  sws.p = sws_getContext(
    src_w, src_h, dec_ctx.p->pix_fmt,
    dst_w, dst_h, AV_PIX_FMT_YUVJ420P,
    SWS_LANCZOS, nullptr, nullptr, nullptr
  );
  ensure_cptr(sws.p, "sws_getContext failed");

  AVPacket* ipkt = av_packet_alloc();
  ensure_cptr(ipkt, "ipkt alloc failed");
  AVFrameG in_fr;
  in_fr.p = av_frame_alloc();
  ensure_cptr(in_fr.p, "in frame alloc failed");
  AVFrameG out_fr;
  out_fr.p = av_frame_alloc();
  ensure_cptr(out_fr.p, "out frame alloc failed");

  out_fr.p->format = AV_PIX_FMT_YUVJ420P;
  out_fr.p->width = dst_w;
  out_fr.p->height = dst_h;
  ensure(av_frame_get_buffer(out_fr.p, 0) == 0, "out frame get_buffer failed");

  bool processed = false;

  while (av_read_frame(Rin.fmt.p, ipkt) >= 0) {
    if (ipkt->stream_index != vidx) {
      av_packet_unref(ipkt);
      continue;
    }

    ensure(avcodec_send_packet(dec_ctx.p, ipkt) == 0, "send_packet(dec) failed");
    av_packet_unref(ipkt);

    while (true) {
      int r = avcodec_receive_frame(dec_ctx.p, in_fr.p);
      if (r == AVERROR(EAGAIN) || r == AVERROR_EOF) break;
      ensure(r == 0, "receive_frame(dec) failed");

      sws_scale(
        sws.p,
        in_fr.p->data, in_fr.p->linesize, 0, src_h,
        out_fr.p->data, out_fr.p->linesize
      );

      out_fr.p->pts = 0;

      ensure(avcodec_send_frame(enc_ctx.p, out_fr.p) == 0, "send_frame failed");

      AVPacket* opkt = av_packet_alloc();
      ensure_cptr(opkt, "opkt alloc failed");

      while (true) {
        int er = avcodec_receive_packet(enc_ctx.p, opkt);
        if (er == AVERROR(EAGAIN) || er == AVERROR_EOF) break;
        ensure(er == 0, "receive_packet failed");

        av_packet_rescale_ts(opkt, enc_ctx.p->time_base, out_st->time_base);
        opkt->stream_index = out_st->index;
        ensure(av_interleaved_write_frame(out_guard.oc, opkt) == 0, "write_frame failed");
        av_packet_unref(opkt);
      }

      av_packet_free(&opkt);
      av_frame_unref(in_fr.p);
      processed = true;
      break;
    }

    if (processed) break;
  }

  avcodec_send_frame(enc_ctx.p, nullptr);
  AVPacket* opkt = av_packet_alloc();
  while (avcodec_receive_packet(enc_ctx.p, opkt) == 0) {
    av_packet_rescale_ts(opkt, enc_ctx.p->time_base, out_st->time_base);
    opkt->stream_index = out_st->index;
    av_interleaved_write_frame(out_guard.oc, opkt);
    av_packet_unref(opkt);
  }
  av_packet_free(&opkt);

  ensure(av_write_trailer(out_guard.oc) == 0, "av_write_trailer failed");

  uint8_t* out_buf = nullptr;
  int out_size = avio_close_dyn_buf(out_guard.oc->pb, &out_buf);
  out_guard.oc->pb = nullptr;
  ensure(out_size >= 0 && out_buf, "close_dyn_buf failed");

  std::vector<uint8_t> out((size_t)out_size);
  std::memcpy(out.data(), out_buf, (size_t)out_size);
  av_free(out_buf);

  freeBufferCtx(Rin);
  av_packet_free(&ipkt);

  return out;
}

Napi::Value Upscale(const Napi::CallbackInfo& info){
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsBuffer()) {
    Napi::TypeError::New(env, "upscale(inputBuffer, options?)").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  auto input = info[0].As<Napi::Buffer<uint8_t>>();
  Napi::Object opt = (info.Length() >= 2 && info[1].IsObject()) ? info[1].As<Napi::Object>() : Napi::Object::New(env);

  double scaleFactor = opt.Has("scale") ? opt.Get("scale").ToNumber().DoubleValue() : 2.0;
  int quality = opt.Has("quality") ? opt.Get("quality").ToNumber().Int32Value() : 1;

  if (scaleFactor > 9.0) scaleFactor = 9.0;
  if (scaleFactor < 1.0) scaleFactor = 1.0;
  if (quality < 1) quality = 1;
  if (quality > 31) quality = 31;

  try {
    auto out = upscaleImage(input.Data(), input.Length(), scaleFactor, quality);
    return Napi::Buffer<uint8_t>::Copy(env, out.data(), out.size());
  } catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

Napi::Object Init(Napi::Env env, Napi::Object exports){
  exports.Set("upscale", Napi::Function::New(env, Upscale));
  return exports;
}

NODE_API_MODULE(ffmpeg, Init)