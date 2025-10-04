// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import fs from 'fs-extra';
import { saveFile, makeCircleSticker } from '../../function/index.js';

export const command = {
  name: 'makecircle',
  category: 'image',
  description: 'create circle image',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, toId, dbSettings, quotedMsg, sReply }) => {
    const targetMsg = quotedMsg ? m.quoted || m : m.message;
    if (!targetMsg) return await sReply("Media tidak ditemukan.");
    const mime = targetMsg?.imageMessage?.mimetype;
    if (!mime) return await sReply("Kirim atau balas gambar untuk dijadikan lingkaran.");
    const resBuffer = await makeCircleSticker(await fn.getMediaBuffer(targetMsg));
    const patH = await saveFile(resBuffer, "makecircle", 'jpg');
    await fn.sendFilePath(toId, dbSettings.autocommand, patH, { quoted: m });
    await fs.unlink(patH);
  }
};