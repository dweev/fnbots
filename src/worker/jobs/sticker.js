// ─── Info ─────────────────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info src/worker/jobs/sticker.js ──────────────────────────

import createSticker from '../workers/sticker_worker.js';

export default async function stickerJob(data) {
  const { mediaBuffer, type } = data;
  if (!mediaBuffer || !type) throw new Error('Invalid sticker job data');
  return await createSticker({ mediaBuffer, type });
}
