// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

export const command = {
  name: 'zodiac',
  displayName: 'chinesse-zodiac',
  category: 'fun',
  description: `Melihat info chinesse zodiac`,
  isCommandWithoutPayment: true,
  aliases: ['chinesse-zodiac'],
  execute: async ({ arg, args, sReply, dbSettings }) => {
    if (!arg) return await sReply(`Format salah!\nGunakan perintah seperti: ${dbSettings.sname}chinese-zodiac <tahun>`);
    const signs = ['Monkey', 'Rooster', 'Dog', 'Pig', 'Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat'];
    const year = args[0];
    await sReply(`The Chinese Zodiac Sign for ${parseInt(year)} is ${signs[parseInt(year) % signs.length]}.`);
  }
};
