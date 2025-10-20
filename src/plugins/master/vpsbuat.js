// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import util from 'util';
import { exec as cp_exec } from 'child_process';
import { getServerIp } from '../../function/index.js';

const exec = util.promisify(cp_exec);
export const command = {
  name: 'vpsbuat',
  displayName: 'vps-create',
  category: 'master',
  description: 'Membuat vps untuk user baru',
  isCommandWithoutPayment: true,
  aliases: ['vps-buat', 'vps-create'],
  execute: async ({ sReply, args, dbSettings }) => {
    const username = args[0];
    const password = args[1];
    if (!username || !password) return await sReply(`Format perintah salah.\nContoh: \`${dbSettings.rname}vpsbuat namauser passwordkuat\``);
    const command = `sudo useradd -m -p $(openssl passwd -1 "${password}") ${username}`;
    const { stdout } = await exec(command);
    if (stdout) {
      await sReply(`Sukses!\n\nUser *${username}* berhasil dibuat di server ${getServerIp}.`);
    }
  }
};