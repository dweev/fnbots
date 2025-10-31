// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

export const command = {
  name: 'chatarchive',
  category: 'bot',
  description: 'Mengarsipkan pesan.',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, toId, reactDone, dbSettings, sReply, args }) => {
    const mode = (args[0] || '').toLowerCase();
    if (!['on', 'off'].includes(mode)) return await sReply(`Gunakan perintah dengan benar, contoh: ${dbSettings.rname}chat-archive on/off`);
    const arsip = mode === 'on';
    const messageTimestamp = m.timestamp && m.timestamp !== 0 ? m.timestamp : Date.now();
    const modifyOptions = {
      archive: arsip,
      lastMessages: [
        {
          key: m.key,
          messageTimestamp: messageTimestamp
        }
      ]
    };
    await fn.chatModify(modifyOptions, toId);
    await reactDone();
  }
};
