// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { User, Command } from '../../database/index.js';
import { formatDurationMessage } from '../utils/function.js';

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
    name: 'checkvip',
    category: 'vip',
    description: 'Memeriksa apakah user memiliki benefit vip atau tidak',
    aliases: ['cekvip'],
    execute: async ({ mentionedJidList, serial, sReply, m }) => {
        let targetId = mentionedJidList[0] || serial;
        const vipUser = await User.findOne({
            userId: targetId,
            isVIP: true,
            vipExpired: { $gt: new Date() }
        });
        if (!vipUser) {
            await sReply(`@${targetId.split('@')[0]} tidak memiliki status VIP aktif.`);
            return;
        }
        const remainingMs = vipUser.vipExpired - Date.now();
        const durationLeft = dayjs.duration(remainingMs);
        const durationMessage = formatDurationMessage(durationLeft);
        await sReply(`「 *VIP EXPIRE* 」\n\n➸ *ID*: @${targetId.split('@')[0]}\n➸ ${durationMessage}`);
        await Command.findOneAndUpdate({ name: command.name }, { $inc: { count: 1 } }, { upsert: true });
        await User.findOneAndUpdate({ userId: m.sender }, { $inc: { [`commandStats.${command.name}`]: 1 } }, { upsert: true });
    }
}
