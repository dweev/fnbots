// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { SESSION_TIMEOUT } from '../../function/index.js';

export const command = {
  name: 'chatbot',
  category: 'ai',
  description: 'Toggle chatbots for log chats with AI',
  isLimitCommand: true,
  execute: async ({ args, dbSettings, chatBots, serial, sReply }) => {
    const mode = (args[0] || '').toLowerCase();
    if (!['on', 'off'].includes(mode)) return await sReply(`Pilihan tidak valid. Gunakan ${dbSettings.rname}chatbot on atau ${dbSettings.rname}chatbot off`);
    if (mode === 'on') {
      if (chatBots[serial]) clearTimeout(chatBots[serial]);
      chatBots[serial] = setTimeout(() => {
        delete chatBots[serial];
      }, SESSION_TIMEOUT);
      await sReply(`✅ Chatbot AI telah diaktifkan!\nKetik pesan apa saja untuk memulai percakapan.\n\nKetik ${dbSettings.rname}chatbot off untuk menonaktifkan.`);
    } else {
      if (chatBots[serial]) {
        clearTimeout(chatBots[serial]);
        delete chatBots[serial];
      };
      await sReply('✅ Chatbot AI telah dinonaktifkan.');
    };
  }
};