// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import path from 'path';
import fs from 'fs-extra';
import config from '../../../config.js';
import ObfsMgr from '../../utils/obfuscator.js';

export const command = {
  name: 'obfuscate',
  category: 'util',
  description: 'Obfuskasi kode JavaScript untuk mengamankan kode sumber Anda',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, toId, sReply, quotedMsg, dbSettings, args, arg,  }) => {
    const obfuscator = new ObfsMgr();
    let level = 'medium';
    let pass = dbSettings.botname + '-Obfuscator';
    let codeToObfuscate = '';
    let outputFileName = 'obfuscated.js';
    const validLevels = ['low', 'medium', 'high', 'extreme'];
    if (quotedMsg && quotedMsg?.documentMessage) {
      const mime = quotedMsg?.documentMessage?.mimetype || '';
      if (!mime.startsWith('application/javascript')) return await sReply("Tipe media tidak didukung. Harap reply file .js");
      const buffer = await fn.getMediaBuffer(quotedMsg);
      codeToObfuscate = buffer.toString('utf8');
      outputFileName = `obfuscated-${quotedMsg?.documentMessage.title || 'file.js'}`;
      if (args[0] && validLevels.includes(args[0].toLowerCase())) {
        level = args[0].toLowerCase();
        pass = args.slice(1).join(' ') || pass;
      } else if (args.length > 0) {
        pass = args.join(' ');
      }
    } else {
      if (quotedMsg) {
        if (args[0] && validLevels.includes(args[0].toLowerCase())) {
          level = args[0].toLowerCase();
          pass = args.slice(1).join(' ') || pass;
        } else if (args.length > 0) {
          pass = args.join(' ');
        }
        if (quotedMsg?.type === 'extendedTextMessage' || quotedMsg?.type === 'conversation') {
          codeToObfuscate = quotedMsg?.body;
        }
      } else {
        if (args.length >= 3 && validLevels.includes(args[0].toLowerCase())) {
          level = args[0].toLowerCase();
          pass = args[1];
          codeToObfuscate = args.slice(2).join(' ');
        } else if (args.length > 0) {
          codeToObfuscate = arg;
        }
      }
    }
    if (!codeToObfuscate || !codeToObfuscate.trim()) {
      const usage = `*Perintah Obfuscator JavaScript*\n\n` +
        `*Cara 1: Reply File*\n.obfuscate <level?> <pass?>\n\n` +
        `*Cara 2: Reply Teks*\n.obfuscate <level?> <pass?>\n\n` +
        `*Cara 3: Teks Langsung*\n.obfuscate <level?> <pass?> <kode...>\n\n` +
        `*Level:* low, medium, high, extreme`;
      return await sReply(usage);
    }
    const obfuscatedCode = await obfuscator.obfs({
      code: codeToObfuscate,
      level: level,
      pass: pass,
    });
    const tempFilePath = path.join(config.paths.tempDir, outputFileName);
    await fs.writeFile(tempFilePath, obfuscatedCode, 'utf-8');
    const caption = `Obfuskasi Berhasil!\n\n*Level:* ${level}\n*Password/Tag:* ${pass}`;
    await fn.sendFilePath(toId, caption, tempFilePath, { quoted: m });
  }
};