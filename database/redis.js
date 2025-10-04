// ─── Info ─────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info database/redis.js ───────────────────────

import Redis from 'ioredis';
import log from '../src/lib/logger.js';

const redis = new Redis();

redis.on('connect', () => {
  log('Berhasil terhubung ke server Redis.');
});

redis.on('error', (error) => {
  log(`Koneksi Redis Error: ${error}`, true);
});

export default redis;