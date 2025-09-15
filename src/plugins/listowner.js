// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Command, User } from '../../database/index.js';

export const command = {
    name: 'listowner',
    category: 'master',
    description: 'Daftar list owner yang dimiliki oleh Bot',
    aliases: ['ownerlist'],
    execute: async ({ m, sReply }) => {
        const owners = await User.find({ isMaster: true });
        let list = `This is list of owner number\nTotal: ${owners.length}\n`;
        owners.forEach((owner, i) => {
            list += `\n${i + 1}. @${owner.userId.split('@')[0]}`;
        });
        await sReply(list);
        await Command.findOneAndUpdate({ name: command.name }, { $inc: { count: 1 } }, { upsert: true });
        await User.findOneAndUpdate({ userId: m.sender }, { $inc: { [`commandStats.${command.name}`]: 1 } }, { upsert: true });
    }
};