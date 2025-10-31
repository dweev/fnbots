// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

export const command = {
  name: 'tagme',
  category: 'owner',
  description: 'menanggapi ketika meminta di tag',
  isCommandWithoutPayment: true,
  execute: async ({ serial, sPesan, m }) => {
    if (!m.isGroup) return;
    await sPesan(`why @${serial.split('@')[0]}?`);
  }
};
