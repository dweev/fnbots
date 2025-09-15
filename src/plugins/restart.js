// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Settings, Command, User } from '../../database/index.js';
import { delay } from 'baileys';

export const command = {
    name: 'restart',
    category: 'master',
    description: 'Melakukan restart bot.',
    aliases: ['reboot', 'run', 'res'],
    execute: async ({ fn, m, dbSettings, handleRestart, command }) => {
        dbSettings.restartState = true;
        dbSettings.restartId = m.from;
        dbSettings.dataM = m;
        await Settings.updateSettings(dbSettings);
        await delay(1000);
        await fn.sendMessage(m.from, { react: { text: '✅', key: m.key } });
        await handleRestart("Restarting...");
        await Command.findOneAndUpdate({ name: command.name }, { $inc: { count: 1 } }, { upsert: true });
        await User.findOneAndUpdate({ userId: m.sender }, { $inc: { [`commandStats.${command.name}`]: 1 } }, { upsert: true });
    }
}