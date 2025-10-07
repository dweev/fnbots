// ─── Info ────────────────────────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info src/worker/workers/sticker_native_worker.js ────────────────

import { sticker as stickerNative, addExif as addExifNative } from '../../addon/bridge.js';
import webp from 'node-webpmux';

function ensureBuffer(data) {
  if (Buffer.isBuffer(data)) return data;
  if (data && data.type === 'Buffer' && Array.isArray(data.data)) {
    return Buffer.from(data.data);
  }
  if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
    return Buffer.from(data);
  }
  throw new Error(`Invalid data type in worker. Expected Buffer, got ${typeof data}`);
}

export default async function createNativeSticker({ mediaBuffer, ...options }) {
  if (!mediaBuffer) {
    throw new Error('mediaBuffer is required in worker');
  }
  const finalBuffer = ensureBuffer(mediaBuffer);
  const isAlreadyWebP = (
    finalBuffer.length >= 12 &&
    finalBuffer.slice(0, 4).toString() === "RIFF" &&
    finalBuffer.slice(8, 12).toString() === "WEBP"
  );

  let result;
  if (isAlreadyWebP) {
    const img = new webp.Image();
    await img.load(finalBuffer);
    if (img.exif) {
      result = finalBuffer;
    } else {
      result = await addExifNative(finalBuffer, options);
    }
  } else {
    result = await stickerNative(finalBuffer, options);
  }
  if (!result || !Buffer.isBuffer(result)) {
    throw new Error(`Native function returned invalid data: ${typeof result}`);
  }
  if (result.length === 0) {
    throw new Error('Native function returned empty buffer');
  }

  return result;
}