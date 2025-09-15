// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { formatDuration, formatDurationMessage } from '../utils/function.js';
import { Command, User } from '../../database/index.js';
import dayjs from 'dayjs';

import utc from 'dayjs/plugin/utc.js';
import duration from 'dayjs/plugin/duration.js';
import timezone from 'dayjs/plugin/timezone.js';
import localizedFormat from 'dayjs/plugin/localizedFormat.js';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(duration);
dayjs.extend(localizedFormat);

export const command = {
    name: 'vip',
    category: 'owner',
    description: 'Mengelola hak akses VIP untuk pengguna.',
    aliases: ['vvip'],
    execute: async ({ sReply, args, arg, mentionedJidList, dbSettings, reactDone, m }) => {
        const handleAddVIPUser = async (userId, duration) => {
            const durationParsed = formatDuration(duration);
            const msToAdd = durationParsed.asMilliseconds();
            await User.addVIP(userId, msToAdd);
            const durationMessage = formatDurationMessage(durationParsed);
            await sReply(`*「 VIP ADDED 」*\n\n➸ *ID*: @${userId.split('@')[0]}\n${durationMessage}`);
        };
        const handleDeleteVIPUser = async (input) => {
            if (mentionedJidList.length > 0) {
                for (const userId of mentionedJidList) {
                    await User.removeVIP(userId);
                }
                await reactDone();
            } else {
                const targets = input.split(",").map(s => s.trim()).filter(Boolean);
                for (const target of targets) {
                    if (target.includes('@')) {
                        await User.removeVIP(target);
                    } else {
                        const allVIP = await User.findActiveVIPs();
                        if (target >= 1 && target <= allVIP.length) {
                            await User.removeVIP(allVIP[target - 1].userId);
                        }
                    }
                }
                await reactDone();
            }
        };
        const handleListVIPUsers = async () => {
            const vipUsers = await User.findActiveVIPs();
            let ts = `*## ${dbSettings.botName} VIP ##*\n`;
            let no = 1;
            const sortedUsers = vipUsers.sort((a, b) => b.vipExpired - a.vipExpired);
            for (let user of sortedUsers) {
                const expiredDate = dayjs(user.vipExpired);
                const now = dayjs();
                const durationLeft = dayjs.duration(expiredDate.diff(now));
                const durationMessage = formatDurationMessage(durationLeft);
                ts += `\n${no}. @${user.userId.split('@')[0]}\n  ${durationMessage}\n`;
                no += 1;
            }
            ts += "\nRegards: *" + dbSettings.botName + "*";
            await sReply(ts);
        };
        if (arg) {
            const subCmd = args[0];
            if (subCmd === 'add') {
                if (mentionedJidList.length !== 0) {
                    for (let benet of mentionedJidList) {
                        await handleAddVIPUser(benet, args[2]);
                    }
                } else {
                    await handleAddVIPUser(args[1] + '@s.whatsapp.net', args[2]);
                }
            } else if (subCmd === 'del') {
                const input = arg.split(' ').slice(1).join(' ').trim();
                if (!input) throw new Error(`Gunakan format yang benar, contoh: ${dbSettings.rname}vip del @user`);
                await handleDeleteVIPUser(input);
            } else if (subCmd === 'list') {
                await handleListVIPUsers();
            } else {
                throw new Error(`Sub-perintah '${subCmd}' tidak valid. Gunakan 'add', 'del', atau 'list'.`);
            }
        } else {
            const guideMessage = `*❏ PANDUAN PERINTAH VIP ❏*\n\nBerikut adalah cara menggunakan perintah VIP:\n\n*1. Menambah VIP:*\n\`\`\`${dbSettings.rname}vip add <@user/nomor> <durasi>\`\`\`\nContoh: \`${dbSettings.rname}vip add @user 7d\`\n\n*2. Menghapus VIP:*\n\`\`\`${dbSettings.rname}vip del <@user/nomor_list>\`\`\`\nContoh: \`${dbSettings.rname}vip del @user\`\n\n*3. Melihat Daftar VIP:*\n\`\`\`${dbSettings.rname}vip list\`\`\``;
            await sReply(guideMessage);
        }
        await Command.findOneAndUpdate({ name: command.name }, { $inc: { count: 1 } }, { upsert: true });
        await User.findOneAndUpdate({ userId: m.sender }, { $inc: { [`commandStats.${command.name}`]: 1 } }, { upsert: true });
    }
};