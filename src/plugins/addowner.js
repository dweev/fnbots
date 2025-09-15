// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Command, User } from '../../database/index.js';

export const command = {
    name: 'addowner',
    category: 'master',
    description: 'Menambahkan User menjadi owner dari Bot.',
    aliases: ['adown'],
    execute: async ({ m, dbSettings, reactDone, quotedMsg, arg, mentionedJidList, quotedParticipant }) => {
        if (!arg && !quotedMsg) throw new Error(`gunakan perintah dengan benar, contoh: ${dbSettings.rname}addowner @user atau reply pesan user`);
        if (mentionedJidList.length != 0) {
            for (let men of mentionedJidList) {
                const existingUser = await User.findOne({ userId: men });
                if (existingUser) {
                    existingUser.isMaster = true;
                    await existingUser.save();
                } else {
                    await User.create({ userId: men, isMaster: true });
                }
                await reactDone();
            }
        } else if (quotedMsg) {
            const existingUser = await User.findOne({ userId: quotedParticipant });
            if (existingUser) {
                existingUser.isMaster = true;
                await existingUser.save();
            } else {
                await User.create({ userId: quotedParticipant, isMaster: true });
            }
            await reactDone();
        }
        await Command.findOneAndUpdate({ name: command.name }, { $inc: { count: 1 } }, { upsert: true });
        await User.findOneAndUpdate({ userId: m.sender }, { $inc: { [`commandStats.${command.name}`]: 1 } }, { upsert: true });
    }
};