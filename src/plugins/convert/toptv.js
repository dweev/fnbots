// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

export const command = {
  name: 'toptv',
  category: 'convert',
  description: 'Mengconvert video ke ptv',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, quotedMsg, toId, sReply, dbSettings }) => {
    const targetMsg = quotedMsg ? m.quoted || m : m.message;
    const mimeType = targetMsg?.videoMessage?.mimetype;
    if (!mimeType) return await sReply('Balas sebuah video, atau kirim video dengan caption perintah ini.');
    const mediaData = await fn.getMediaBuffer(targetMsg);
    await fn.sendMediaFromBuffer(toId, 'video/mp4', mediaData, dbSettings.autocommand, m);
  }
};
