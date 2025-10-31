// ─── Info ──────────────────────────────────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info src/worker/jobs/sticker_native.js ────────────────────────────

import createNativeSticker from '../workers/sticker_native_worker.js';

export default async function stickerNativeJob(data) {
  if (!data || !data.mediaBuffer) {
    throw new Error('Invalid sticker job data: mediaBuffer is missing');
  }
  return createNativeSticker(data);
}
