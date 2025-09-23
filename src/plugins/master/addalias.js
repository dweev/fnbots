// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { pluginCache } from '../../lib/plugins.js';
import { Command } from '../../../database/index.js';

export const command = {
  name: 'addalias',
  category: 'master',
  description: 'Menambahkan alias untuk perintah yang sudah ada.',
  aliases: ['addaliases', 'upcoms'],
  execute: async ({ sReply, args, dbSettings }) => {
    if (args.length !== 2) return await sReply(`Gunakan format: ${dbSettings.rname}addalias <perintah_utama> <alias_baru>`);
    const commandName = args[0].toLowerCase();
    const newAlias = args[1].toLowerCase();
    await Command.addAlias(commandName, newAlias);
    await sReply(`Berhasil menambahkan alias '${newAlias}' untuk perintah '${commandName}'.`);
    const commandData = pluginCache.commands.get(commandName);
    if (commandData) {
      commandData.aliases.push(newAlias);
      pluginCache.commands.set(newAlias, commandData);
    }
  }
};