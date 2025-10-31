// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { Group } from '../../../database/index.js';

export const command = {
  name: 'antilink',
  category: 'manage',
  description: 'Mengaktifkan atau menonaktifkan mode antilink.',
  aliases: ['antilinkgroup'],
  isCommandWithoutPayment: true,
  execute: async ({ m, toId, dbSettings, ar, reactDone, sReply, isBotGroupAdmins }) => {
    if (!m.isGroup) return await sReply(`Perintah ini hanya bisa digunakan didalam group.`);
    if (!isBotGroupAdmins) return await sReply(`Perintah ini hanya bisa digunakan jika bot menjadi admin grup.`);
    const command = ar[0];
    if (!['on', 'off'].includes(command)) return await sReply(`Format salah. Gunakan:\n${dbSettings.rname}antilink on\n${dbSettings.rname}antilink off`);
    let group = await Group.findOne({ groupId: toId });
    if (!group) {
      group = new Group({ groupId: toId });
    }
    group.antilink = command === 'on';
    await group.save();
    await reactDone();
  }
};
