// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Command, User } from '../../database/index.js';
export const command = {
    name: 'ping',
    category: 'util',
    description: 'Memeriksa waktu respons bot.',
    aliases: ['p', 'speed'],
    execute: async ({ sReply, m }) => {
        const current = new Date().getTime();
        const est = Math.floor(current - (m.timestamp * 1000));
        await sReply(`Response time: ${est}ms`);
        await Command.findOneAndUpdate({ name: command.name }, { $inc: { count: 1 } }, { upsert: true });
        await User.findOneAndUpdate({ userId: m.sender }, { $inc: { [`commandStats.${command.name}`]: 1 } }, { upsert: true });
    }
};