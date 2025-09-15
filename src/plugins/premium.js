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
    name: 'premium',
    category: 'owner',
    description: 'Mengelola hak akses premium untuk pengguna.',
    aliases: ['prem'],
    execute: async ({ sReply, args, arg, mentionedJidList, dbSettings, reactDone, m }) => {
        const handleAddPremiumUser = async (userId, duration) => {
            const durationParsed = formatDuration(duration);
            const msToAdd = durationParsed.asMilliseconds();
            await User.addPremium(userId, msToAdd);
            const durationMessage = formatDurationMessage(durationParsed);
            await sReply(`*「 PREMIUM ADDED 」*\n\n➸ *ID*: @${userId.split('@')[0]}\n${durationMessage}`);
        };
        const handleDeletePremiumUser = async (input) => {
            if (mentionedJidList.length > 0) {
                for (const userId of mentionedJidList) {
                    await User.removePremium(userId);
                }
                await reactDone();
            } else {
                const targets = input.split(",").map(s => s.trim()).filter(Boolean);
                for (const target of targets) {
                    if (target.includes('@')) {
                        await User.removePremium(target);
                    } else {
                        const allPremium = await User.findActivePremiums();
                        if (target >= 1 && target <= allPremium.length) {
                            await User.removePremium(allPremium[target - 1].userId);
                        }
                    }
                }
                await reactDone();
            }
        };
        const handleListPremiumUsers = async () => {
            const premiumUsers = await User.findActivePremiums();
            let ts = `*## ${dbSettings.botName} Premium ##*\n`;
            let no = 1;
            const sortedUsers = premiumUsers.sort((a, b) => b.premiumExpired - a.premiumExpired);
            for (let user of sortedUsers) {
                const expiredDate = dayjs(user.premiumExpired);
                const now = dayjs();
                const durationLeft = dayjs.duration(expiredDate.diff(now));
                const durationMessage = formatDurationMessage(durationLeft);
                ts += `\n${no}. @${user.userId.split('@')[0]}\n ${durationMessage}\n`;
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
                        await handleAddPremiumUser(benet, args[2]);
                    }
                } else {
                    await handleAddPremiumUser(args[1] + '@s.whatsapp.net', args[2]);
                }
            } else if (subCmd === 'del') {
                const input = arg.split(' ').slice(1).join(' ').trim();
                if (!input) throw new Error(`Gunakan format yang benar, contoh: ${dbSettings.rname}premium del @user`);
                await handleDeletePremiumUser(input);
            } else if (subCmd === 'list') {
                await handleListPremiumUsers();
            } else {
                throw new Error(`Sub-perintah '${subCmd}' tidak valid. Gunakan 'add', 'del', atau 'list'.`);
            }
        } else {
            const guideMessage = `*❏ PANDUAN PERINTAH PREMIUM ❏*\n\nBerikut adalah cara menggunakan perintah premium:\n\n*1. Menambah Premium:*\n\`\`\`${dbSettings.rname}premium add <@user/nomor> <durasi>\`\`\`\nContoh: \`${dbSettings.rname}premium add @user 30d\` atau \`${dbSettings.rname}premium add 62812... 1M\`\n\n*2. Menghapus Premium:*\n\`\`\`${dbSettings.rname}premium del <@user/nomor_list>\`\`\`\nContoh: \`${dbSettings.rname}premium del @user1,@user2\`\n\n*3. Melihat Daftar Premium:*\n\`\`\`${dbSettings.rname}premium list\`\`\``;
            await sReply(guideMessage);
        }
        await Command.findOneAndUpdate({ name: command.name }, { $inc: { count: 1 } }, { upsert: true });
        await User.findOneAndUpdate({ userId: m.sender }, { $inc: { [`commandStats.${command.name}`]: 1 } }, { upsert: true });
    }
};