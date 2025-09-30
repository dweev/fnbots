// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import audioChanger from '../workers/audio_changer_worker.js';

export default async function audioChangerJob(data) {
  if (!data || !data.mediaBuffer) {
    throw new Error('Invalid audio job data: mediaBuffer is missing');
  }
  return await audioChanger(data);
}