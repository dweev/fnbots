// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import fs from 'fs-extra';
import { tmpDir } from '../../lib/tempManager.js';
import { runJob } from '../../worker/worker_manager.js';

export const command = {
  name: 'get',
  category: 'util',
  description: 'Menjalankan skrip eksternal untuk mengambil data atau media.',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, sReply, toId, dbSettings, arg }) => {
    const argsArray = arg.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
    if (argsArray.length === 0) return await sReply("Argumen tidak boleh kosong.");
    const result = await runJob('mediaProcessor', { argsArray });
    switch (result.type) {
      case 'text':
        await sReply(result.content);
        break;
      case 'url':
        await fn.sendFileUrl2(toId, result.content, dbSettings.autocommand, m);
        break;
      case 'sticker':
        await fn.sendRawWebpAsSticker(toId, result.content, m, { packname: dbSettings.packName, author: dbSettings.packAuthor });
        await tmpDir.deleteFile(result.content);
        break;
      case 'ptt':
        await fn.sendMessage(m.chat, { audio: { stream: fs.createReadStream(result.content) }, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: m });
        await tmpDir.deleteFile(result.content);
        await tmpDir.deleteFile(result.originalFile);
        break;
      case 'filepath':
        await fn.sendFilePath(toId, dbSettings.autocommand, result.content, { quoted: m });
        await tmpDir.deleteFile(result.content);
        break;
      case 'document':
        await fn.sendMessage(m.chat, { document: fs.createReadStream(result.content), mimetype: 'video/webm' }, { quoted: m });
        await tmpDir.deleteFile(result.content);
        break;
      default:
        await sReply("Tipe hasil tidak dikenali dari worker.");
    }
  }
};