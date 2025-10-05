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
  log('Redis connected successfully');
});

redis.on('error', (error) => {
  log(`Error connecting to Redis: ${error}`, true);
});

export default redis;