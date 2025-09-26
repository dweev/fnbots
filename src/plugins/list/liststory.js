// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { StoreStory } from '../../../database/index.js';

export const command = {
  name: 'liststory',
  category: 'list',
  description: 'Menampilkan semua daftar story dari daftar kontak bot.',
  isCommandWithoutPayment: true,
  execute: async ({ sReply, isSadmin }) => {
    if (!isSadmin) return await sReply('Perintah ini hanya untuk SAdmin.');
    const usersWithStories = await StoreStory.aggregate([
      {
        $project: {
          userId: 1,
          storyCount: { $size: "$statuses" }
        }
      },
      {
        $match: {
          storyCount: { $gt: 0 }
        }
      }
    ]);
    if (!usersWithStories || usersWithStories.length === 0) {
      return await sReply('Saat ini tidak ada pengguna yang memiliki story aktif di database.');
    }
    let replyText = '✨ *Daftar Story Pengguna Aktif*\n\n';
    usersWithStories.forEach((storyData, index) => {
      const userNumber = storyData.userId.split('@')[0];
      replyText += `${index + 1}. @${userNumber} || *${storyData.storyCount}* story\n`;
    });
    await sReply(replyText);
  },
};