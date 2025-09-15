// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { User, Command } from '../../database/index.js';
import { formatCommandList } from '../utils/function.js';
import { pluginCache } from '../utils/plugins.js';

export const command = {
    name: 'commands',
    category: 'util',
    description: 'Menampilkan semua daftar perintah bot.',
    aliases: ['menu', 'help'],
    execute: async ({ sReply, isSadmin, isMaster, isVIP, isPremium, isWhiteList, dbSettings, m, command }) => {
        let ts = `*── ${dbSettings.botName} ──*`;
        const menuSections = [
            { title: 'MASTER COMMANDS', data: pluginCache.helpMap.get('master'), required: isSadmin },
            { title: 'OWNER COMMANDS', data: pluginCache.helpMap.get('owner'), required: isSadmin || isMaster },
            { title: 'VIP COMMANDS', data: pluginCache.helpMap.get('vip'), required: isSadmin || isMaster || (isWhiteList && isVIP) },
            { title: 'PREMIUM COMMANDS', data: pluginCache.helpMap.get('premium'), required: isSadmin || isMaster || (isWhiteList && isVIP && isPremium) },
            { title: 'MANAGE COMMANDS', data: pluginCache.helpMap.get('manage'), required: isSadmin || isMaster || (isWhiteList && isVIP && isPremium) },
            { title: 'UTIL COMMANDS', data: pluginCache.helpMap.get('util'), required: isSadmin || isMaster || (isWhiteList && isVIP && isPremium) },
        ];
        for (const section of menuSections) {
            if (section.required && section.data) {
                const commandListString = formatCommandList(section.data);
                if (commandListString) {
                    ts += `\n\n*${section.title}*${commandListString}`;
                }
            }
        }
        ts += `\n\nRegards: *FNBOTS*`;
        await sReply(`${ts}\n\n@${m.sender.split('@')[0]}`);
        await Command.findOneAndUpdate({ name: command.name }, { $inc: { count: 1 } }, { upsert: true });
        await User.findOneAndUpdate({ userId: m.sender }, { $inc: { [`commandStats.${command.name}`]: 1 } }, { upsert: true });
    }
};