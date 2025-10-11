// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Whitelist } from '../../../database/index.js';

export const command = {
  name: 'join',
  category: 'util',
  description: 'Menginstruksikan bot agar masuk ke dalam grup',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, dbSettings, arg, args, sReply, isMaster, isSadmin }) => {
    if (dbSettings.autojoin === true) return;
    if (!arg) {
      return await sReply(`Silakan berikan link undangan grup WhatsApp yang ingin Kamu masuki.\nContoh: ${dbSettings.sname}join https://chat.whatsapp.com/abc123xyz`);
    } else if (args[0].match(/^https:\/\/chat\.whatsapp\.com\//i)) {
      const inviteCode = args[0].split("https://chat.whatsapp.com/")[1];
      if (!inviteCode) return await sReply(`Silakan berikan link undangan grup WhatsApp yang valid.\nContoh: ${dbSettings.sname}join https://chat.whatsapp.com/abc123xyz`);
      const { restrict, joinApprovalMode, subject, participants, id } = await fn.groupGetInviteInfo(inviteCode);
      if (!(isSadmin || isMaster) && participants.length < dbSettings.memberLimit) return await sReply(`Grup terlalu kecil!\n\nMember: ${participants.length}\nMinimal: ${dbSettings.memberLimit}\nBot hanya bergabung ke grup dengan ${dbSettings.memberLimit}+ member.`);
      if (!joinApprovalMode) {
        await fn.groupAcceptInvite(inviteCode);
        if (!restrict) await fn.sendPesan(id, `Halo warga grup *${subject}*!\nTerima kasih sudah mengundang ${dbSettings.botname}. Ketik *.rules* untuk melihat peraturan.`, m);
        if (isSadmin || isMaster) {
          await Whitelist.addToWhitelist(id, 'group');
        }
        await sReply(`*BERHASIL BERGABUNG!*\n\nNama Grup: ${subject}\nMember: ${participants.length}\nID: ${id}`);
      }
    }
  }
};