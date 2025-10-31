// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { spawn } from 'child_process';
import log from '../../lib/logger.js';
import config from '../../../config.js';

export const command = {
  name: 'ai',
  category: 'ai',
  description: 'Ask AI something.',
  isLimitCommand: true,
  execute: async ({ quotedMsg, args, sReply }) => {
    let input;
    if ((quotedMsg && quotedMsg?.type === 'extendedTextMessage') || (quotedMsg && quotedMsg?.type === 'conversation')) {
      input = quotedMsg?.body;
    } else if (args.length > 0) {
      input = args.join(' ');
    } else {
      return await sReply('Silakan berikan pertanyaan atau balas pesan untuk ditanyakan ke AI.');
    }
    const pythonPath = config.paths.pythonPath;
    const pyScript = config.paths.g4f;
    const py = spawn(pythonPath, [pyScript, input]);
    let botResponse = '';
    let errorOutput = '';
    py.stdout.on('data', (data) => {
      botResponse += data.toString();
    });
    py.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    py.on('close', (code) => {
      if (code !== 0 || errorOutput) {
        log(`AI Script Error: ${errorOutput}`);
        sReply('Terjadi error di dalam skrip AI.');
        return;
      }
      const result = botResponse.trim();
      if (!result) {
        sReply('Model AI tidak memberikan jawaban. Coba lagi nanti.');
        return;
      }
      sReply(result);
    });
  }
};
