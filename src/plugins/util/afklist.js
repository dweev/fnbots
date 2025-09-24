// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import dayjs from '../../utils/dayjs.js';
import { waktu } from '../../lib/function.js';
import { Group } from '../../../database/index.js';

export const command = {
  name: 'afklist',
  category: 'manage',
  description: 'Menampilkan daftar user yang sedang AFK di grup',
  aliases: ['listafk'],
  execute: async ({ fn, m, sReply, toId }) => {
    if (!m.isGroup) return await sReply('Command ini hanya bisa digunakan di grup!');
    const groupData = await Group.ensureGroup(toId);
    if (groupData.afkUsers.length === 0) return sReply('Tidak ada user yang sedang AFK di grup ini.');
    let afkListMessage = `┌ ❏ DAFTAR USER AFK\n│\n`;
    for (let index = 0; index < groupData.afkUsers.length; index++) {
      const afkUser = groupData.afkUsers[index];
      const userName = await fn.getName(afkUser.userId) || afkUser.userId.split('@')[0];
      const afkTime = dayjs(afkUser.time).tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm:ss');
      const durationSeconds = Math.floor((dayjs().diff(dayjs(afkUser.time))) / 1000);
      const duration = waktu(durationSeconds);
      afkListMessage += `│ ${index + 1}. ${userName}\n`;
      afkListMessage += `│    ├ Sejak: ${afkTime}\n`;
      afkListMessage += `│    ├ Durasi: ${duration}\n`;
      afkListMessage += `│    └ Alasan: ${afkUser.reason}\n│\n`;
    }
    afkListMessage += '└─ Total user AFK dalam grup ini.';
    await sReply(afkListMessage);
  }
};