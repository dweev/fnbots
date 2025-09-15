// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { User, Command } from '../../database/index.js';

export const command = {
    name: 'groupclose',
    category: 'manage',
    description: 'Menutup grup, hanya admin yang bisa mengirim pesan.',
    aliases: ['close'],
    execute: async ({ fn, m, sReply, isBotGroupAdmins, reactDone }) => {
        if (!m.isGroup) throw new Error('Perintah ini hanya bisa digunakan di grup.');
        if (!isBotGroupAdmins) throw new Error('Bot harus menjadi admin grup untuk menjalankan perintah ini.');
        await fn.groupSettingUpdate(m.chat, 'announcement');
        await reactDone();
        await sReply('Grup berhasil ditutup, hanya admin yang dapat mengirim pesan.');
        await Command.findOneAndUpdate({ name: command.name }, { $inc: { count: 1 } }, { upsert: true });
        await User.findOneAndUpdate({ userId: m.sender }, { $inc: { [`commandStats.${command.name}`]: 1 } }, { upsert: true });
    }
}