// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

export const command = {
  name: 'rvo',
  category: 'util',
  description: 'Memeriksa waktu respons bot.',
  aliases: ['readviewonce'],
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, quotedMsg, dbSettings, toId }) => {
    if (quotedMsg) {
      const akuCrot = m.quoted[m.quoted.type] || m.quoted;
      if (akuCrot.viewOnce) {
        if (quotedMsg?.imageMessage || quotedMsg?.videoMessage || quotedMsg?.audioMessage) {
          const buffer = await fn.getMediaBuffer(quotedMsg);
          await fn.sendMediaFromBuffer(toId, quotedMsg.mime, buffer, quotedMsg.body || dbSettings.autocommand, m);
        }
      }
    }
  }
};
