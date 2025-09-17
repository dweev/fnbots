// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Settings } from '../../../database/index.js';

export const command = {
  name: 'logger',
  category: 'master',
  description: 'Mengubah level logging pino.',
  aliases: ['log'],
  execute: async ({ sReply, reactDone, args, dbSettings }) => {
    const mode = (args[0] || '').toLowerCase();
    if (!['silent', 'trace', 'debug', 'info', 'warn', 'error', 'fatal'].includes(mode)) {
      throw new Error(`gunakan perintah dengan benar, contoh: ${dbSettings.rname}logger silent/trace/debug/info/warn/error/fatal`);
    }
    dbSettings.pinoLogger = mode;
    await Promise.all([Settings.updateSettings(dbSettings), sReply(`pinoLogger sudah dirubah menjadi: \n\n- level: ${dbSettings.pinoLogger}`), reactDone()]);
  }
};