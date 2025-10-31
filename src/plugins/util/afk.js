// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import dayjs from '../../utils/dayjs.js';
import { Group } from '../../../database/index.js';

export const command = {
  name: 'afk',
  category: 'util',
  description: 'Mengatur status AFK (Away From Keyboard) di grup',
  aliases: ['away'],
  isCommandWithoutPayment: true,
  execute: async ({ m, sReply, serial, args, toId }) => {
    if (!m.isGroup) return await sReply('Command ini hanya bisa digunakan di grup!');
    const groupData = await Group.ensureGroup(toId);
    const isCurrentlyAfk = groupData.checkAfkUser(serial);
    if (isCurrentlyAfk) return await sReply('Kamu sudah terdaftar sebagai AFK di grup ini!');
    const reason = args.length > 0 ? args.join(' ') : 'sibuk';
    const currentTime = dayjs().tz('Asia/Jakarta');
    const timeFormatted = currentTime.format('DD/MM/YYYY HH:mm:ss');
    await groupData.addAfkUser(serial, reason);
    let afkMessage = `┌ ❏ AFK : REGISTERED\n`;
    afkMessage += `│ ├ USER : ${m.pushName || 'Unknown'}\n`;
    afkMessage += `│ ├ TIME : ${timeFormatted}\n`;
    afkMessage += `└ └ REASON : ${reason}`;
    await sReply(afkMessage);
  }
};
