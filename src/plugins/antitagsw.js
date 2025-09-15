// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { User, Command, Group } from '../../database/index.js';

export const command = {
    name: 'antitagsw',
    category: 'owner',
    description: 'Mengaktifkan atau menonaktifkan mode antitagsw.',
    aliases: ['antitagstory'],
    execute: async ({ m, toId, dbSettings, ar, reactDone }) => {
        if (!m.isGroup) throw new Error(`Perintah ini hanya bisa digunakan di grup.`);
        let command = ar[0];
        if (!['on', 'off'].includes(command)) throw new Error(`Format salah. Gunakan:\n${dbSettings.rname}antitagsw on\n${dbSettings.rname}antitagsw off`);
        let group = await Group.findOne({ groupId: toId });
        if (!group) {
            group = new Group({ groupId: toId });
        }
        group.antiTagStory = command === 'on';
        await group.save();
        await reactDone();
        await Command.findOneAndUpdate({ name: command.name }, { $inc: { count: 1 } }, { upsert: true });
        await User.findOneAndUpdate({ userId: m.sender }, { $inc: { [`commandStats.${command.name}`]: 1 } }, { upsert: true });
    }
};