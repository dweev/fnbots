// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { Group } from '../../../database/index.js';

export const command = {
  name: 'welcome',
  category: 'manage',
  description: 'Mengaktifkan, menonaktifkan, atau mengubah pesan welcome untuk grup.',
  aliases: ['groupwelcome'],
  isCommandWithoutPayment: true,
  execute: async ({ dbSettings, reactDone, ar, sReply, toId, m }) => {
    if (!m.isGroup) return await sReply(`Perintah ini hanya bisa digunakan di grup.`);
    const action = ar[0];
    const group = await Group.ensureGroup(toId);
    if (!group.welcome || typeof group.welcome !== 'object') {
      group.welcome = { state: false, pesan: '' };
    }
    if (action === 'on') {
      group.welcome.state = true;
      group.welcome.pesan = group.welcome.pesan || 'Selamat Datang';
      await group.save();
      await reactDone();
    } else if (action === 'off') {
      group.welcome.state = false;
      await group.save();
      await reactDone();
    } else if (action === 'msg') {
      const pesan = ar.slice(1).join(' ').trim();
      if (!pesan) return await sReply(`Pesan tidak boleh kosong.`);
      group.welcome.pesan = pesan;
      await group.save();
      await sReply(`Pesan welcome diubah menjadi: ${pesan}`);
    } else {
      // prettier-ignore
      return await sReply(
        `Format salah. Gunakan:\n` +
        `${dbSettings.rname}welcome on\n` +
        `${dbSettings.rname}welcome off\n` +
        `${dbSettings.rname}welcome msg teks_pesan`
      );
    }
  }
};
