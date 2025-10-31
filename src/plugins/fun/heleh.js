// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

export const command = {
  name: 'heleh',
  category: 'fun',
  description: `Mengubah huruf vokal menjadi huruf E`,
  isCommandWithoutPayment: true,
  execute: async ({ arg, quotedMsg, sReply }) => {
    let toMsg = '';
    if (quotedMsg && (quotedMsg?.type === 'extendedTextMessage' || quotedMsg?.type === 'conversation')) {
      toMsg = quotedMsg?.body;
    } else {
      if (!arg) return await sReply('format pesan salah!!');
      toMsg = arg;
    }
    const halahMsg = toMsg.replace(/[aiueo]/gi, 'e');
    await sReply(halahMsg);
  }
};
