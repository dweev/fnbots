// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import dayjs from '../../utils/dayjs.js';
import { User } from '../../../database/index.js';
import { formatDurationMessage } from '../../function/index.js';

export const command = {
  name: 'checkpremium',
  category: 'premium',
  description: 'Memeriksa apakah user memiliki benefit premium atau tidak',
  aliases: ['cekpremium', 'cekprem'],
  isCommandWithoutPayment: true,
  execute: async ({ mentionedJidList, serial, sReply }) => {
    const targetId = mentionedJidList[0] || serial;
    const activePrems = await User.findActivePremiums();
    const premiumUser = activePrems.find((user) => user.userId === targetId);
    if (!premiumUser) {
      await sReply(`@${targetId.split('@')[0]} tidak memiliki status Premium aktif.`);
      return;
    }
    const remainingMs = premiumUser.premiumExpired - Date.now();
    const durationLeft = dayjs.duration(remainingMs);
    const durationMessage = formatDurationMessage(durationLeft);
    await sReply(`「 *PREMIUM EXPIRE* 」\n\n*ID*: @${targetId.split('@')[0]}\n${durationMessage}`);
  }
};
