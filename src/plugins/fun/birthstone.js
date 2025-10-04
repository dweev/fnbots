// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { firstUpperCase, list } from '../../function/index.js';

export const command = {
  name: 'birthstone',
  category: 'fun',
  description: `Melihat info birthstone`,
  isCommandWithoutPayment: true,
  execute: async ({ arg, args, sReply, dbSettings }) => {
    if (!arg) return await sReply(`format salah!!\ngunakan perintah seperti ${dbSettings.rname}birthstone angkabulan`);
    const months = [
      "januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember"
    ];
    const stones = [
      { primary: "Garnet" },
      { primary: "Amethyst" },
      { primary: "Aquamarine", alternate: ["Bloodstone"] },
      { primary: "Diamond" },
      { primary: "Emerald" },
      { primary: "Pearl", alternate: ["Moonstone", "Alexandrite"] },
      { primary: "Ruby" },
      { primary: "Peridot", alternate: ["Spinel"] },
      { primary: "Sapphire" },
      { primary: "Opal", alternate: ["Tourmaline"] },
      { primary: "Topaz", alternate: ["Citrine"] },
      { primary: "Turquoise", alternate: ["Zircon", "Tanzanite"] }
    ];
    const month = parseInt(args[0]);
    if (!month || month < 1 || month > 12) return await sReply(`Command hanya bisa digunakan dengan angka 1 sampai 12.\nContoh: ${dbSettings.sname}birthstone 1`);
    const stone = stones[month - 1];
    const alternate = stone.alternate ? ` Alternatif lainnya adalah ${list(stone.alternate, 'atau')}.` : '';
    await sReply(`Batu kelahiran untuk bulan ${firstUpperCase(months[month - 1])} adalah *${stone.primary}*.${alternate}`);
  }
};