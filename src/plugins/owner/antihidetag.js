// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Group } from '../../../database/index.js';

export const command = {
  name: 'antihidetag',
  category: 'owner',
  description: 'Mengaktifkan atau menonaktifkan mode antihidetag.',
  aliases: ['antihidetagbot'],
  execute: async ({ m, toId, dbSettings, ar, reactDone }) => {
    if (!m.isGroup) throw new Error(`Perintah ini hanya bisa digunakan di grup.`);
    let command = ar[0];
    if (!['on', 'off'].includes(command)) throw new Error(`Format salah. Gunakan:\n${dbSettings.rname}antihidetag on\n${dbSettings.rname}antihidetag off`);
    let group = await Group.findOne({ groupId: toId });
    if (!group) {
      group = new Group({ groupId: toId });
    }
    group.antiHidetag = command === 'on';
    await group.save();
    await reactDone();
  }
};