// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import fs from 'fs-extra';
import { delay } from 'baileys';
import config from '../../../config.js';
import { generateFakeStory } from 'generator-fake';
import { archimed } from '../../function/index.js';
import { StoreStory } from '../../../database/index.js';

export const command = {
  name: 'getstory',
  category: 'bot',
  description: 'Mengambil story dari kontak bot dan menghapusnya dari daftar.',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, toId, args, dbSettings, sReply }) => {
    if (args.length < 2) return await sReply(`Format salah.\nContoh: ${dbSettings.rname}getstory 1 1-3`);
    const userIndex = parseInt(args[0], 10);
    const ruleString = args.slice(1).join(' ');
    if (isNaN(userIndex) || userIndex <= 0) return await sReply('Nomor urut pengguna harus angka valid > 0.');
    const usersWithStories = await StoreStory.find({ 'statuses.0': { $exists: true } }).select('userId').lean();
    if (usersWithStories.length === 0) return await sReply('Tidak ada pengguna dengan story aktif di database.');
    const targetUserIndex = userIndex - 1;
    if (targetUserIndex >= usersWithStories.length) return await sReply(`Nomor urut ${userIndex} tidak valid. Hanya ada ${usersWithStories.length} pengguna dengan story.`);
    const targetJid = usersWithStories[targetUserIndex].userId;
    const storyDocument = await StoreStory.findOne({ userId: targetJid }).lean();
    if (!storyDocument || storyDocument.statuses.length === 0) return await sReply(`Pengguna @${targetJid.split('@')[0]} tidak lagi memiliki story.`, { mentions: [targetJid] });
    const allStories = storyDocument.statuses;
    const selectedStories = archimed(ruleString, allStories);
    if (selectedStories.length === 0) return await sReply(`Tidak ada story yang cocok dengan aturan "${ruleString}".`);
    await sReply(`Ditemukan ${selectedStories.length} story. Memulai pengiriman...`);
    for (const story of selectedStories) {
      if (story.type === 'extendedTextMessage') {
        const authorName = await fn.getName(story.sender) || story.pushName || 'Nama Tidak Diketahui';
        const textContent = story.body;
        let profilePicBuffer;
        try {
          const profilePicUrl = await fn.profilePictureUrl(story.sender, 'image');
          profilePicBuffer = await fn.getFile(profilePicUrl);
        } catch {
          const defaultPic = await fs.readFile(config.paths.avatar);
          profilePicBuffer = { data: defaultPic };
        }
        const resBuffer = await generateFakeStory({
          caption: textContent,
          username: authorName,
          profilePicBuffer: profilePicBuffer.data
        });
        await fn.sendMediaFromBuffer(toId, story.mime, resBuffer, story.body || '', m);
      } else if (['imageMessage', 'videoMessage', 'audioMessage'].includes(story.type)) {
        const asu = JSON.parse(JSON.stringify(story));
        const mediaBuffer = await fn.getMediaBuffer(asu.message);
        await fn.sendMediaFromBuffer(toId, story.mime, mediaBuffer, story.body || '', m);
      }
      await StoreStory.updateOne(
        { userId: targetJid },
        { $pull: { statuses: { 'key.id': story.key.id } } }
      );
      await delay(1500);
    }
    await sReply(`Selesai mengirim dan menghapus ${selectedStories.length} story dari @${targetJid.split('@')[0]}.`);
  }
};