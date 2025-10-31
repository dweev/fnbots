// ─── Info ───────────────────────────────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info src/worker/workers/media_processor_worker.js ──────────────

import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import log from '../../lib/logger.js';
import config from '../../../config.js';
import { fetch, parseArgsToFetchOptions, getHeader } from '../../addon/bridge.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function ({ argsArray }) {
  const { url, options } = parseArgsToFetchOptions(argsArray);
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Gagal dengan status: ${response.status}\n${errorText}`);
    }
    const bodyBuffer = await response.arrayBuffer();
    const contentType = getHeader(response.headers, 'content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        const text = bodyBuffer.toString('utf-8');
        const parsedJson = JSON.parse(text);
        return { type: 'text', content: JSON.stringify(parsedJson, null, 2) };
      } catch {
        return { type: 'text', content: bodyBuffer.toString('utf-8') };
      }
    }
    const isDirectDownload = contentType.startsWith('image/') || contentType.startsWith('audio/') || contentType.startsWith('video/') || contentType.startsWith('application/pdf') || contentType.startsWith('application/zip') || contentType.startsWith('application/octet-stream');
    if (isDirectDownload) {
      const tempDir = config.paths.tempDir;
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      let extension = '';
      try {
        const urlPath = new URL(url).pathname;
        extension = path.extname(urlPath).substring(1);
      } catch {
        // Ignore URL parsing errors
      }
      if (!extension) {
        const ctParts = contentType.split('/');
        if (ctParts.length > 1) {
          extension = ctParts[1].split(';')[0];
        }
      }
      const tempFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${extension || 'tmp'}`;
      const tempFilePath = path.join(tempDir, tempFileName);
      fs.writeFileSync(tempFilePath, bodyBuffer);
      return {
        type: 'local_file',
        path: tempFilePath
      };
    }
    if (contentType.includes('text/html')) {
      const pageContentString = bodyBuffer.toString('utf-8');
      const preMatch = pageContentString.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
      if (preMatch && preMatch[1]) {
        try {
          const jsonData = JSON.parse(preMatch[1]);
          return { type: 'text', content: JSON.stringify(jsonData, null, 2) };
        } catch {
          // If parsing fails, fall through to return raw text
        }
      }
      const videoMatch = pageContentString.match(/<video[^>]*>[\s\S]*?<source[^>]+src=["']([^"']+)["']/i);
      if (videoMatch && videoMatch[1]) {
        let src = videoMatch[1];
        try {
          src = new URL(src, url).href;
        } catch {
          // Ignore URL parsing errors
        }
        return { type: 'url', content: src };
      }
      const audioMatch = pageContentString.match(/<audio[^>]*>[\s\S]*?<source[^>]+src=["']([^"']+)["']/i);
      if (audioMatch && audioMatch[1]) {
        let src = audioMatch[1];
        try {
          src = new URL(src, url).href;
        } catch {
          // Ignore URL parsing errors
        }
        return { type: 'url', content: src };
      }
      const imageMatch = pageContentString.match(/<image[^>]*>[\s\S]*?<source[^>]+src=["']([^"']+)["']/i);
      if (imageMatch && imageMatch[1]) {
        let src = imageMatch[1];
        try {
          src = new URL(src, url).href;
        } catch {
          // Ignore URL parsing errors
        }
        return { type: 'url', content: src };
      }
      return { type: 'text', content: pageContentString };
    }
    const plainText = bodyBuffer.toString('utf-8');
    return { type: 'text', content: plainText };
  } catch (error) {
    if (error.message && error.message.includes('Gagal dengan status:')) {
      log(error.message, true);
      throw error;
    }
    const errorMessage = error.message || String(error);
    if (errorMessage.includes('curl perform error:')) {
      log(`Tidak ada respons dari server: ${errorMessage}`, true);
      throw new Error(`Tidak ada respons dari server: ${errorMessage}`);
    }
    log(`Terjadi error: ${errorMessage}`, true);
    throw new Error(`Terjadi error: ${errorMessage}`);
  }
}
