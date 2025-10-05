// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import path from 'path';
import fs from 'fs-extra';
import { Command } from '../../../database/index.js';

export const command = {
  name: 'getplugins',
  category: 'master',
  description: 'Mengambil file plugin berdasarkan nama perintah atau aliasnya.',
  aliases: ['getplugin', 'gp'],
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, sReply, args, toId }) => {
    if (!args[0]) return sReply('Gagal, harap berikan nama perintah/alias yang ingin diambil.\nContoh: `.getplugins play`');
    const identifier = args[0].toLowerCase();
    const commandDoc = await Command.findOne({
      $or: [{ name: identifier }, { aliases: identifier }]
    }).lean();
    if (!commandDoc) return sReply(`Perintah atau alias '${identifier}' tidak ditemukan di database.`);
    const filePath = path.join(
      process.cwd(),
      'src',
      'plugins',
      commandDoc.category,
      `${commandDoc.name}.js`
    );
    if (!await fs.pathExists(filePath)) return sReply(`File tidak ditemukan di path yang diharapkan: \`${filePath.replace(process.cwd(), '')}\`. Mungkin ada inkonsistensi data.`);
    const caption = `File Plugin: *${commandDoc.name}.js*\n`;
    await fn.sendFilePath(toId, caption, filePath, { quoted: m });
  }
};