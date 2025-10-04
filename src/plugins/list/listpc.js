// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { StoreMessages } from '../../../database/index.js';

export const command = {
  name: 'listpc',
  category: 'list',
  description: 'Menampilkan daftar chat pribadi (PC) berdasarkan jumlah pesan konten.',
  isCommandWithoutPayment: true,
  execute: async ({ sReply, isSadmin, isMaster }) => {
    if (!(isSadmin || isMaster)) return;
    const sortedUsers = await StoreMessages.aggregate([
      {
        $match: {
          chatId: { $regex: /@s\.whatsapp\.net$/ }
        }
      },
      {
        $unwind: '$messages'
      },
      {
        $match: {
          'messages.fromMe': false,
          'messages.sender': { $exists: true }
        }
      },
      {
        $match: {
          'messages.type': { $nin: ['reactionMessage', 'protocolMessage'] }
        }
      },
      {
        $group: {
          _id: '$messages.sender',
          count: { $sum: 1 }
        }
      },
      {
        $sort: {
          count: -1
        }
      }
    ]);
    if (!sortedUsers || sortedUsers.length === 0) {
      return await sReply('Tidak ada pesan konten dari pengguna yang bisa dihitung.');
    }
    let replyText = `*Top Private Chats*\n\nTotal ${sortedUsers.length} pengguna telah mengirim pesan:\n\n`;
    sortedUsers.forEach((user, index) => {
      const jid = user._id;
      const count = user.count;
      const userNumber = jid.split('@')[0];
      replyText += `${index + 1}. @${userNumber} → *${count}* pesan\n`;
    });
    await sReply(replyText);
  },
};