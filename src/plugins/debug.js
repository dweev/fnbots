// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Command, User } from '../../database/index.js';

export const command = {
    name: 'debug',
    category: 'master',
    description: 'Mengaktifkan atau menonaktifkan mode debug global.',
    aliases: ['dbg'],
    execute: async ({ m, dbSettings, reactDone, args }) => {
        const mode = (args[0] || '').toLowerCase();
        if (!['on', 'off'].includes(mode)) throw new Error(`gunakan perintah dengan benar, contoh: ${dbSettings.rname}debug on/off`);
        global.debugs = mode === 'on';
        await reactDone();
        await Command.findOneAndUpdate({ name: command.name }, { $inc: { count: 1 } }, { upsert: true });
        await User.findOneAndUpdate({ userId: m.sender }, { $inc: { [`commandStats.${command.name}`]: 1 } }, { upsert: true });
    }
};