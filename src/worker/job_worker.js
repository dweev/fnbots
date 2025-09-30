// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import stickerJob from './jobs/sticker.js';
import groupImageJob from './jobs/group_image.js';
import audioChangerJob from './jobs/audio_changer.js';
import mediaProcessorJob from './jobs/media_processor.js';

const jobMap = {
  sticker: stickerJob,
  audioChanger: audioChangerJob,
  groupImage: groupImageJob,
  mediaProcessor: mediaProcessorJob
};

export default async function(job) {
  const { type, data } = job;
  const handler = jobMap[type];
  if (!handler) {
    throw new Error(`Unknown job type "${type}"`);
  }
  const result = await handler(data);
  return result;
}