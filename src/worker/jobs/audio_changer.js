// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import audioChanger from '../workers/audio_changer_worker.js';

export default async function audioChangerJob(data) {
  const { mediaBuffer } = data;
  if (!mediaBuffer) throw new Error('Invalid audio job data');
  return await audioChanger(mediaBuffer);
}
