// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

export const command = {
  name: 'unblockall',
  category: 'bot',
  description: 'Menghapus daftar blokir dari akun bot.',
  isCommandWithoutPayment: true,
  execute: async ({ fn, reactDone }) => {
    const blockNumber = await fn.fetchBlocklist();
    await Promise.all(blockNumber.map((number) => fn.updateBlockStatus(number, 'unblock')));
    await reactDone();
  }
};
