// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { generateFakeChatIphone } from 'generator-fake';
import { formatTimestampToHourMinute } from '../../function/index.js';

export const command = {
  name: 'fakechat',
  category: 'convert',
  description: 'Membuat Fake Chats',
  isCommandWithoutPayment: true,
  aliases: ['iqc'],
  execute: async ({ fn, toId, arg, sReply, dbSettings, m, quotedMsg }) => {
    let caption = '';
    if (quotedMsg && (quotedMsg?.type === 'extendedTextMessage' || quotedMsg?.type === 'conversation')) {
      caption = quotedMsg?.body;
    } else {
      if (!arg) return await sReply(`gunakan perintah seperti ${dbSettings.rname}fakechat teksnya atau balas pesan dengan perintah ${dbSettings.rname}fakechat`);
      caption = arg;
    }
    const resultBuffer = await generateFakeChatIphone({
      text: caption,
      chatTime: formatTimestampToHourMinute(m.timestamp),
      statusBarTime: "11:02"
    });
    await fn.sendMediaFromBuffer(toId, 'image/jpeg', resultBuffer, dbSettings.autocommand, m);
  }
};