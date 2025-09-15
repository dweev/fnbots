// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { User, Command } from '../../database/index.js';

export const command = {
    name: 'mentionall',
    category: 'util',
    description: 'Menyebutkan semua anggota grup.',
    aliases: ['tagall', 'tag'],
    execute: async ({ fn, m, toId }) => {
        if (!m.isGroup) throw new Error("Perintah ini hanya bisa digunakan di grup.");
        const groupMetadata = await fn.groupMetadata(toId);
        const mentions = groupMetadata.participants.map(member => member.id);
        let message = "📢 MENTIONALL MEMBER\n";
        mentions.forEach((jid, idx) => {
            message += `\n${idx + 1}. @${jid.split('@')[0]}`;
        });
        await fn.sendPesan(toId, message, m);
        await Command.findOneAndUpdate({ name: command.name }, { $inc: { count: 1 } }, { upsert: true });
        await User.findOneAndUpdate({ userId: m.sender }, { $inc: { [`commandStats.${command.name}`]: 1 } }, { upsert: true });
    }
}