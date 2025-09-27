// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

export const command = {
  name: 'setdefaultephemeral',
  category: 'bot',
  description: 'Mengatur pengaturan default ephemeral messages.',
  isCommandWithoutPayment: true,
  execute: async ({ fn, args, reactDone }) => {
    const _waktu = args[0]
    if (_waktu === '90d') {
      await fn.updateDefaultDisappearingMode(7776000);
    } else if (_waktu === '7d') {
      await fn.updateDefaultDisappearingMode(604800);
    } else if (_waktu === '1d' || _waktu === '24jam') {
      await fn.updateDefaultDisappearingMode(86400);
    } else if (_waktu === 'off') {
      await fn.updateDefaultDisappearingMode(0);
    } else if (args.length > 1) {
      throw new Error('gunakan argument:\n90d, 7d, 1d, 24jam, off')
    } else {
      throw new Error('gunakan argument:\n90d, 7d, 1d, 24jam, off')
    };
    await reactDone();
  }
};