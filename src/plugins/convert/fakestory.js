// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import axios from 'axios';
import fs from 'fs-extra';
import config from '../../../config.js';
import { tmpDir } from '../../lib/tempManager.js';
import { generateFakeStory } from 'generator-fake';

export const command = {
  name: 'fakestory',
  category: 'convert',
  description: 'Membuat Fake Story',
  isCommandWithoutPayment: true,
  execute: async ({ fn, toId, arg, sReply, pushname, serial, dbSettings, m }) => {
    const caption = arg;
    if (!caption) return await sReply("Silakan berikan teks untuk story.");
    if (caption.length > 2048) return await sReply("Teks terlalu panjang!");
    const username = pushname;
    let ppBuffer;
    try {
      const ppUrl = await fn.profilePictureUrl(serial, 'image');
      const response = await axios.get(ppUrl, { responseType: 'arraybuffer' });
      ppBuffer = response.data;
    } catch {
      ppBuffer = await fs.readFile(config.paths.avatar);
    }
    const resultBuffer = await generateFakeStory({
      caption: caption,
      username: username,
      profilePicBuffer: ppBuffer
    });
    const tmpImagePath = await tmpDir.createTempFileWithContent(resultBuffer, 'jpg');
    await fn.sendFilePath(toId, dbSettings.autocommand, tmpImagePath, { quoted: m });
    await tmpDir.deleteFile(tmpImagePath);
  }
};