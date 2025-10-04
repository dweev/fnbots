// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

export const command = {
  name: 'disappear',
  category: 'manage',
  description: 'Menghapus pesan secara otomatis',
  isCommandWithoutPayment: true,
  execute: async ({ fn, toId, sReply, args, reactDone }) => {
    const _waktu = args[0]?.toLowerCase();
    if (_waktu === '90d') {
      await fn.sendMessage(toId, { disappearingMessagesInChat: 7776000 });
    } else if (_waktu === '7d') {
      await fn.sendMessage(toId, { disappearingMessagesInChat: 604800 });
    } else if (_waktu === '1d' || _waktu === '24jam') {
      await fn.sendMessage(toId, { disappearingMessagesInChat: 86400 });
    } else if (_waktu === 'off') {
      await fn.sendMessage(toId, { disappearingMessagesInChat: 0 });
    } else if (args.length > 1) {
      return await sReply('gunakan argument:\n90d, 7d, 1d, 24jam, off');
    } else {
      return await sReply('gunakan argument:\n90d, 7d, 1d, 24jam, off');
    };
    await reactDone();
  }
};