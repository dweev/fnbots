// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import fs from 'fs-extra';

export const command = {
  name: 'vpslist',
  displayName: 'vps-list',
  category: 'master',
  description: 'Melihat info vps yang ada di directori home',
  isCommandWithoutPayment: true,
  aliases: ['vps-list'],
  execute: async ({ sReply }) => {
    const passwdPath = '/etc/passwd';
    const data = await fs.readFile(passwdPath, 'utf8');
    const users = data
      .trim()
      .split('\n')
      .map(line => line.split(':'))
      .filter(parts => {
        const homeDir = parts[5];
        return homeDir && homeDir.startsWith('/home/');
      })
      .map(parts => parts[0]);
    if (users.length > 0) {
      let userListText = `*Daftar User di Server:*\n\n`;
      userListText += users.map(user => `👤 ${user}`).join('\n');
      await sReply(userListText);
    } else {
      await sReply("Tidak ditemukan user normal di server.");
    }
  }
};