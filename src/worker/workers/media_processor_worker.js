// ─── Info ───────────────────────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info src/worker/workers/media_processor_worker.js ──────────────

import path from 'path';
import fs from 'fs-extra';
import log from '../../lib/logger.js';
import { spawn } from 'child_process';
import { fileTypeFromBuffer } from 'file-type';
import { tmpDir } from '../../lib/tempManager.js';
import { convert as convertNative } from '../../addon/bridge.js';

export default async function ({ argsArray }) {
  const stdoutData = await new Promise((resolve, reject) => {
    const scrapScript = path.resolve('./src/utils/get.js');
    const child = spawn('node', [scrapScript, ...argsArray]);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => stdout += chunk.toString());
    child.stderr.on('data', (chunk) => stderr += chunk.toString());
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Script exited with code ${code}`));
      } else {
        resolve(stdout.trim());
      }
    });
  });
  if (!stdoutData) {
    return { type: 'text', content: "Skrip tidak menghasilkan output." };
  }
  const localFilePrefix = 'LOCAL_FILE::';
  const mediaUrlPrefix = 'MEDIA_URL::';
  if (stdoutData.startsWith(localFilePrefix)) {
    const localPath = stdoutData.substring(localFilePrefix.length);
    try {
      const inputBuffer = await fs.readFile(localPath);
      const ext = path.extname(localPath).toLowerCase();
      if (ext === '.gif' || ext === '.webp') {
        return { type: 'sticker', content: inputBuffer };
      }
      if (ext === '.webm') {
        try {
          const outputBuffer = convertNative(inputBuffer, { format: 'mpeg', ptt: false });
          return { type: 'mpeg', content: outputBuffer };
        } catch (error) {
          log(`Native .webm conversion failed in worker: ${error.message}`, true);
          return { type: 'document', content: inputBuffer, mime: 'video/webm' };
        }
      }
      const fileType = await fileTypeFromBuffer(inputBuffer);
      return { type: 'media', content: inputBuffer, mime: fileType?.mime || 'application/octet-stream' };
    } finally {
      await tmpDir.deleteFile(localPath);
    }
  }
  if (stdoutData.startsWith(mediaUrlPrefix)) {
    return { type: 'url', content: stdoutData.substring(mediaUrlPrefix.length) };
  }
  return { type: 'text', content: stdoutData };
}