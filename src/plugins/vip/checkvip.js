// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { User } from '../../../database/index.js';
import { formatDurationMessage } from '../../lib/function.js';
import dayjs from '../../utils/dayjs.js';

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
    await sReply(`「 *VIP EXPIRE* 」\n\n*ID*: @${targetId.split('@')[0]}\n${durationMessage}`);
  }
}