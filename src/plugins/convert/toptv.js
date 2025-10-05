// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { tmpDir } from '../../lib/tempManager.js';

export const command = {
  name: 'toptv',
  category: 'convert',
  description: 'Mengconvert video ke ptv',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, quotedMsg, toId, sReply, dbSettings }) => {
    const targetMsg = quotedMsg ? m.quoted || m : m.message;
    const mimeType = targetMsg?.videoMessage?.mimetype;
    if (!mimeType) return await sReply('Balas sebuah video, atau kirim video dengan caption perintah ini.');
    const mediaData = await fn.getMediaBuffer(targetMsg);
    const tmpPath = await tmpDir.createTempFileWithContent(mediaData, 'mp4');
    await fn.sendFilePath(toId, dbSettings.autocommand, tmpPath, { quoted: m, ptv: true });
    await tmpDir.deleteFile(tmpPath);
  }
};