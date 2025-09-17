// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Command } from '../../../database/index.js';

export const command = {
  name: 'delalias',
  category: 'master',
  description: 'Menambahkan alias untuk perintah yang sudah ada.',
  aliases: ['delaliases', 'delcoms'],
  execute: async ({ sReply, args, dbSettings }) => {
    if (args.length !== 2) {
      throw new Error(`Gunakan format: ${dbSettings.rname}delalias <perintah_utama> <alias_yang_dihapus>`);
    }
    const commandName = args[0].toLowerCase();
    const aliasToRemove = args[1].toLowerCase();
    await Command.removeAlias(commandName, aliasToRemove);
    await sReply(`Berhasil menghapus alias '${aliasToRemove}' dari perintah '${commandName}'.`);
  }
};