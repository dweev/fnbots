// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import fs from 'fs-extra';
import config from '../../../config.js';
import { getMyBalance } from '../../function/index.js';

export const command = {
  name: 'gameshop',
  category: 'game',
  description: 'Cek daftar toko gamer',
  isCommandWithoutPayment: true,
  execute: async ({ fn, user, dbSettings, toId, m, pushname, serial }) => {
    let datax;
    try {
      datax = await fn.profileImageBuffer(serial, 'image');
    } catch {
      datax = await fs.readFile(config.paths.avatar);
    }
    const prefix = dbSettings.rname;
    const buylimitItems = [
      { limit: 50, price: 1500 },
      { limit: 100, price: 3000 },
      { limit: 150, price: 4500 },
      { limit: 200, price: 6000 },
      { limit: 250, price: 7500 },
      { limit: 300, price: 9000 },
      { limit: 350, price: 10500 },
      { limit: 400, price: 12000 },
      { limit: 450, price: 13500 },
      { limit: 500, price: 15000 },
      { limit: 1500, price: 150000 },
      { limit: 15000, price: 1500000 }
    ];
    let text = `❏  \`\`\`G A M E S H O P\`\`\`\n`;
    for (const item of buylimitItems) {
      text += `> ${prefix}buylimit ${item.limit} [harga: $ ${item.price.toLocaleString()}]\n`;
    }
    for (const item of buylimitItems) {
      text += `> ${prefix}buylimitgame ${item.limit} [harga: $ ${item.price.toLocaleString()}]\n`;
    }
    text += `> ${prefix}buypremium [harga: $ 100.000.000.000]\n`;
    text += `> ${prefix}buyvip [harga: $ 100.000.000.000.000]\n\n`;
    text += `❏  \`\`\`N O T E\`\`\`\n`;
    text += `> premium dan vip berlaku 1bulan\n`;
    text += `> limit hanya berlaku 1 hari sampai jam 21.00 serta tunduk kepada syarat dan ketentuan penggunaan bot!`;
    const buffer = await getMyBalance(user, pushname, datax);
    await fn.sendMediaFromBuffer(toId, 'image/jpeg', buffer, text, m);
  }
};
