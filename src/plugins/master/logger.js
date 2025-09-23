// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Settings } from '../../../database/index.js';
import { updatePinoLoggerLevel } from '../../lib/logger.js';

export const command = {
  name: 'logger',
  category: 'master',
  description: 'Mengubah level logging console Baileys (file tetap trace).',
  aliases: ['log'],
  execute: async ({ sReply, reactDone, args, dbSettings }) => {
    const mode = (args[0] || '').toLowerCase();
    if (!['silent', 'trace', 'debug', 'info', 'warn', 'error', 'fatal'].includes(mode)) {
      return await sReply(`gunakan perintah dengan benar, contoh: ${dbSettings.rname}logger silent/trace/debug/info/warn/error/fatal`);
    }
    dbSettings.pinoLogger = mode;
    updatePinoLoggerLevel(mode);
    await Promise.all([
      Settings.updateSettings(dbSettings),
      sReply(`Console logger: ${mode}`),
      reactDone()
    ]);
  }
};