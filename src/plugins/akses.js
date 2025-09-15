// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { User, Command } from '../../database/index.js';
import { Whitelist } from '../../database/index.js';
import log from '../utils/logger.js';

export const command = {
    name: 'akses',
    category: 'owner',
    description: 'Mengelola grup yang diizinkan menggunakan bot (whitelist).',
    aliases: ['whitelist'],
    execute: async ({ fn, m, sReply, reactDone, args, serial, dbSettings }) => {
        const subcmd = args[0];
        const target = args.slice(1).join(" ");
        if (subcmd === "reset") {
            await Whitelist.clearAll();
            await reactDone();
        } else if (subcmd === "add") {
            if (target.match(/(chat.whatsapp.com)/gi)) {
                const inviteCode = target.split("https://chat.whatsapp.com/")[1];
                try {
                    const { id } = await fn.groupGetInviteInfo(inviteCode);
                    await Whitelist.addToWhitelist(id, serial, 'Added via group invite', 'group');
                    await reactDone();
                } catch (error) {
                    await log(`Error command akses add\n${error}`, true);
                    await sReply(`Error: ${error.message}`);
                }
            } else if (target.includes("@g.us")) {
                await Whitelist.addToWhitelist(target, serial, 'Added manually', 'group');
                await reactDone();
            } else {
                if (m.isGroup) {
                    await Whitelist.addToWhitelist(m.key.remoteJid, serial, 'Added via command', 'group');
                    await reactDone();
                } else {
                    throw new Error("Perintah `akses add` tanpa target hanya bisa digunakan di dalam grup.");
                }
            }
        } else if (subcmd === "del") {
            if (target.includes("@g.us")) {
                await Whitelist.removeFromWhitelist(target, 'group');
                await reactDone();
            } else {
                if (m.isGroup) {
                    await Whitelist.removeFromWhitelist(m.key.remoteJid, 'group');
                    await reactDone();
                } else {
                    throw new Error("Perintah `akses del` tanpa target hanya bisa digunakan di dalam grup.");
                }
            }
        } else if (subcmd === "list") {
            const whitelistedGroups = await Whitelist.getWhitelistedGroups();
            let list = "📜 *Daftar Whitelist Grup:*\n\n";
            if (whitelistedGroups.length > 0) {
                let i = 1;
                for (const whitelist of whitelistedGroups) {
                    try {
                        const groupMeta = await fn.groupMetadata(whitelist.targetId);
                        list += `${i++}. ${groupMeta.subject}\n \`${whitelist.targetId}\`\n`;
                    } catch {
                        list += `${i++}. Tidak dapat membaca metadata\n \`${whitelist.targetId}\`\n`;
                    }
                }
            } else {
                list += "_Tidak ada grup yang di-whitelist._";
            }
            await sReply(list);
        } else {
            const guideMessage = `*❏ PANDUAN PERINTAH AKSES (WHITELIST) ❏*\n\nGunakan perintah ini untuk mengelola grup mana saja yang bisa menggunakan bot.\n\n*1. Menambah Akses:*\n\`${dbSettings.rname}akses add\` (di dalam grup target)\n\`${dbSettings.rname}akses add <link_grup>\`\n\`${dbSettings.rname}akses add <id_grup@g.us>\`\n\n*2. Menghapus Akses:*\n\`${dbSettings.rname}akses del\` (di dalam grup target)\n\`${dbSettings.rname}akses del <id_grup@g.us>\`\n\n*3. Melihat Daftar Akses:*\n\`${dbSettings.rname}akses list\`\n\n*4. Mereset Semua Akses:*\n\`${dbSettings.rname}akses reset\` (Hati-hati!)`;
            await sReply(guideMessage);
        }
        await Command.findOneAndUpdate({ name: command.name }, { $inc: { count: 1 } }, { upsert: true });
        await User.findOneAndUpdate({ userId: m.sender }, { $inc: { [`commandStats.${command.name}`]: 1 } }, { upsert: true });
    }
}