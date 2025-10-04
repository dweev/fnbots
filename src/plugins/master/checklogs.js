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
  name: 'checklogs',
  category: 'master',
  description: 'Melihat log Baileys terakhir (DEBUG dan ERROR).\nUsage: checklogs [limit] [mode]\nMode: full (semua detail), detail (detail terbatas)',
  aliases: ['clog', 'baileyslogs'],
  isCommandWithoutPayment: true,
  execute: async ({ args, sReply, reactDone }) => {
    let limit = 5;
    let mode = 'simple';
    for (const arg of args) {
      const argLower = arg.toLowerCase();
      if (argLower === 'full') {
        mode = 'full';
      } else if (argLower === 'detail') {
        mode = 'detail';
      } else if (!isNaN(parseInt(arg))) {
        limit = parseInt(arg);
      }
    }
    if (limit > 50) {
      return await sReply('Maksimal hanya bisa melihat 50 log terakhir.');
    }
    const logFilePath = path.join(process.cwd(), config.paths.logsDir, 'baileys.log');
    if (!fs.existsSync(logFilePath)) {
      return await sReply('File log Baileys tidak ditemukan.');
    }
    const logs = [];
    const maxBackupFiles = 7;
    const readLogsFromFile = (filePath) => {
      if (!fs.existsSync(filePath)) return;
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      let currentLog = null;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const logMatch = line.match(/^\[(.+?)\] (DEBUG|ERROR|TRACE|INFO|WARN|FATAL): (.+)$/);
        if (logMatch) {
          if (currentLog && ['DEBUG', 'ERROR'].includes(currentLog.level)) {
            logs.push(currentLog);
          }
          currentLog = {
            timestamp: logMatch[1],
            level: logMatch[2],
            message: logMatch[3],
            details: []
          };
        } else if (currentLog && line.startsWith('    ') && line.trim() !== '') {
          currentLog.details.push(line);
        } else if (currentLog && line.match(/^\[(.+?)\] (DEBUG|ERROR|TRACE|INFO|WARN|FATAL):/)) {
          if (['DEBUG', 'ERROR'].includes(currentLog.level)) {
            logs.push(currentLog);
          }
          currentLog = null;
          i--;
        }
      }
      if (currentLog && ['DEBUG', 'ERROR'].includes(currentLog.level)) {
        logs.push(currentLog);
      }
    };
    readLogsFromFile(logFilePath);
    if (logs.length < limit) {
      for (let i = 1; i <= maxBackupFiles && logs.length < limit * 2; i++) {
        const backupFile = `${logFilePath}.${i}`;
        readLogsFromFile(backupFile);
      }
    }
    if (logs.length === 0) {
      return await sReply('Tidak ada log DEBUG/ERROR yang ditemukan.');
    }
    const lastLogs = logs.slice(-limit).reverse();
    const debugLogs = lastLogs.filter(l => l.level === 'DEBUG');
    const errorLogs = lastLogs.filter(l => l.level === 'ERROR');
    let output = `*${lastLogs.length} Log Baileys Terakhir* (Mode: ${mode})\n\n`;
    if (errorLogs.length > 0) {
      output += `*ERROR (${errorLogs.length}):*\n\n`;
      errorLogs.forEach((log, index) => {
        output += `*${index + 1}. [${log.timestamp}]*: ${log.message}\n`;
        if (log.details.length > 0) {
          if (mode === 'full') {
            output += log.details.join('\n') + '\n';
          } else if (mode === 'detail') {
            const limitedDetails = log.details.slice(0, 10);
            output += limitedDetails.join('\n') + '\n';
            if (log.details.length > 10) {
              output += `    ... (${log.details.length - 10} baris lagi)\n`;
            }
          }
        }
        output += '\n';
      });
    }
    if (debugLogs.length > 0) {
      output += `*DEBUG (${debugLogs.length}):*\n\n`;
      debugLogs.forEach((log, index) => {
        output += `*${index + 1}. [${log.timestamp}]*: ${log.message}\n`;
        if (log.details.length > 0 && mode !== 'simple') {
          if (mode === 'full') {
            output += log.details.join('\n') + '\n';
          } else if (mode === 'detail') {
            const limitedDetails = log.details.slice(0, 5);
            output += limitedDetails.join('\n') + '\n';
            if (log.details.length > 5) {
              output += `    ... (${log.details.length - 5} baris lagi)\n`;
            }
          }
        }
        output += '\n';
      });
    }
    output += `Total ${logs.length} log DEBUG/ERROR dalam file\n`;
    output += `Tip: gunakan "full" untuk detail lengkap, "detail" untuk ringkasan`;
    await sReply(output);
    await reactDone();
  }
};