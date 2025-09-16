// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Settings, Command, User } from '../../database/index.js';

export const command = {
  name: 'autocorrect',
  category: 'master',
  description: 'Mengaktifkan atau menonaktifkan mode autocorrect.',
  aliases: ['suggest'],
  execute: async ({ m, dbSettings, reactDone, args }) => {
    const mode = (args[0] || '').toLowerCase();
    const modes = { on: 1, auto: 2, off: 0 };
    if (!(mode in modes)) throw new Error(`gunakan perintah dengan benar, contoh: ${dbSettings.rname}autocorrect on/auto/off`);
    dbSettings.autocorrect = modes[mode];
    await Settings.updateSettings(dbSettings);
    await reactDone();
    await Command.findOneAndUpdate({ name: command.name }, { $inc: { count: 1 } }, { upsert: true });
    await User.findOneAndUpdate({ userId: m.sender }, { $inc: { [`commandStats.${command.name}`]: 1 } }, { upsert: true });
  }
};