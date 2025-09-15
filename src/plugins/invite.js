// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { User, Command } from '../../database/index.js';

export const command = {
    name: 'invite',
    category: 'manage',
    description: 'Mengundang pengguna ke grup.',
    aliases: ['inv', 'undang'],
    execute: async ({ fn, m, toId, sReply, isBotGroupAdmins, quotedMsg, mentionedJidList, args, dbSettings, serial }) => {
        if (!m.isGroup) throw new Error('Perintah ini hanya bisa digunakan di grup.');
        if (!isBotGroupAdmins) throw new Error("Saya harus menjadi admin di grup ini untuk bisa mengundang orang lain.");
        let targets = [];
        if (quotedMsg) {
            targets.push(m.quoted.sender);
        } else if (mentionedJidList.length > 0) {
            targets.push(...mentionedJidList);
        } else if (args[0]) {
            const sanitizedNumber = args[0].replace(/\D/g, '');
            if (!sanitizedNumber) throw new Error("Nomor yang Kamu masukkan tidak valid.");
            targets.push(sanitizedNumber + '@s.whatsapp.net');
        } else {
            throw new Error(`Cara penggunaan: Balas (reply) pesan target, tag @user, atau ketik nomornya.\nContoh: ${dbSettings.rname}invite 6281234567890`);
        }
        for (const target of targets) {
            const results = await fn.groupParticipantsUpdate(toId, [target], 'add');
            if (!results || results.length === 0) throw new Error("Gagal mendapatkan status penambahan dari WhatsApp");
            const result = results[0];
            const targetUserMention = `@${target.split('@')[0]}`;
            switch (result.status.toString()) {
                case '200':
                    await sReply(`Berhasil menambahkan ${targetUserMention} ke dalam grup!`);
                    break;
                case '409':
                    await sReply(`Info: ${targetUserMention} sudah menjadi anggota grup ini.`);
                    break;
                case '403': {
                    await sReply(`Info: ${targetUserMention} tidak dapat ditambahkan karena pengaturan privasi.\n\nUndangan akan dikirimkan secara pribadi.`);
                    const inviteData = result.content.content[0].attrs;
                    await fn.sendGroupInvite(toId, target, inviteData.code, inviteData.expiration, m.metadata.subject, `Admin: @${serial.split('@')[0]} mengundang Kamu untuk bergabung.`, null, { mentions: [serial] });
                    break;
                }
                case '408': {
                    await sReply(`Info: ${targetUserMention} baru saja keluar dari grup.\n\nKarena privasi, undangan akan dikirimkan secara pribadi.`);
                    const inviteCode = await fn.groupInviteCode(toId);
                    await fn.sendPesan(target, `Kamu diundang kembali ke grup, silahkan klik link berikut untuk bergabung: https://chat.whatsapp.com/${inviteCode}`, m);
                    break;
                }
                case '401':
                    throw new Error(`Gagal: ${targetUserMention} telah memblokir bot ini.`);
                case '500':
                    throw new Error("Gagal: Grup sudah penuh.");
                default:
                    throw new Error(`Gagal menambahkan user dengan status kode tidak dikenal: ${result.status}`);
            }
        }
        await Command.findOneAndUpdate({ name: command.name }, { $inc: { count: 1 } }, { upsert: true });
        await User.findOneAndUpdate({ userId: m.sender }, { $inc: { [`commandStats.${command.name}`]: 1 } }, { upsert: true });
    }
};