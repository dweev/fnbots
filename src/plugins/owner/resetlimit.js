// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { User } from '../../../database/index.js';

export const command = {
  name: 'resetlimit',
  category: 'owner',
  description: 'Reset limit pengguna',
  isCommandWithoutPayment: true,
  execute: async ({ args, sReply, dbSettings, mentionedJidList, quotedMsg, quotedParticipant }) => {
    if (mentionedJidList && mentionedJidList.length > 0) {
      const userId = mentionedJidList[0];
      if (!userId) return await sReply('Nomor pengguna tidak valid.');
      const user = await User.findOne({ userId: userId });
      if (!user) {
        const newUser = new User({
          userId: userId,
          limit: {
            current: dbSettings.limitCount,
            warned: false
          },
          limitgame: {
            current: dbSettings.limitGame,
            warned: false
          }
        });
        await newUser.save();
        return await sReply(`Pengguna @${userId.split('@')[0]} dibuat dan limit direset.`);
      }
      user.limit.current = user.isPremium ? dbSettings.limitCountPrem : dbSettings.limitCount;
      user.limitgame.current = user.isPremium ? dbSettings.limitCountPrem : dbSettings.limitGame;
      user.limit.warned = false;
      user.limitgame.warned = false;
      await user.save();
      await sReply(`Limit untuk @${userId.split('@')[0]} berhasil direset.`);
      return;
    }
    if (args[0] === 'all') {
      const batchSize = 1000;
      let processed = 0;
      while (true) {
        const users = await User.find({}).skip(processed).limit(batchSize);
        if (users.length === 0) break;
        const bulkOps = users.map(user => ({
          updateOne: {
            filter: { _id: user._id },
            update: {
              $set: {
                'limit.current': user.isPremium ? dbSettings.limitCountPrem : dbSettings.limitCount,
                'limitgame.current': user.isPremium ? dbSettings.limitCountPrem : dbSettings.limitGame,
                'limit.warned': false,
                'limitgame.warned': false
              }
            }
          }
        }));
        await User.bulkWrite(bulkOps);
        processed += users.length;
      }
      await sReply(`Limit berhasil direset untuk ${processed} pengguna.`);
      return;
    }
    if (quotedMsg && quotedParticipant) {
      const userId = quotedParticipant;
      if (!userId) return await sReply('Nomor pengguna tidak valid.');
      const user = await User.findOne({ userId: userId });
      if (!user) {
        const newUser = new User({
          userId: userId,
          limit: {
            current: dbSettings.limitCount,
            warned: false
          },
          limitgame: {
            current: dbSettings.limitGame,
            warned: false
          }
        });
        await newUser.save();
        return await sReply(`Pengguna @${userId.split('@')[0]} dibuat dan limit direset.`);
      }
      user.limit.current = user.isPremium ? dbSettings.limitCountPrem : dbSettings.limitCount;
      user.limitgame.current = user.isPremium ? dbSettings.limitCountPrem : dbSettings.limitGame;
      user.limit.warned = false;
      user.limitgame.warned = false;
      await user.save();
      await sReply(`Limit untuk @${userId.split('@')[0]} berhasil direset.`);
      return;
    }
    let message = 'Cara penggunaan:\n';
    message += '• Reset limit user spesifik: .resetlimit @mention\n';
    message += '• Reset limit semua user: .resetlimit all\n';
    await sReply(message);
  }
};