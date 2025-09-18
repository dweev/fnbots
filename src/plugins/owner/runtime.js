// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { waktu } from '../../lib/function.js';

const timeStart = Date.now() / 1000;
export const command = {
  name: 'runtime',
  category: 'owner',
  description: 'Menampilkan waktu uptime bot.',
  aliases: ['uptime', 'rt'],
  execute: async ({ sReply }) => {
    let tms = (Date.now() / 1000) - (timeStart);
    let cts = waktu(tms);
    await sReply(cts);
  }
};