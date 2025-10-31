// ─── Info ────────────────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── info src/function/chatbot.js ────────────────────

import log from '../lib/logger.js';
import config from '../../config.js';
import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import { HarmBlockThreshold, HarmCategory } from '@google/generative-ai';

export const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE }
];
export const SESSION_TIMEOUT = 5 * 60 * 1000;
export function getSession(jid, sessions) {
  if (!sessions[jid]) {
    try {
      const pythonPath = config.paths.pythonPath;
      const pyScript = config.paths.pyScript;
      const py = spawn(pythonPath, [pyScript]);
      const sessionEmitter = new EventEmitter();
      sessionEmitter.setMaxListeners(2000);
      let stdoutBuffer = '';
      py.stdout.on('data', (data) => {
        stdoutBuffer += data.toString();
        if (stdoutBuffer.endsWith('\n')) {
          sessionEmitter.emit('message', stdoutBuffer.trim());
          stdoutBuffer = '';
        }
      });
      py.stderr.on('data', (data) => {
        sessionEmitter.emit('error_message', data.toString());
      });
      py.on('close', () => {
        clearTimeout(sessions[jid]?.timer);
        delete sessions[jid];
      });
      py.on('error', (error) => {
        log(`Gagal memulai/menjalankan proses Python untuk ${jid}:\n${error}`, true);
        clearTimeout(sessions[jid]?.timer);
        delete sessions[jid];
      });
      sessions[jid] = {
        py: py,
        emitter: sessionEmitter,
        timer: null
      };
    } catch (error) {
      log(`Error getSession untuk ${jid}:\n${error}`, true);
      return null;
    }
  }
  clearTimeout(sessions[jid].timer);
  sessions[jid].timer = setTimeout(() => {
    sessions[jid].py.kill();
  }, SESSION_TIMEOUT);
  return sessions[jid];
}
