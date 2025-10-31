// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { archimed } from '../../function/index.js';

export const command = {
  name: 'unblock',
  category: 'vip',
  description: 'Membuka blokir user dari bot',
  isCommandWithoutPayment: true,
  execute: async ({ fn, arg, dbSettings, quotedMsg, mentionedJidList, quotedParticipant, sReply }) => {
    const blockNumber = await fn.fetchBlocklist();
    const targets = [];
    if (quotedMsg) {
      targets.push(quotedParticipant);
    } else if (mentionedJidList.length > 0) {
      targets.push(...mentionedJidList);
    } else if (arg && /^\d/.test(arg)) {
      const selected = archimed(arg, blockNumber);
      if (selected.length === 0) return await sReply(`Tidak ada nomor yang cocok dengan "${arg}".\n\nGunakan ${dbSettings.rname}unblock <nomor> untuk unblock nomor tertentu.`);
      targets.push(...selected);
    } else if (arg) {
      targets.push(arg.replace(/[^0-9]/g, '') + '@s.whatsapp.net');
    } else {
      return await sReply(`Tidak ada user yang ditargetkan untuk di-unblock!\n\nCara penggunaan:\n• Reply pesan user yang ingin di-unblock, atau\n• Mention user dengan @username\n• Atau gunakan nomor urut dari daftar blocklist\n\nContoh: ${dbSettings.rname}unblock @user atau .unblock 1`);
    }
    const unblocked = [];
    for (const jid of targets) {
      await fn.updateBlockStatus(jid, 'unblock');
      const index = blockNumber.indexOf(jid);
      if (index !== -1) blockNumber.splice(index, 1);
      unblocked.push(jid);
    }
    const response = `Berhasil unblock:\n` + unblocked.map((j, i) => `${i + 1}. @${j.split('@')[0]}`).join('\n');
    await sReply(response);
  }
};
