// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info worker_manager.js ──────────────

import Piscina from 'piscina';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const maxThreads = Math.max(1, os.cpus().length - 1);

export const stickerPool = new Piscina({
  filename: path.resolve(__dirname, 'sticker_worker.js'),
  minThreads: 1,
  maxThreads: maxThreads,
  idleTimeout: 60000
});

export const audioPool = new Piscina({
  filename: path.resolve(__dirname, 'audio_changer_worker.js'),
  minThreads: 1,
  maxThreads: maxThreads,
  idleTimeout: 60000
});