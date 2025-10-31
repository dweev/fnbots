// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { burn } from '../../function/index.js';

export const command = {
  name: 'burn',
  category: 'image',
  description: 'Add burn effect to an image',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, toId, dbSettings, arg, sReply }) => {
    if (!arg) return await sReply(`Mohon berikan teks yang ingin di burn.`);
    const resBuffer = await burn(arg);
    await fn.sendMediaFromBuffer(toId, 'image/jpeg', resBuffer, dbSettings.autocommand, m);
  }
};
