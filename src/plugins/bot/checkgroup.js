// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import fs from 'fs-extra';
import { loadImage } from 'canvas';

const defaultAvatar = './src/media/apatar.png';
export const command = {
  name: 'checkgroup',
  category: 'bot',
  description: 'Memeriksa detail grup dari cache.',
  isCommandWithoutPayment: true,

  execute: async ({ fn, m, mygroup, mygroupMembers, dbSettings, sReply, toId, args }) => {
    if (args.length < 2) return await sReply(`Penggunaan:\n• ${dbSettings.rname}checkgroup <nomor_grup> member\n• ${dbSettings.rname}checkgroup <nomor_grup> admins\n• ${dbSettings.rname}checkgroup <nomor_grup> user <nomor_hp>\n• ${dbSettings.rname}checkgroup <nomor_grup> info <nomor_member>\n\nGunakan ${dbSettings.rname}listgroup untuk melihat daftar.`);
    const nomorGroup = parseInt(args[0], 10);
    const subcommand = args[1].toLowerCase();
    const subArgs = args.slice(2);
    if (isNaN(nomorGroup) || nomorGroup < 1 || nomorGroup > mygroup.length) return await sReply(`Nomor grup tidak valid! Range: 1 - ${mygroup.length}`);
    const idGroup = mygroup[nomorGroup - 1];
    const members = mygroupMembers[idGroup];
    if (!members || members.length === 0) return await sReply('Data member untuk grup ini belum ada di cache. Jalankan .listgroup terlebih dahulu.');
    switch (subcommand) {
      case 'member': {
        const mentions = members.map(m => m.id);
        const memberList = mentions.map((jid, index) => `${index + 1}. @${jid.split('@')[0]}`).join('\n');
        await sReply(`*DAFTAR MEMBER GROUP*\n\n${memberList}\n\nTotal: ${members.length} member`, { mentions });
        break;
      }
      case 'admins': {
        const admins = members.filter(m => m.admin);
        if (admins.length === 0) return await sReply('Tidak ada admin di grup ini.');
        const mentions = admins.map(a => a.id);
        const adminList = mentions.map((jid, index) => `${index + 1}. @${jid.split('@')[0]}`).join('\n');
        await sReply(`*DAFTAR ADMIN GROUP*\n\n${adminList}\n\nTotal: ${admins.length} admin`, { mentions });
        break;
      }
      case 'user': {
        if (subArgs.length < 1) return await sReply(`Format salah!\nContoh: ${dbSettings.rname}checkgroup 1 user 628123`);
        const targetNumber = subArgs[0].replace(/[^0-9]/g, '');
        const user = members.find(member => member.id.startsWith(targetNumber));
        if (user) {
          const name = await fn.getName(user.id);
          const userInfo = `*USER DITEMUKAN*\n\nNama: ${name}\nNomor: ${user.id.split('@')[0]}\nStatus: ${user.admin ? 'Admin' : 'Member'}`;
          await sReply(userInfo);
        } else {
          await sReply(`User dengan nomor *${targetNumber}* tidak ditemukan di grup ini.`);
        }
        break;
      }
      case 'info': {
        if (subArgs.length < 1) return await sReply(`Format salah!\nContoh: ${dbSettings.rname}checkgroup 1 info 1 3 5`);
        for (const memberIndexStr of subArgs) {
          const nomorMember = parseInt(memberIndexStr, 10);
          if (isNaN(nomorMember) || nomorMember < 1 || nomorMember > members.length) {
            await sReply(`Nomor member tidak valid: *${memberIndexStr}*`);
            continue;
          }
          const user = members[nomorMember - 1];
          const name = await fn.getName(user.id);
          let ppUrl;
          try {
            ppUrl = await fn.profilePictureUrl(user.id, 'image');
          } catch {
            ppUrl = await loadImage(await fs.readFile(defaultAvatar));
          }
          const caption = `*INFO MEMBER #${nomorMember}*\n\nNama: ${name || 'Tidak diketahui'}\nNomor: ${user.id.split('@')[0]}\nStatus: ${user.admin ? 'Admin' : 'Member'}\nID: ${user.id}`;
          await fn.sendFileUrl(toId, ppUrl, caption, m);
        }
        break;
      }
      default:
        await sReply('Subcommand tidak dikenal! Gunakan: member, admins, user, atau info.');
        break;
    }
  }
};