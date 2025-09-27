// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { speedtest } from '../../lib/function.js';

export const command = {
  name: 'speedtest',
  category: 'owner',
  description: 'Mengecek kecepatan internet vps',
  isCommandWithoutPayment: true,
  execute: async ({ sReply }) => {
    const b = await speedtest();
    let a = '';
    a += `*❏ Internet Speed*\n`;
    a += `> Download: ${b.download} Mbps\n`;
    a += `> Upload: ${b.upload} Mbps\n`;
    a += `> Ping: ${b.ping} ms`;
    await sReply(a);
  }
};