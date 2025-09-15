// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Command, User } from '../../database/index.js';

export const command = {
    name: 'delowner',
    category: 'master',
    description: 'Menghapus User dari list owner Bot.',
    aliases: ['delown'],
    execute: async ({ m, dbSettings, reactDone, arg, args, mentionedJidList }) => {
        if (!args.length) throw new Error(`gunakan perintah dengan benar, contoh: ${dbSettings.rname}delowner @user1,@user2`);
        if (mentionedJidList.length > 0) {
            for (const userId of mentionedJidList) {
                const user = await User.findOne({ userId });
                if (user) {
                    user.isMaster = false;
                    await user.save();
                }
            }
            await reactDone();
        } else {
            const targets = arg.split(",").map(s => s.trim()).filter(Boolean);
            for (const target of targets) {
                if (target.includes('@')) {
                    const user = await User.findOne({ userId: target });
                    if (user) {
                        user.isMaster = false;
                        await user.save();
                    }
                }
            }
            await reactDone();
        }
        await Command.findOneAndUpdate({ name: command.name }, { $inc: { count: 1 } }, { upsert: true });
        await User.findOneAndUpdate({ userId: m.sender }, { $inc: { [`commandStats.${command.name}`]: 1 } }, { upsert: true });
    }
};