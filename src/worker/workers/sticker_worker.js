// ─── Info ─────────────────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info src/worker/workers/sticker_worker.js ────────────────

import fs from 'fs-extra';
import config from '../../../config.js';
import ffmpeg from '@ts-ffmpeg/fluent-ffmpeg';
import { tmpDir } from '../../lib/tempManager.js';

async function runConversion(mediaBuffer, type) {
  const tmpFileIn = await tmpDir.createTempFileWithContent(mediaBuffer, '');
  const tmpFileOut = tmpDir.createTempFile('webp');
  const ffmpegCommand = ffmpeg(tmpFileIn);
  if (type === 'image') {
    ffmpegCommand.addOutputOptions([
      '-vcodec', 'libwebp', '-vf',
      'scale=512:512:force_original_aspect_ratio=decrease,setsar=1, pad=512:512:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse',
      '-loop', '0', '-preset', 'default'
    ]);
  } else if (type === 'video') {
    ffmpegCommand.addOutputOptions([
      '-vcodec', 'libwebp', '-vf',
      "scale='min(512,iw)':'min(512,ih)':force_original_aspect_ratio=decrease,fps=15, pad=512:512:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse",
      '-loop', '0',
      '-ss', '00:00:00',
      '-t', '00:00:10',
      '-preset', 'default',
      '-an', '-vsync', '0'
    ]);
  }
  await new Promise((resolve, reject) => {
    ffmpegCommand
      .setFfmpegPath(config.paths.ffmpeg)
      .on('error', reject)
      .on('end', () => resolve(true))
      .toFormat('webp')
      .save(tmpFileOut);
  });
  const resultBuffer = await fs.readFile(tmpFileOut);
  await Promise.all([tmpDir.deleteFile(tmpFileIn), tmpDir.deleteFile(tmpFileOut)]);
  return resultBuffer;
}

export default async function createSticker({ mediaBuffer, type }) {
  if (!mediaBuffer || !type) {
    throw new Error('mediaBuffer and type are required');
  }
  return await runConversion(mediaBuffer, type);
}