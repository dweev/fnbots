// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Command, User } from '../../database/index.js';
import { waktu } from '../utils/function.js';

const timeStart = Date.now() / 1000;
export const command = {
    name: 'runtime',
    category: 'owner',
    description: 'Menampilkan waktu uptime bot.',
    aliases: ['uptime', 'rt'],
    execute: async ({ m, sReply, command }) => {
        let tms = (Date.now() / 1000) - (timeStart);
        let cts = waktu(tms);
        await sReply(cts);
        await Command.findOneAndUpdate({ name: command.name }, { $inc: { count: 1 } }, { upsert: true });
        await User.findOneAndUpdate({ userId: m.sender }, { $inc: { [`commandStats.${command.name}`]: 1 } }, { upsert: true });
    }
};