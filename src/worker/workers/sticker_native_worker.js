// ─── Info ────────────────────────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info src/worker/workers/sticker_native_worker.js ────────────────

import { sticker as stickerNative, addExif as addExifNative } from '../../addon/bridge.js';

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

function isWebP(buffer) {
  return (buffer.length >= 12 && buffer.slice(0, 4).toString() === "RIFF" && buffer.slice(8, 12).toString() === "WEBP");
}

function hasExifMetadata(buffer) {
  if (!isWebP(buffer)) return false;
  let offset = 12;
  while (offset < buffer.length - 8) {
    const chunkHeader = buffer.slice(offset, offset + 4).toString();
    const chunkSize = buffer.readUInt32LE(offset + 4);
    if (chunkHeader === 'EXIF') {
      return true;
    }
    offset += 8 + chunkSize + (chunkSize % 2);
  }
  return false;
}

export default async function createNativeSticker({ mediaBuffer, packName, authorName, crop, forceUpdateExif = false, ...otherOptions }) {
  if (!mediaBuffer) throw new Error('mediaBuffer is required in worker');
  const finalBuffer = ensureBuffer(mediaBuffer);
  const stickerOptions = {
    packName: packName || 'Sticker Pack',
    authorName: authorName || 'Author',
    crop: crop ?? false,
    ...otherOptions
  };
  const isAlreadyWebP = isWebP(finalBuffer);
  const hasExif = hasExifMetadata(finalBuffer);
  let result;
  if (isAlreadyWebP) {
    if (hasExif && !forceUpdateExif) {
      result = finalBuffer;
    } else {
      result = await addExifNative(finalBuffer, stickerOptions);
    }
  } else {
    result = await stickerNative(finalBuffer, stickerOptions);
  }
  if (!result || !Buffer.isBuffer(result)) throw new Error(`Native function returned invalid data: ${typeof result}`);
  if (result.length === 0) throw new Error('Native function returned empty buffer');
  return result;
}