// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Command, User } from '../../database/index.js';
import { pluginCache } from '../utils/plugins.js';

export const command = {
    name: 'addalias',
    category: 'master',
    description: 'Menambahkan alias untuk perintah yang sudah ada.',
    aliases: ['addaliases', 'upcoms'],
    execute: async ({ sReply, args, m, dbSettings }) => {
        if (args.length !== 2) {
            throw new Error(`Gunakan format: ${dbSettings.rname}addalias <perintah_utama> <alias_baru>`);
        }
        const commandName = args[0].toLowerCase();
        const newAlias = args[1].toLowerCase();
        await Command.addAlias(commandName, newAlias);
        await sReply(`Berhasil menambahkan alias '${newAlias}' untuk perintah '${commandName}'.`);
        const commandData = pluginCache.commands.get(commandName);
        if (commandData) {
            commandData.aliases.push(newAlias);
            pluginCache.commands.set(newAlias, commandData);
        }
        await Command.findOneAndUpdate({ name: command.name }, { $inc: { count: 1 } }, { upsert: true });
        await User.findOneAndUpdate({ userId: m.sender }, { $inc: { [`commandStats.${command.name}`]: 1 } }, { upsert: true });
    }
};