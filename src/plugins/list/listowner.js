// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { User } from '../../../database/index.js';

export const command = {
  name: 'listowner',
  category: 'list',
  description: 'Daftar list owner yang dimiliki oleh Bot',
  aliases: ['ownerlist', 'masterlist', 'listmaster'],
  isCommandWithoutPayment: true,
  execute: async ({ sReply, isSadmin }) => {
    if (!isSadmin) return;
    const owners = await User.getMasters();
    let list = `This is list of owner number\nTotal: ${owners.length}\n`;
    owners.forEach((owner, i) => {
      list += `\n${i + 1}. @${owner.userId.split('@')[0]}`;
    });
    await sReply(list);
  }
};