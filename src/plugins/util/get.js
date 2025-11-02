// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import path from 'path';
import fs from 'fs-extra';
import { fileTypeFromBuffer } from 'file-type';
import { tmpDir } from '../../lib/tempManager.js';
import { fetchMedia } from '../../function/index.js';
import { convert as convertNative } from '../../addon/bridge.js';

export const command = {
  name: 'get',
  category: 'util',
  description: 'Menjalankan native fetch untuk mengambil data atau media.',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, sReply, toId, dbSettings, arg, sendRawWebpAsSticker }) => {
    const argsArray = arg.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
    if (argsArray.length === 0) return await sReply('Argumen tidak boleh kosong.');
    const result = await fetchMedia({ argsArray });
    switch (result.type) {
      case 'text':
        await sReply(result.content);
        break;
      case 'url':
        await fn.sendFileUrl2(toId, result.content, dbSettings.autocommand, m);
        break;
      case 'local_file': {
        let inputBuffer;
        try {
          inputBuffer = await fs.readFile(result.path);
        } catch (readError) {
          await sReply(`Error membaca file: ${readError.message}`);
          return;
        }
        try {
          const ext = path.extname(result.path).toLowerCase();
          if (ext === '.gif' || ext === '.webp') {
            await sendRawWebpAsSticker(inputBuffer, {
              packName: dbSettings.packName,
              authorName: dbSettings.packAuthor
            });
            return;
          }
          if (ext === '.webm') {
            try {
              const outputBuffer = convertNative(inputBuffer, { format: 'mpeg', ptt: false });
              await fn.sendMediaFromBuffer(toId, 'audio/mpeg', outputBuffer, dbSettings.autocommand, m);
              return;
            } catch {
              await fn.sendMediaFromBuffer(toId, 'video/webm', inputBuffer, dbSettings.autocommand, m);
              return;
            }
          }
          const fileType = await fileTypeFromBuffer(inputBuffer);
          const mimeType = fileType?.mime || 'application/octet-stream';
          await fn.sendMediaFromBuffer(toId, mimeType, inputBuffer, dbSettings.autocommand, m);
        } finally {
          await tmpDir.deleteFile(result.path);
        }
        break;
      }
      default:
        await sReply('Tipe hasil tidak dikenali dari worker.');
    }
  }
};
