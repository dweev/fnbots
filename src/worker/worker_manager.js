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
const maxThreads = Math.max(2, Math.floor(os.cpus().length / 2));

export const jobPool = new Piscina({
  filename: path.resolve(__dirname, 'job_worker.js'),
  minThreads: 1,
  maxThreads,
  idleTimeout: 10000,
  concurrentTasksPerWorker: 1
});

export async function runJob(type, data) {
  if (jobPool.queueSize > jobPool.maxThreads * 5) {
    throw new Error('Worker pool penuh, coba lagi nanti.');
  }
  return await jobPool.run({ type, data });
}
