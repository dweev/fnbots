// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Group } from '../../../database/index.js';

export const command = {
  name: 'verifymember',
  category: 'master',
  description: 'Mengaktifkan, menonaktifkan mode verifikasi member untuk grup.',
  aliases: ['verifmember'],
  execute: async ({ dbSettings, reactDone, ar, sReply, toId, m }) => {
    if (!m.isGroup) return await sReply(`Perintah ini hanya bisa digunakan di grup.`);
    const command = ar[0];
    if (!command || !['on', 'off'].includes(command.toLowerCase())) return await sReply(`Format salah. Gunakan:\n${dbSettings.rname}verifymember on\n${dbSettings.rname}verifymember off`);
    const group = await Group.ensureGroup(toId);
    if (command.toLowerCase() === 'on') {
      group.verifyMember = true;
      await group.save();
      await sReply('Mode verifikasi member telah *diaktifkan* untuk grup ini.');
      await reactDone();
    } else if (command.toLowerCase() === 'off') {
      group.verifyMember = false;
      await group.save();
      await sReply('Mode verifikasi member telah *dinonaktifkan* untuk grup ini.');
      await reactDone();
    }
  }
};