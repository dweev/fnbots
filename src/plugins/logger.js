// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Command, Settings, User } from '../../database/index.js';

export const command = {
    name: 'logger',
    category: 'master',
    description: 'Mengubah level logging pino.',
    aliases: ['log'],
    execute: async ({ sReply, reactDone, args, dbSettings, m, command }) => {
        const mode = (args[0] || '').toLowerCase();
        if (!['silent', 'trace', 'debug', 'info', 'warn', 'error', 'fatal'].includes(mode)) {
            throw new Error(`gunakan perintah dengan benar, contoh: ${dbSettings.rname}logger silent/trace/debug/info/warn/error/fatal`);
        }
        dbSettings.pinoLogger = mode;
        await Settings.updateSettings(dbSettings);
        await sReply(`pinoLogger sudah dirubah menjadi: \n\n- level: ${dbSettings.pinoLogger}`);
        await reactDone();
        await Command.findOneAndUpdate({ name: command.name }, { $inc: { count: 1 } }, { upsert: true });
        await User.findOneAndUpdate({ userId: m.sender }, { $inc: { [`commandStats.${command.name}`]: 1 } }, { upsert: true });
    }
};