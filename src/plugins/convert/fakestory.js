// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import fs from 'fs-extra';
import config from '../../../config.js';
import { generateFakeStory } from 'generator-fake';

export const command = {
  name: 'fakestory',
  category: 'convert',
  description: 'Membuat Fake Story',
  isCommandWithoutPayment: true,
  execute: async ({ fn, toId, arg, sReply, pushname, serial, dbSettings, m }) => {
    const caption = arg;
    if (!caption) return await sReply('Silakan berikan teks untuk story.');
    if (caption.length > 2048) return await sReply('Teks terlalu panjang!');
    const username = pushname;
    let ppBuffer;
    try {
      ppBuffer = await fn.profileImageBuffer(serial, 'image');
    } catch {
      ppBuffer = await fs.readFile(config.paths.avatar);
    }
    const resultBuffer = await generateFakeStory({
      caption: caption,
      username: username,
      profilePicBuffer: ppBuffer
    });
    await fn.sendMediaFromBuffer(toId, 'image/jpeg', resultBuffer, dbSettings.autocommand, m);
  }
};
