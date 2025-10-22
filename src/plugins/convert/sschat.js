// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { generateFakeChatWithQCGenerator } from '../../function/index.js';

export const command = {
  name: 'sschat',
  category: 'convert',
  description: 'Membuat Fake Chat',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, args, sReply, store }) => {
    const count = parseInt(args[0]) || 5;
    if (count > 20) return await sReply("Jumlah percakapan tidak boleh lebih dari 20.");
    await generateFakeChatWithQCGenerator(m, count, fn, store);
  }
};