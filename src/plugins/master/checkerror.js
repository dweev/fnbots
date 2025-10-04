// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import fs from 'fs-extra';
import path from 'path';
import config from '../../../config.js';

export const command = {
  name: 'checkerror',
  category: 'master',
  description: 'Melihat error terakhir dari log aplikasi.\nUsage: checkerror [limit] [mode]\nMode: full (semua detail), detail (detail terbatas)',
  aliases: ['cerr', 'errorlog'],
  isCommandWithoutPayment: true,
  execute: async ({ args, sReply, reactDone }) => {
    let limit = 5;
    let mode = 'detail';
    for (const arg of args) {
      const argLower = arg.toLowerCase();
      if (argLower === 'full') {
        mode = 'full';
      } else if (argLower === 'detail') {
        mode = 'detail';
      } else if (argLower === 'simple') {
        mode = 'simple';
      } else if (!isNaN(parseInt(arg))) {
        limit = parseInt(arg);
      }
    }
    if (limit > 50) {
      return await sReply('Maksimal hanya bisa melihat 50 error terakhir.');
    }
    const logFilePath = path.join(process.cwd(), config.paths.logsDir, 'app_activity.log');
    if (!fs.existsSync(logFilePath)) {
      return await sReply('File log tidak ditemukan.');
    }
    const errors = [];
    const maxBackupFiles = 7;
    const readErrorsFromFile = (filePath) => {
      if (!fs.existsSync(filePath)) return;
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      let currentError = null;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const errorMatch = line.match(/^\[(.+?)\] (ERROR|FATAL): (.+)$/);
        if (errorMatch) {
          if (currentError) {
            errors.push(currentError);
          }
          currentError = {
            timestamp: errorMatch[1],
            level: errorMatch[2],
            message: errorMatch[3],
            details: []
          };
        } else if (currentError && line.startsWith('    ') && line.trim() !== '') {
          currentError.details.push(line);
        } else if (currentError && line.match(/^\[(.+?)\] (ERROR|FATAL|INFO|WARN|DEBUG):/)) {
          errors.push(currentError);
          currentError = null;
          i--;
        }
      }
      if (currentError) {
        errors.push(currentError);
      }
    };
    readErrorsFromFile(logFilePath);
    if (errors.length < limit) {
      for (let i = 1; i <= maxBackupFiles && errors.length < limit * 2; i++) {
        const backupFile = `${logFilePath}.${i}`;
        readErrorsFromFile(backupFile);
      }
    }
    if (errors.length === 0) {
      return await sReply('Tidak ada error yang ditemukan dalam log.');
    }
    const lastErrors = errors.slice(-limit).reverse();
    let output = `*${lastErrors.length} Error Terakhir* (Mode: ${mode})\n\n`;
    lastErrors.forEach((err, index) => {
      output += `*${index + 1}. [${err.timestamp}] ${err.level}*: ${err.message}\n`;
      if (err.details.length > 0) {
        if (mode === 'full') {
          output += err.details.join('\n') + '\n';
        } else if (mode === 'detail') {
          const limitedDetails = err.details.slice(0, 15);
          output += limitedDetails.join('\n') + '\n';
          if (err.details.length > 15) {
            output += `    ... (${err.details.length - 15} baris lagi)\n`;
          }
        }
      }
      output += '\n';
    });
    output += `Total ${errors.length} error dalam log\n`;
    output += `Tip: gunakan "full" untuk detail lengkap, "simple" untuk ringkasan`;
    await sReply(output);
    await reactDone();
  }
};