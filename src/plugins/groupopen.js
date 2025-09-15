// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { User, Command } from '../../database/index.js';

export const command = {
    name: 'groupopen',
    category: 'manage',
    description: 'Membuka grup, semua anggota bisa mengirim pesan.',
    aliases: ['open'],
    execute: async ({ fn, m, sReply, isBotGroupAdmins, reactDone }) => {
        if (!m.isGroup) throw new Error('Perintah ini hanya bisa digunakan di grup.');
        if (!isBotGroupAdmins) throw new Error('Bot harus menjadi admin grup untuk menjalankan perintah ini.');
        await fn.groupSettingUpdate(m.chat, 'not_announcement');
        await reactDone();
        await sReply('Grup berhasil dibuka, semua anggota dapat mengirim pesan.');
        await Command.findOneAndUpdate({ name: command.name }, { $inc: { count: 1 } }, { upsert: true });
        await User.findOneAndUpdate({ userId: m.sender }, { $inc: { [`commandStats.${command.name}`]: 1 } }, { upsert: true });
    }
}