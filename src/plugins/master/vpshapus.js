// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import util from 'util';
import { exec as cp_exec } from 'child_process';

const exec = util.promisify(cp_exec);
export const command = {
  name: 'vpshapus',
  displayName: 'vps-delete',
  category: 'master',
  description: 'Menghapus vps dari user',
  isCommandWithoutPayment: true,
  aliases: ['vps-hapus', 'vps-delete'],
  execute: async ({ sReply, args, dbSettings }) => {
    const username = args[0];
    if (!username) return await sReply(`Format perintah salah.\nContoh: \`${dbSettings.rname}vpshapus namauser\``);
    const command = `sudo deluser --remove-home ${username}`;
    await exec(command);
    await sReply(`Sukses!\n\nUser *${username}* telah dihapus dari server.`);
  }
};
