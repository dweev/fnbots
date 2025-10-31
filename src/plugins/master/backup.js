// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import util from 'util';
import path from 'path';
import { tmpDir } from '../../lib/tempManager.js';
import { execFile as cp_execFile } from 'child_process';

const execFile = util.promisify(cp_execFile);
export const command = {
  name: 'backup',
  category: 'master',
  description: 'Menyimpan backup file bot',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, toId, arg, args, dbSettings }) => {
    let fileName = 'backup_file';
    if (arg) {
      const sanitizedArg = args[0].replace(/[^a-zA-Z0-9_-]/g, '');
      if (sanitizedArg) {
        fileName = sanitizedArg;
      }
    }
    const backupFilePath = tmpDir.createTempFile('zip', fileName);
    const sourceDir = '.';
    // prettier-ignore
    const exclusions = [
      path.basename(backupFilePath),
      'logs/*',
      'node_modules/*',
      'venv/*',
      '.git/*',
      '.*'
    ];
    const excludeArgs = exclusions.map((ex) => ['-x', ex]).flat();
    const zipArgs = ['-r', backupFilePath, sourceDir, ...excludeArgs];
    await execFile('zip', zipArgs);
    await fn.sendFilePath(toId, dbSettings.autocommand, backupFilePath, { quoted: m });
  }
};
