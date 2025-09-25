// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Group } from '../../../database/index.js';

export const command = {
  name: 'antitagsw',
  category: 'manage',
  description: 'Mengaktifkan atau menonaktifkan mode antitagsw.',
  aliases: ['antitagstory'],
  isCommandWithoutPayment: true,
  execute: async ({ m, toId, dbSettings, ar, reactDone, sReply }) => {
    if (!m.isGroup) return await sReply(`Perintah ini hanya bisa digunakan di grup.`);
    let command = ar[0];
    if (!['on', 'off'].includes(command)) return await sReply(`Format salah. Gunakan:\n${dbSettings.rname}antitagsw on\n${dbSettings.rname}antitagsw off`);
    let group = await Group.findOne({ groupId: toId });
    if (!group) {
      group = new Group({ groupId: toId });
    }
    group.antiTagStory = command === 'on';
    await group.save();
    await reactDone();
  }
};