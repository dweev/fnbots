// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { waktu } from '../../function/function.js';

export const command = {
  name: 'groupinfo',
  category: 'manage',
  description: 'Memberikan informasi group.',
  aliases: ['infogroup', 'ginfo'],
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, isBotGroupAdmins, toId, sReply }) => {
    if (!m.isGroup || !isBotGroupAdmins) return await sReply(`Perintah ini hanya bisa digunakan jika bot menjadi admin grup.`);
    const groupchat = await fn.groupMetadata(toId);
    const { subject, subjectOwner, subjectOwnerPhoneNumber, creation, desc } = groupchat;
    let creator;
    if (subjectOwnerPhoneNumber === undefined) {
      creator = subjectOwner;
    } else {
      creator = subjectOwnerPhoneNumber;
    }
    const memberCount = groupchat.participants.length;
    const subjectName = subject || 'Tidak diketahui';
    const createdTime = new Date(creation * 1000);
    const createdDate = createdTime.toLocaleString();
    const elapsed = Math.floor(Date.now() / 1000) - creation;
    let result = `📌 *Informasi Grup*\n`;
    result += `📝 Nama Grup: ${subjectName}\n`;
    result += `👑 Pembuat: @${creator.split('@')[0]}\n`;
    result += `👥 Jumlah Member: ${memberCount}\n`;
    if (desc) result += `📝 Deskripsi:\n${desc}\n`;
    result += `📅 Dibuat: ${createdDate} (${waktu(elapsed)} yang lalu)`;
    await fn.sendPesan(toId, result, m);
  }
};