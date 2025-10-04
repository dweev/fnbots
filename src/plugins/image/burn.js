// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import fs from 'fs-extra';
import { saveFile, burn } from '../../function/index.js';

export const command = {
  name: 'burn',
  category: 'image',
  description: 'Add burn effect to an image',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, toId, dbSettings, arg, sReply }) => {
    if (!arg) return await sReply(`Mohon berikan teks yang ingin di burn.`);
    const resBuffer = await burn(arg);
    const tempFilePath = await saveFile(resBuffer, "burn-in", 'jpg');
    await fn.sendFilePath(toId, dbSettings.autocommand, tempFilePath, { quoted: m });
    await fs.unlink(tempFilePath);
  }
};