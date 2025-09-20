// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import path from 'path';
import fs from 'fs-extra';
import { deleteFile } from '../../lib/function.js'

export const command = {
  name: 'rvo',
  category: 'util',
  description: 'Memeriksa waktu respons bot.',
  aliases: ['readviewonce'],
  execute: async ({ fn, m, quotedMsg, dbSettings, toId,  }) => {
    if (quotedMsg) {
      const akuCrot = m.quoted[m.quoted.type] || m.quoted;
      if (akuCrot.viewOnce) {
        if (quotedMsg?.imageMessage || quotedMsg?.videoMessage || quotedMsg?.audioMessage) {
          let mediaType;
          let extension;
          if (quotedMsg.imageMessage) {
            mediaType = 'gambar';
            extension = '.png';
          } else if (quotedMsg.videoMessage) {
            mediaType = 'video';
            extension = '.mp4';
          } else if (quotedMsg.audioMessage) {
            mediaType = 'audio';
            extension = '.mp3';
          }
          const buffer = await fn.getMediaBuffer(quotedMsg);
          if (!buffer) throw new Error(`Gagal mengunduh ${mediaType}.`);
          const tempPath = path.join(global.tmpDir, `${global.randomSuffix}${extension}`);
          try {
            await fs.writeFile(tempPath, buffer);
            await fn.sendFilePath(toId, dbSettings.autocommand, tempPath, { quoted: m });
          } finally {
            await deleteFile(tempPath);
          }
        }
      }
    }
  }
};