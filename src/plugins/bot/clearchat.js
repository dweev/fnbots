// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

export const command = {
  name: 'clearchat',
  category: 'bot',
  description: 'Menghapus semua pesan dalam obrolan.',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, toId }) => {
    const messageTimestamp = m.timestamp && m.timestamp !== 0 ? m.timestamp : Date.now();
    const modifyOptions = {
      lastMessages: [{
        key: m.key,
        messageTimestamp: messageTimestamp
      }]
    };
    if (m.isGroup) {
      modifyOptions.clear = true;
    } else {
      modifyOptions.delete = true;
    }
    await fn.chatModify(modifyOptions, toId);
  }
};