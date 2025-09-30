// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import util from 'util';
import path from 'path';
import fs from 'fs-extra';
import { tmpDir } from '../../lib/tempManager.js';
import { exec as cp_exec, spawn } from 'child_process';

const exec = util.promisify(cp_exec);

async function getVideoDuration(filePath) {
  try {
    const { stdout } = await exec(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`);
    return parseFloat(stdout.trim()) || 10;
  } catch (error) {
    console.error('Error getting video duration in worker:', error);
    return 10;
  }
}

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
    const ext = path.extname(localPath).toLowerCase();
    if (ext === '.gif' || ext === '.webp') {
      return { type: 'sticker', content: localPath };
    }
    if (ext === '.webm') {
      const tempPath = tmpDir.createTempFile('ogg');
      try {
        await exec(`ffprobe -i "${localPath}" -show_streams -select_streams a -loglevel error`);
        await exec(`ffmpeg -y -i "${localPath}" -c:a libopus -b:a 128k -ar 48000 -ac 1 -f ogg "${tempPath}"`);
      } catch {
        const duration = await getVideoDuration(localPath);
        await exec(`ffmpeg -y -i "${localPath}" -f lavfi -i anullsrc=channel_layout=mono:sample_rate=48000:duration=${duration} -c:a libopus -b:a 128k -ar 48000 -ac 1 -shortest -f ogg "${tempPath}"`);
      }
      if (fs.existsSync(tempPath) && fs.statSync(tempPath).size > 0) {
        return { type: 'ptt', content: tempPath, originalFile: localPath };
      }
      return { type: 'document', content: localPath };
    }
    return { type: 'filepath', content: localPath };
  }
  if (stdoutData.startsWith(mediaUrlPrefix)) {
    const mediaUrl = stdoutData.substring(mediaUrlPrefix.length);
    return { type: 'url', content: mediaUrl };
  }
  return { type: 'text', content: stdoutData };
}