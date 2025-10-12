#include <napi.h>
#include <string>
#include <vector>
#include <stdexcept>
#include <cstring>
#include <algorithm>

extern "C" {
#include <libavformat/avformat.h>
#include <libavcodec/avcodec.h>
#include <libavutil/avutil.h>
#include <libavutil/opt.h>
#include <libavutil/imgutils.h>
#include <libavutil/audio_fifo.h>
#include <libswscale/swscale.h>
#include <libswresample/swresample.h>
}

static inline void ensure(bool ok, const char* msg) {
  if (!ok) throw std::runtime_error(msg);
}

static inline void* ensure_ptr(void* p, const char* msg) {
  if (!p) throw std::runtime_error(msg);
  return p;
}

struct AVFmtGuard {
  AVFormatContext* p = nullptr;
  ~AVFmtGuard() {
    if (p) avformat_close_input(&p);
  }
};

struct AVIOGuard {
  AVIOContext* p = nullptr;
  ~AVIOGuard() {
    if (p) {
      av_free(p->buffer);
      avio_context_free(&p);
    }
  }
};

struct AVCodecCtxG {
  AVCodecContext* p = nullptr;
  ~AVCodecCtxG() {
    if (p) avcodec_free_context(&p);
  }
};

struct AVFrameG {
  AVFrame* p = nullptr;
  ~AVFrameG() {
    if (p) av_frame_free(&p);
  }
};

struct AVPacketG {
  AVPacket* p = nullptr;
  ~AVPacketG() {
    if (p) av_packet_free(&p);
  }
};

struct SwrContextG {
  SwrContext* p = nullptr;
  ~SwrContextG() {
    if (p) swr_free(&p);
  }
};

struct SwsContextG {
  SwsContext* p = nullptr;
  ~SwsContextG() {
    if (p) sws_freeContext(p);
  }
};

struct AVOutFmtGuard {
  AVFormatContext* oc = nullptr;
  ~AVOutFmtGuard() {
    if (oc) {
      if (oc->pb) {
        uint8_t* tmp = nullptr;
        avio_close_dyn_buf(oc->pb, &tmp);
        oc->pb = nullptr;
        if (tmp) av_free(tmp);
      }
      avformat_free_context(oc);
      oc = nullptr;
    }
  }
};

struct BufferCtx {
  const uint8_t* data;
  size_t size;
  size_t pos;
};

static int readPacket(void* opaque, uint8_t* buf, int buf_size) {
  BufferCtx* c = (BufferCtx*)opaque;
  size_t rem = (c->pos < c->size) ? (c->size - c->pos) : 0;
  int tocpy = (int)std::min(rem, (size_t)buf_size);
  if (tocpy <= 0) return AVERROR_EOF;
  std::memcpy(buf, c->data + c->pos, tocpy);
  c->pos += tocpy;
  return tocpy;
}

static int64_t seekPacket(void* opaque, int64_t offset, int whence) {
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
  
  ~OpenInputResult() {
    if (ctx) {
      delete ctx;
      ctx = nullptr;
    }
  }
};

static OpenInputResult OpenFromBuffer(const uint8_t* data, size_t len) {
  OpenInputResult R;
  unsigned char* iobuf = (unsigned char*)ensure_ptr(av_malloc(65536), "av_malloc failed");
  R.ctx = new BufferCtx{data, len, 0};
  R.io.p = (AVIOContext*)ensure_ptr(
    avio_alloc_context(iobuf, 65536, 0, R.ctx, &readPacket, nullptr, &seekPacket),
    "avio_alloc_context failed"
  );
  
  R.fmt.p = (AVFormatContext*)ensure_ptr(avformat_alloc_context(), "avformat_alloc_context failed");
  R.fmt.p->pb = R.io.p;
  R.fmt.p->flags |= AVFMT_FLAG_CUSTOM_IO;

  av_log_set_level(AV_LOG_QUIET);
  ensure(avformat_open_input(&R.fmt.p, "", nullptr, nullptr) == 0, "avformat_open_input failed");
  ensure(avformat_find_stream_info(R.fmt.p, nullptr) >= 0, "avformat_find_stream_info failed");
  
  return R;
}

