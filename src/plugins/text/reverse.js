// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

export const command = {
  name: 'reverse',
  category: 'text',
  description: 'Membalik teks',
  isCommandWithoutPayment: true,
  execute: async ({ quotedMsg, sReply, arg }) => {
    let a
    if ((quotedMsg && quotedMsg?.type === "extendedTextMessage") || (quotedMsg && quotedMsg?.type === "conversation")) {
      a = quotedMsg?.body
    } else if (arg.length > 0) {
      a = arg
    } else {
      return await sReply(`Mohon berikan teks yang ingin dibalik.`);
    }
    await sReply(a.split('').reverse().join(''));
  }
};