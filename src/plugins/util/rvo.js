// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import fs from 'fs-extra';
import { tmpDir } from '../../lib/tempManager.js';

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
          let extension;
          if (quotedMsg.imageMessage) {
            extension = '.png';
          } else if (quotedMsg.videoMessage) {
            extension = '.mp4';
          } else if (quotedMsg.audioMessage) {
            extension = '.mp3';
          }
          const buffer = await fn.getMediaBuffer(quotedMsg);
          const tempPath = tmpDir.createTempFile(extension);
          try {
            await fs.writeFile(tempPath, buffer);
            await fn.sendFilePath(toId, dbSettings.autocommand, tempPath, { quoted: m });
          } finally {
            tmpDir.deleteFile(tempPath);
          }
        }
      }
    }
  }
};