static std::vector<uint8_t> mergeVideoAudio(
  const uint8_t* videoData, size_t videoLen,
  const uint8_t* audioData, size_t audioLen,
  const char* preset,
  int crf
) {
  auto videoInput = OpenFromBuffer(videoData, videoLen);
  int vidx = av_find_best_stream(videoInput.fmt.p, AVMEDIA_TYPE_VIDEO, -1, -1, nullptr, 0);
  ensure(vidx >= 0, "No video stream found");

  auto audioInput = OpenFromBuffer(audioData, audioLen);
  int aidx = av_find_best_stream(audioInput.fmt.p, AVMEDIA_TYPE_AUDIO, -1, -1, nullptr, 0);
  ensure(aidx >= 0, "No audio stream found");

  AVStream* video_st = videoInput.fmt.p->streams[vidx];
  AVStream* audio_st = audioInput.fmt.p->streams[aidx];

  const AVCodec* vdec = avcodec_find_decoder(video_st->codecpar->codec_id);
  ensure(vdec, "Video decoder not found");
  
  AVCodecCtxG vdec_ctx;
  vdec_ctx.p = avcodec_alloc_context3(vdec);
  ensure(vdec_ctx.p, "Video decoder context alloc failed");
  ensure(avcodec_parameters_to_context(vdec_ctx.p, video_st->codecpar) == 0, "Video params to context failed");
  vdec_ctx.p->thread_count = 0;
  ensure(avcodec_open2(vdec_ctx.p, vdec, nullptr) == 0, "Video decoder open failed");

  const AVCodec* adec = avcodec_find_decoder(audio_st->codecpar->codec_id);
  ensure(adec, "Audio decoder not found");
  
  AVCodecCtxG adec_ctx;
  adec_ctx.p = avcodec_alloc_context3(adec);
  ensure(adec_ctx.p, "Audio decoder context alloc failed");
  ensure(avcodec_parameters_to_context(adec_ctx.p, audio_st->codecpar) == 0, "Audio params to context failed");
  adec_ctx.p->thread_count = 0;
  ensure(avcodec_open2(adec_ctx.p, adec, nullptr) == 0, "Audio decoder open failed");

  AVOutFmtGuard out_guard;
  ensure(avformat_alloc_output_context2(&out_guard.oc, nullptr, "mp4", nullptr) == 0, "Output context alloc failed");
  ensure(avio_open_dyn_buf(&out_guard.oc->pb) == 0, "avio_open_dyn_buf failed");

  const AVCodec* venc = avcodec_find_encoder(AV_CODEC_ID_H264);
  ensure(venc, "H264 encoder not found");
  
  AVStream* out_vst = avformat_new_stream(out_guard.oc, nullptr);
  ensure(out_vst, "Output video stream alloc failed");
  out_vst->id = 0;
  
  AVCodecCtxG venc_ctx;
  venc_ctx.p = avcodec_alloc_context3(venc);
  ensure(venc_ctx.p, "Video encoder context alloc failed");
  
  venc_ctx.p->codec_id = AV_CODEC_ID_H264;
  venc_ctx.p->codec_type = AVMEDIA_TYPE_VIDEO;
  venc_ctx.p->width = vdec_ctx.p->width;
  venc_ctx.p->height = vdec_ctx.p->height;
  venc_ctx.p->pix_fmt = AV_PIX_FMT_YUV420P;
  venc_ctx.p->time_base = video_st->time_base;
  
  AVRational frame_rate = av_guess_frame_rate(videoInput.fmt.p, video_st, nullptr);
  if (frame_rate.num == 0 || frame_rate.den == 0) {
    frame_rate = {30, 1};
  } else {
    double fps = (double)frame_rate.num / frame_rate.den;
    if (fps > 55) frame_rate = {60, 1};
    else if (fps > 50) frame_rate = {60000, 1001};
    else if (fps > 45) frame_rate = {50, 1};
    else if (fps > 28) frame_rate = {30, 1};
    else if (fps > 27) frame_rate = {30000, 1001};
    else if (fps > 23) frame_rate = {25, 1};
    else if (fps > 20) frame_rate = {24000, 1001};
    else frame_rate = {24, 1};
  }
  
  venc_ctx.p->framerate = frame_rate;
  venc_ctx.p->time_base = {frame_rate.den, frame_rate.num};
  venc_ctx.p->gop_size = 60;
  venc_ctx.p->max_b_frames = 0;
  venc_ctx.p->thread_count = 0;
  
  av_opt_set(venc_ctx.p->priv_data, "profile", "baseline", 0);
  av_opt_set(venc_ctx.p->priv_data, "level", "3.1", 0);
  av_opt_set(venc_ctx.p->priv_data, "preset", preset, 0);
  av_opt_set_int(venc_ctx.p->priv_data, "crf", crf, 0);
  
  if (venc_ctx.p->bit_rate == 0) venc_ctx.p->bit_rate = 2000000;
  if (out_guard.oc->oformat->flags & AVFMT_GLOBALHEADER) {
    venc_ctx.p->flags |= AV_CODEC_FLAG_GLOBAL_HEADER;
  }
  
  ensure(avcodec_open2(venc_ctx.p, venc, nullptr) == 0, "Video encoder open failed");
  ensure(avcodec_parameters_from_context(out_vst->codecpar, venc_ctx.p) == 0, "Video params from context failed");
  out_vst->time_base = venc_ctx.p->time_base;

  const AVCodec* aenc = avcodec_find_encoder(AV_CODEC_ID_AAC);
  ensure(aenc, "AAC encoder not found");
  
  AVStream* out_ast = avformat_new_stream(out_guard.oc, nullptr);
  ensure(out_ast, "Output audio stream alloc failed");
  out_ast->id = 1;
  
  AVCodecCtxG aenc_ctx;
  aenc_ctx.p = avcodec_alloc_context3(aenc);
  ensure(aenc_ctx.p, "Audio encoder context alloc failed");
  
  aenc_ctx.p->codec_id = AV_CODEC_ID_AAC;
  aenc_ctx.p->codec_type = AVMEDIA_TYPE_AUDIO;
  aenc_ctx.p->sample_fmt = AV_SAMPLE_FMT_FLTP;
  aenc_ctx.p->sample_rate = adec_ctx.p->sample_rate > 0 ? adec_ctx.p->sample_rate : 44100;
  
  int ret_ch = av_channel_layout_copy(&aenc_ctx.p->ch_layout, &adec_ctx.p->ch_layout);
  if (ret_ch < 0) av_channel_layout_default(&aenc_ctx.p->ch_layout, 2);
  
  aenc_ctx.p->bit_rate = 128000;
  aenc_ctx.p->time_base = {1, aenc_ctx.p->sample_rate};
  aenc_ctx.p->thread_count = 0;
  aenc_ctx.p->strict_std_compliance = FF_COMPLIANCE_EXPERIMENTAL;
  
  if (out_guard.oc->oformat->flags & AVFMT_GLOBALHEADER) {
    aenc_ctx.p->flags |= AV_CODEC_FLAG_GLOBAL_HEADER;
  }
  
  ensure(avcodec_open2(aenc_ctx.p, aenc, nullptr) == 0, "Audio encoder open failed");
  ensure(avcodec_parameters_from_context(out_ast->codecpar, aenc_ctx.p) == 0, "Audio params from context failed");
  out_ast->time_base = aenc_ctx.p->time_base;

  SwrContextG swr_ctx;
  bool need_resample = (adec_ctx.p->sample_fmt != aenc_ctx.p->sample_fmt) ||
                       (adec_ctx.p->sample_rate != aenc_ctx.p->sample_rate) ||
                       (av_channel_layout_compare(&adec_ctx.p->ch_layout, &aenc_ctx.p->ch_layout) != 0);
  
  AVAudioFifo* audio_fifo = nullptr;
  
  if (need_resample) {
    swr_ctx.p = swr_alloc();
    ensure(swr_ctx.p, "swr_alloc failed");
    
    av_opt_set_chlayout(swr_ctx.p, "in_chlayout", &adec_ctx.p->ch_layout, 0);
    av_opt_set_chlayout(swr_ctx.p, "out_chlayout", &aenc_ctx.p->ch_layout, 0);
    av_opt_set_int(swr_ctx.p, "in_sample_rate", adec_ctx.p->sample_rate, 0);
    av_opt_set_int(swr_ctx.p, "out_sample_rate", aenc_ctx.p->sample_rate, 0);
    av_opt_set_sample_fmt(swr_ctx.p, "in_sample_fmt", adec_ctx.p->sample_fmt, 0);
    av_opt_set_sample_fmt(swr_ctx.p, "out_sample_fmt", aenc_ctx.p->sample_fmt, 0);
    ensure(swr_init(swr_ctx.p) >= 0, "swr_init failed");
  }
  
  audio_fifo = av_audio_fifo_alloc(aenc_ctx.p->sample_fmt, 
                                    aenc_ctx.p->ch_layout.nb_channels,
                                    aenc_ctx.p->frame_size > 0 ? aenc_ctx.p->frame_size * 4 : 4096);
  ensure(audio_fifo, "av_audio_fifo_alloc failed");

  SwsContextG sws_ctx;
  if (vdec_ctx.p->pix_fmt != AV_PIX_FMT_YUV420P) {
    sws_ctx.p = sws_getContext(vdec_ctx.p->width, vdec_ctx.p->height, vdec_ctx.p->pix_fmt,
      venc_ctx.p->width, venc_ctx.p->height, venc_ctx.p->pix_fmt,
      SWS_BILINEAR, nullptr, nullptr, nullptr);
    ensure(sws_ctx.p, "sws_getContext failed");
  }
  
  ensure(avformat_write_header(out_guard.oc, nullptr) == 0, "Write header failed");

  AVPacketG vpkt;
  vpkt.p = av_packet_alloc();
  AVPacketG apkt;
  apkt.p = av_packet_alloc();
  
  AVFrameG vframe;
  vframe.p = av_frame_alloc();
  AVFrameG vframe_yuv;
  if (sws_ctx.p) {
    vframe_yuv.p = av_frame_alloc();
    vframe_yuv.p->format = venc_ctx.p->pix_fmt;
    vframe_yuv.p->width = venc_ctx.p->width;
    vframe_yuv.p->height = venc_ctx.p->height;
    ensure(av_frame_get_buffer(vframe_yuv.p, 0) >= 0, "av_frame_get_buffer failed for video");
  }
  
  AVFrameG aframe;
  aframe.p = av_frame_alloc();
  
  AVFrameG aframe_converted;
  aframe_converted.p = av_frame_alloc();
  aframe_converted.p->format = aenc_ctx.p->sample_fmt;
  av_channel_layout_copy(&aframe_converted.p->ch_layout, &aenc_ctx.p->ch_layout);
  aframe_converted.p->sample_rate = aenc_ctx.p->sample_rate;
  aframe_converted.p->nb_samples = aenc_ctx.p->frame_size > 0 ? aenc_ctx.p->frame_size : 1024;
  ensure(av_frame_get_buffer(aframe_converted.p, 0) >= 0, "av_frame_get_buffer failed for audio");

  int64_t next_vpts = 0;
  int64_t next_apts = 0;
  bool video_eof = false;
  bool audio_eof = false;
  
  AVRational source_fps = av_guess_frame_rate(videoInput.fmt.p, video_st, nullptr);
  if (source_fps.num == 0 || source_fps.den == 0) source_fps = {25, 1};
  AVRational target_fps = venc_ctx.p->framerate;
  
  double fps_ratio = ((double)target_fps.num / target_fps.den) / ((double)source_fps.num / source_fps.den);
  int64_t frame_count = 0;
  int64_t output_frame_count = 0;

  auto encodeVideoFrame = [&](AVFrame* frame) {
    if (frame) {
      double expected_output = frame_count * fps_ratio;
      if (output_frame_count >= expected_output + 0.5) {
        frame_count++;
        return;
      }
      
      int duplicates = 1;
      while (output_frame_count < expected_output - 0.5) {
        duplicates++;
        output_frame_count++;
      }
      
      frame->pts = next_vpts;
      frame->pkt_dts = frame->pts;
      frame->time_base = venc_ctx.p->time_base;
      frame->pict_type = AV_PICTURE_TYPE_NONE;
      
      for (int i = 0; i < duplicates; i++) {
        int ret = avcodec_send_frame(venc_ctx.p, frame);
        if (ret < 0 && ret != AVERROR_EOF) {
          char errbuf[AV_ERROR_MAX_STRING_SIZE];
          av_strerror(ret, errbuf, sizeof(errbuf));
          throw std::runtime_error(std::string("Error sending video frame: ") + errbuf);
        }
        
        AVPacketG out_pkt;
        out_pkt.p = av_packet_alloc();
        while ((ret = avcodec_receive_packet(venc_ctx.p, out_pkt.p)) == 0) {
          av_packet_rescale_ts(out_pkt.p, venc_ctx.p->time_base, out_vst->time_base);
          out_pkt.p->stream_index = out_vst->index;
          ret = av_interleaved_write_frame(out_guard.oc, out_pkt.p);
          if (ret < 0) {
            char errbuf[AV_ERROR_MAX_STRING_SIZE];
            av_strerror(ret, errbuf, sizeof(errbuf));
            throw std::runtime_error(std::string("Error writing video packet: ") + errbuf);
          }
          av_packet_unref(out_pkt.p);
        }
        if (i < duplicates - 1) next_vpts++;
      }
      next_vpts++;
      frame_count++;
      output_frame_count++;
    } else {
      int ret = avcodec_send_frame(venc_ctx.p, nullptr);
      AVPacketG out_pkt;
      out_pkt.p = av_packet_alloc();
      while ((ret = avcodec_receive_packet(venc_ctx.p, out_pkt.p)) == 0) {
        av_packet_rescale_ts(out_pkt.p, venc_ctx.p->time_base, out_vst->time_base);
        out_pkt.p->stream_index = out_vst->index;
        av_interleaved_write_frame(out_guard.oc, out_pkt.p);
        av_packet_unref(out_pkt.p);
      }
    }
  };

  auto encodeAudioFromFifo = [&]() {
    int frame_size = aenc_ctx.p->frame_size > 0 ? aenc_ctx.p->frame_size : 1024;
    while (av_audio_fifo_size(audio_fifo) >= frame_size) {
      aframe_converted.p->nb_samples = frame_size;
      int ret = av_audio_fifo_read(audio_fifo, (void**)aframe_converted.p->data, frame_size);
      if (ret < frame_size) throw std::runtime_error("Could not read from FIFO");
      
      aframe_converted.p->pts = next_apts;
      next_apts += frame_size;
      
      ret = avcodec_send_frame(aenc_ctx.p, aframe_converted.p);
      AVPacketG out_pkt;
      out_pkt.p = av_packet_alloc();
      while ((ret = avcodec_receive_packet(aenc_ctx.p, out_pkt.p)) == 0) {
        av_packet_rescale_ts(out_pkt.p, aenc_ctx.p->time_base, out_ast->time_base);
        out_pkt.p->stream_index = out_ast->index;
        av_interleaved_write_frame(out_guard.oc, out_pkt.p);
        av_packet_unref(out_pkt.p);
      }
    }
  };

  while (!video_eof || !audio_eof) {
    bool process_video = !video_eof;
    if (!video_eof && !audio_eof) {
      int64_t vpts_us = av_rescale_q(next_vpts, venc_ctx.p->time_base, {1, AV_TIME_BASE});
      int64_t apts_us = av_rescale_q(next_apts, aenc_ctx.p->time_base, {1, AV_TIME_BASE});
      process_video = (vpts_us <= apts_us);
    }

    if (process_video) {
      int ret = av_read_frame(videoInput.fmt.p, vpkt.p);
      if (ret < 0) {
        video_eof = true;
        avcodec_send_packet(vdec_ctx.p, nullptr);
        while (avcodec_receive_frame(vdec_ctx.p, vframe.p) == 0) {
          AVFrame* frame_to_encode = vframe.p;
          if (sws_ctx.p) {
            sws_scale(sws_ctx.p, vframe.p->data, vframe.p->linesize, 0,
                     vdec_ctx.p->height, vframe_yuv.p->data, vframe_yuv.p->linesize);
            frame_to_encode = vframe_yuv.p;
          }
          encodeVideoFrame(frame_to_encode);
          av_frame_unref(vframe.p);
        }
        encodeVideoFrame(nullptr);
      } else if (vpkt.p->stream_index == vidx) {
        avcodec_send_packet(vdec_ctx.p, vpkt.p);
        while (avcodec_receive_frame(vdec_ctx.p, vframe.p) == 0) {
          AVFrame* frame_to_encode = vframe.p;
          if (sws_ctx.p) {
            sws_scale(sws_ctx.p, vframe.p->data, vframe.p->linesize, 0,
                     vdec_ctx.p->height, vframe_yuv.p->data, vframe_yuv.p->linesize);
            frame_to_encode = vframe_yuv.p;
          }
          encodeVideoFrame(frame_to_encode);
          av_frame_unref(vframe.p);
        }
      }
      av_packet_unref(vpkt.p);
    } else {
      int ret = av_read_frame(audioInput.fmt.p, apkt.p);
      if (ret < 0) {
        audio_eof = true;
        avcodec_send_packet(adec_ctx.p, nullptr);
        while (avcodec_receive_frame(adec_ctx.p, aframe.p) == 0) {
          if (need_resample) {
            AVFrameG temp_frame;
            temp_frame.p = av_frame_alloc();
            temp_frame.p->format = aenc_ctx.p->sample_fmt;
            av_channel_layout_copy(&temp_frame.p->ch_layout, &aenc_ctx.p->ch_layout);
            temp_frame.p->sample_rate = aenc_ctx.p->sample_rate;
            temp_frame.p->nb_samples = aenc_ctx.p->frame_size > 0 ? aenc_ctx.p->frame_size * 2 : 2048;
            av_frame_get_buffer(temp_frame.p, 0);
            
            int nb_samples = swr_convert(swr_ctx.p, temp_frame.p->data, temp_frame.p->nb_samples,
                                        (const uint8_t**)aframe.p->data, aframe.p->nb_samples);
            if (nb_samples > 0) av_audio_fifo_write(audio_fifo, (void**)temp_frame.p->data, nb_samples);
          } else {
            av_audio_fifo_write(audio_fifo, (void**)aframe.p->data, aframe.p->nb_samples);
          }
          av_frame_unref(aframe.p);
        }
        
        if (need_resample) {
          AVFrameG temp_frame;
          temp_frame.p = av_frame_alloc();
          temp_frame.p->format = aenc_ctx.p->sample_fmt;
          av_channel_layout_copy(&temp_frame.p->ch_layout, &aenc_ctx.p->ch_layout);
          temp_frame.p->sample_rate = aenc_ctx.p->sample_rate;
          temp_frame.p->nb_samples = aenc_ctx.p->frame_size > 0 ? aenc_ctx.p->frame_size * 2 : 2048;
          av_frame_get_buffer(temp_frame.p, 0);
          
          int nb_samples;
          while ((nb_samples = swr_convert(swr_ctx.p, temp_frame.p->data, 
                                          temp_frame.p->nb_samples, nullptr, 0)) > 0) {
            av_audio_fifo_write(audio_fifo, (void**)temp_frame.p->data, nb_samples);
          }
        }
        
        encodeAudioFromFifo();
        
        int remaining = av_audio_fifo_size(audio_fifo);
        if (remaining > 0) {
          aframe_converted.p->nb_samples = remaining;
          av_audio_fifo_read(audio_fifo, (void**)aframe_converted.p->data, remaining);
          aframe_converted.p->pts = next_apts;
          avcodec_send_frame(aenc_ctx.p, aframe_converted.p);
          
          AVPacketG out_pkt;
          out_pkt.p = av_packet_alloc();
          int ret;
          while ((ret = avcodec_receive_packet(aenc_ctx.p, out_pkt.p)) == 0) {
            av_packet_rescale_ts(out_pkt.p, aenc_ctx.p->time_base, out_ast->time_base);
            out_pkt.p->stream_index = out_ast->index;
            av_interleaved_write_frame(out_guard.oc, out_pkt.p);
            av_packet_unref(out_pkt.p);
          }
        }
        
        avcodec_send_frame(aenc_ctx.p, nullptr);
        AVPacketG out_pkt;
        out_pkt.p = av_packet_alloc();
        int ret;
        while ((ret = avcodec_receive_packet(aenc_ctx.p, out_pkt.p)) == 0) {
          av_packet_rescale_ts(out_pkt.p, aenc_ctx.p->time_base, out_ast->time_base);
          out_pkt.p->stream_index = out_ast->index;
          av_interleaved_write_frame(out_guard.oc, out_pkt.p);
          av_packet_unref(out_pkt.p);
        }
      } else if (apkt.p->stream_index == aidx) {
        avcodec_send_packet(adec_ctx.p, apkt.p);
        while (avcodec_receive_frame(adec_ctx.p, aframe.p) == 0) {
          if (need_resample) {
            AVFrameG temp_frame;
            temp_frame.p = av_frame_alloc();
            temp_frame.p->format = aenc_ctx.p->sample_fmt;
            av_channel_layout_copy(&temp_frame.p->ch_layout, &aenc_ctx.p->ch_layout);
            temp_frame.p->sample_rate = aenc_ctx.p->sample_rate;
            temp_frame.p->nb_samples = aenc_ctx.p->frame_size > 0 ? aenc_ctx.p->frame_size * 2 : 2048;
            av_frame_get_buffer(temp_frame.p, 0);
            
            int nb_samples = swr_convert(swr_ctx.p, temp_frame.p->data, temp_frame.p->nb_samples,
                                        (const uint8_t**)aframe.p->data, aframe.p->nb_samples);
            if (nb_samples > 0) {
              av_audio_fifo_write(audio_fifo, (void**)temp_frame.p->data, nb_samples);
              encodeAudioFromFifo();
            }
          } else {
            av_audio_fifo_write(audio_fifo, (void**)aframe.p->data, aframe.p->nb_samples);
            encodeAudioFromFifo();
          }
          av_frame_unref(aframe.p);
        }
      }
      av_packet_unref(apkt.p);
    }
  }

  int ret = av_write_trailer(out_guard.oc);
  if (ret < 0) {
    char errbuf[AV_ERROR_MAX_STRING_SIZE];
    av_strerror(ret, errbuf, sizeof(errbuf));
    throw std::runtime_error(std::string("Write trailer failed: ") + errbuf);
  }

  uint8_t* out_buf = nullptr;
  int out_size = avio_close_dyn_buf(out_guard.oc->pb, &out_buf);
  out_guard.oc->pb = nullptr;
  
  if (out_size <= 0 || !out_buf) {
    throw std::runtime_error("Output buffer is empty or invalid");
  }

  std::vector<uint8_t> result((size_t)out_size);
  std::memcpy(result.data(), out_buf, (size_t)out_size);
  av_free(out_buf);

  if (audio_fifo) {
    av_audio_fifo_free(audio_fifo);
  }

  return result;
}

