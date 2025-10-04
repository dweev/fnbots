// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import util from 'util';
import path from 'path';
import { exec as cp_exec } from 'child_process';
import { tmpDir } from '../../lib/tempManager.js';

const exec = util.promisify(cp_exec);
export const command = {
  name: 'backup',
  category: 'master',
  description: 'Menyimpan backup file bot',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, toId, arg, args, dbSettings }) => {
    let backupFilePath = '';
    try {
      let fileName = 'backup_file';
      if (arg) {
        const sanitizedArg = args[0].replace(/[^a-zA-Z0-9_-]/g, '');
        if (sanitizedArg) {
          fileName = sanitizedArg;
        }
      }
      backupFilePath = tmpDir.createTempFile('zip', fileName);
      const sourceDir = '.';
      const exclusions = [
        `"${path.basename(backupFilePath)}"`,
        '"logs/*"',
        '"node_modules/*"',
        '"venv/*"',
        '".git/*"',
        '".*"'
      ];
      const excludeString = exclusions.map(ex => `-x ${ex}`).join(' ');
      const command = `zip -r ${backupFilePath} ${sourceDir} ${excludeString}`;
      await exec(command);
      await fn.sendFilePath(toId, dbSettings.autocommand, backupFilePath, { quoted: m });
    } finally {
      await tmpDir.deleteFile(backupFilePath);
    }
  }
};