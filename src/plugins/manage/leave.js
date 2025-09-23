// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Group } from '../../../database/index.js';

export const command = {
  name: 'leave',
  category: 'master',
  description: 'Mengaktifkan, menonaktifkan, atau mengubah pesan leave untuk grup.',
  aliases: ['groupleave'],
  execute: async ({ dbSettings, reactDone, ar, sReply, toId, m }) => {
    if (!m.isGroup) return await sReply(`Perintah ini hanya bisa digunakan di grup.`);
    const action = ar[0];
    const group = await Group.ensureGroup(toId);
    if (!group.leave || typeof group.leave !== 'object') {
      group.leave = { state: false, pesan: '' };
    }
    if (action === 'on') {
      group.leave.state = true;
      group.leave.pesan = group.leave.pesan || 'Selamat Tinggal';
      await group.save();
      await reactDone();
    } else if (action === 'off') {
      group.leave.state = false;
      await group.save();
      await reactDone();
    } else if (action === 'msg') {
      const pesan = ar.slice(1).join(' ').trim();
      if (!pesan) return await sReply(`Pesan tidak boleh kosong.`);
      group.leave.pesan = pesan;
      await group.save();
      await sReply(`Pesan leave diubah menjadi: ${pesan}`);
    } else {
      return await sReply(
        `Format salah. Gunakan:\n` +
        `${dbSettings.rname}leave on\n` +
        `${dbSettings.rname}leave off\n` +
        `${dbSettings.rname}leave msg teks_pesan`
      );
    }
  }
};