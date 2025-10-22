// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import fs from 'fs-extra';
import { delay } from 'baileys';
import log from '../../lib/logger.js';
import config from '../../../config.js';
import { generateFakeStory } from 'generator-fake';
import { archimed } from '../../function/index.js';

export const command = {
  name: 'getstory',
  category: 'bot',
  description: 'Mengambil story dari kontak bot dan menghapusnya dari daftar.',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, toId, args, dbSettings, sReply, store }) => {
    if (args.length < 2) return await sReply(`Format salah.\nContoh: ${dbSettings.rname}getstory 1 1-3`);
    const userIndex = parseInt(args[0], 10);
    const ruleString = args.slice(1).join(' ');
    if (isNaN(userIndex) || userIndex <= 0) return await sReply('Nomor urut pengguna harus angka valid > 0.');
    const usersWithStories = await store.getUsersWithStories();
    if (usersWithStories.length === 0) return await sReply('Tidak ada pengguna dengan story aktif di database.');
    const targetUserIndex = userIndex - 1;
    if (targetUserIndex >= usersWithStories.length) return await sReply(`Nomor urut ${userIndex} tidak valid. Hanya ada ${usersWithStories.length} pengguna dengan story.`);
    const targetJid = usersWithStories[targetUserIndex].userId;
    const allStories = await store.getStatuses(targetJid);
    if (!allStories || allStories.length === 0) return await sReply(`Pengguna @${targetJid.split('@')[0]} tidak lagi memiliki story.`);
    const selectedStories = archimed(ruleString, allStories);
    if (selectedStories.length === 0) return await sReply(`Tidak ada story yang cocok dengan aturan "${ruleString}".`);
    const sentMessageIds = [];
    for (const story of selectedStories) {
      if (story.type === 'extendedTextMessage') {
        const authorName = await fn.getName(story.sender) || story.pushName || 'Nama Tidak Diketahui';
        const textContent = story.body;
        let profilePicBuffer;
        try {
          profilePicBuffer = await fn.profileImageBuffer(story.sender, 'image');
        } catch {
          profilePicBuffer = await fs.readFile(config.paths.avatar);
        }
        const resBuffer = await generateFakeStory({
          caption: textContent,
          username: authorName,
          profilePicBuffer: profilePicBuffer
        });
        await fn.sendMediaFromBuffer(toId, 'image/png', resBuffer, story.body || '', m);
      } else if (['imageMessage', 'videoMessage', 'audioMessage'].includes(story.type)) {
        const asu = JSON.parse(JSON.stringify(story));
        const mediaBuffer = await fn.getMediaBuffer(asu.message);
        await fn.sendMediaFromBuffer(toId, story.mime, mediaBuffer, story.body || '', m);
      }
      sentMessageIds.push(story.key.id);
      await delay(1500);
    }
    if (sentMessageIds.length > 0) {
      try {
        await store.bulkDeleteStatuses(targetJid, sentMessageIds);
        log(`Deleted ${sentMessageIds.length} stories from cache and DB for ${targetJid}`);
      } catch (deleteError) {
        log(`Error deleting stories: ${deleteError.message}`, true);
      }
    }
  }
};