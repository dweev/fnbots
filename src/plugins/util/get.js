// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { runJob } from '../../worker/worker_manager.js';

export const command = {
  name: 'get',
  category: 'util',
  description: 'Menjalankan skrip eksternal untuk mengambil data atau media.',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, sReply, toId, dbSettings, arg, sendRawWebpAsSticker }) => {
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
        await sendRawWebpAsSticker(result.content, { packName: dbSettings.packName, authorName: dbSettings.packAuthor });
        break;
      case 'ptt':
        await fn.sendMediaFromBuffer(toId, 'audio/ogg; codecs=opus', result.content, dbSettings.autocommand, m);
        break;
      case 'media':
        await fn.sendMediaFromBuffer(toId, result.mime, result.content, dbSettings.autocommand, m);
        break;
      case 'document':
        await fn.sendMediaFromBuffer(toId, result.mime, result.content, dbSettings.autocommand, m);
        break;
      default:
        await sReply("Tipe hasil tidak dikenali dari worker.");
    }
  }
};