Napi::Value MergeVideoAudio(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 2 || !info[0].IsBuffer() || !info[1].IsBuffer()) {
    Napi::TypeError::New(env, "mergeVideoAudio(videoBuffer, audioBuffer, options?)").ThrowAsJavaScriptException();
    return env.Null();
  }

  auto videoBuffer = info[0].As<Napi::Buffer<uint8_t>>();
  auto audioBuffer = info[1].As<Napi::Buffer<uint8_t>>();

  Napi::Object opt = (info.Length() >= 3 && info[2].IsObject())
    ? info[2].As<Napi::Object>()
    : Napi::Object::New(env);

  std::string preset = opt.Has("preset")
    ? opt.Get("preset").ToString().Utf8Value()
    : "fast";

  int crf = opt.Has("crf")
    ? opt.Get("crf").ToNumber().Int32Value()
    : 23;

  if (crf < 0) crf = 0;
  if (crf > 51) crf = 51;

  try {
    auto result = mergeVideoAudio(
      videoBuffer.Data(), videoBuffer.Length(),
      audioBuffer.Data(), audioBuffer.Length(),
      preset.c_str(),
      crf
    );
    return Napi::Buffer<uint8_t>::Copy(env, result.data(), result.size());
  } catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

// ─── Module Init ──────────────────────────────────────────────────────────
Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("mergeVideoAudio", Napi::Function::New(env, MergeVideoAudio));
  return exports;
}

NODE_API_MODULE(media, Init)