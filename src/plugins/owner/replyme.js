// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

export const command = {
  name: 'replyme',
  category: 'owner',
  description: 'menanggapi ketika meminta di reply',
  isCommandWithoutPayment: true,
  execute: async ({ serial, sReply, m }) => {
    if (!m.isGroup) return;
    await sReply(`why @${serial.split('@')[0]}?`);
  }
};