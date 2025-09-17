// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { User } from '../../../database/index.js';
import { formatDurationMessage } from '../../utils/function.js';

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
  execute: async ({ mentionedJidList, serial, sReply }) => {
    let targetId = mentionedJidList[0] || serial;
    const activeVIPs = await User.findActiveVIPs();
    const vipUser = activeVIPs.find(user => user.userId === targetId);
    if (!vipUser) {
      await sReply(`@${targetId.split('@')[0]} tidak memiliki status VIP aktif.`);
      return;
    }
    const remainingMs = vipUser.vipExpired - Date.now();
    const durationLeft = dayjs.duration(remainingMs);
    const durationMessage = formatDurationMessage(durationLeft);
    await sReply(`「 *VIP EXPIRE* 」\n\n➸ *ID*: @${targetId.split('@')[0]}\n➸ ${durationMessage}`);
  }
}