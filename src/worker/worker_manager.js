// ─── Info ─────────────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info src/worker/worker_manager.js ────────────

import os from 'os';
import path from 'path';
import Piscina from 'piscina';
import { fileURLToPath } from 'url';
import { signalHandler } from '../lib/signalHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const maxThreads = Math.max(2, Math.floor(os.cpus().length / 2));

let jobPool = null;
let isShuttingDown = false;

function createPool() {
  if (jobPool) return jobPool;
  jobPool = new Piscina({
    filename: path.resolve(__dirname, 'job_worker.js'),
    minThreads: 1,
    maxThreads,
    idleTimeout: 10000,
    concurrentTasksPerWorker: 1,
    maxQueue: maxThreads * 5
  });
  return jobPool;
}

function deserializeBuffer(data) {
  if (Buffer.isBuffer(data)) {
    return data;
  }
  if (data && data.type === 'Buffer' && Array.isArray(data.data)) {
    return Buffer.from(data.data);
  }
  if (data instanceof Uint8Array) {
    return Buffer.from(data);
  }
  if (data instanceof ArrayBuffer) {
    return Buffer.from(data);
  }
  if (data && typeof data === 'object') {
    const keys = Object.keys(data);
    if (keys.length > 0 && keys.every((k) => !isNaN(k))) {
      console.log('[Worker Manager] Converting object with numeric keys to Buffer');
      return Buffer.from(Object.values(data));
    }
  }
  return data;
}

export async function runJob(type, data, options = {}) {
  const { timeout = 30000, retries = 2 } = options;
  if (isShuttingDown) {
    throw new Error('Worker pool is shutting down');
  }
  const pool = createPool();
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      try {
        const result = await pool.run({ type, data }, { signal: controller.signal });
        clearTimeout(timeoutId);
        const deserializedResult = deserializeBuffer(result);
        return deserializedResult;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      lastError = error;
      if (error.name === 'AbortError') {
        throw new Error(`Job '${type}' timeout after ${timeout}ms`);
      }
      if (attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw new Error(`Job '${type}' failed after ${retries + 1} attempts: ${error.message}`);
    }
  }
  throw lastError;
}

async function shutdownPool() {
  if (!jobPool || isShuttingDown) return;
  isShuttingDown = true;
  try {
    await jobPool.destroy();
    jobPool = null;
  } catch (error) {
    console.error('Worker pool shutdown error:', error);
  } finally {
    isShuttingDown = false;
  }
}

signalHandler.register('worker-pool', shutdownPool, 50);

export function getPoolStats() {
  if (!jobPool) return null;
  return {
    queueSize: jobPool.queueSize,
    threads: jobPool.threads.length,
    completed: jobPool.completed,
    duration: jobPool.duration,
    utilization: jobPool.utilization
  };
}

export { jobPool };
