// ─── Info ─────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info database/auth.js ────────────────────────

import log from '../src/lib/logger.js';
import { StoreContact, redis } from './index.js';
import { BufferJSON, initAuthCreds, proto } from 'baileys';

const BACKUP_CREDS_KEY = 'creds:backup';
const RETRY_COUNT_KEY = 'session:retry_count';
const REDIS_LOCK_TTL = 10;
const REDIS_PREFIX = {
  LOCK: 'lock:auth:',
  CREDS: 'creds'
};

const validateKey = (key) => {
  if (typeof key !== 'string' || !key.trim()) {
    throw new Error('Invalid key: must be non-empty string');
  }
  if (key.length > 500) {
    throw new Error('Key too long');
  }
  return key.trim();
};
const safeJSONParse = (value, fallback = null) => {
  try {
    if (value === null) return fallback;
    return JSON.parse(value, BufferJSON.reviver);
  } catch {
    return fallback;
  }
};
const acquireRedisLock = async (key, ttl = REDIS_LOCK_TTL) => {
  const lockKey = `${REDIS_PREFIX.LOCK}${key}`;
  const lockValue = `${Date.now()}-${Math.random()}`;
  const maxRetries = 30;
  const retryDelay = 150;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const acquired = await redis.set(lockKey, lockValue, 'NX', 'EX', ttl);
      if (acquired === 'OK') {
        return async () => {
          try {
            const currentValue = await redis.get(lockKey);
            if (currentValue === lockValue) {
              await redis.del(lockKey);
            }
          } catch (error) {
            log(`Failed to release lock ${key}: ${error.message}`, true);
          }
        };
      }
    } catch (error) {
      log(`Lock acquisition error for ${key}: ${error.message}`, true);
    }
    await new Promise(resolve => setTimeout(resolve, retryDelay));
  }
  throw new Error(`Failed to acquire lock for ${key} after ${maxRetries} retries`);
};
const writeData = async (key, data) => {
  try {
    const validKey = validateKey(key);
    const stringified = JSON.stringify(data, BufferJSON.replacer);
    if (stringified.length > 16 * 1024 * 1024) {
      throw new Error('Data too large');
    }
    await redis.set(validKey, stringified);
    return true;
  } catch (error) {
    await log(`Failed to write Redis data for key ${key}: ${error.message}`, true);
    return false;
  }
};
const readData = async (key) => {
  try {
    const validKey = validateKey(key);
    const data = await redis.get(validKey);
    return safeJSONParse(data);
  } catch (error) {
    await log(`Failed to read Redis data for key ${key}: ${error.message}`, true);
    return null;
  }
};
const removeData = async (key) => {
  try {
    await redis.del(key);
    return true;
  } catch (error) {
    await log(`Failed to remove Redis data for key ${key}: ${error.message}`, true);
    return false;
  }
};
const getRetryCount = async () => {
  try {
    const count = await redis.get(RETRY_COUNT_KEY);
    return count ? parseInt(count) : 0;
  } catch {
    return 0;
  }
};
const incrementRetryCount = async () => {
  try {
    await redis.incr(RETRY_COUNT_KEY);
    await redis.expire(RETRY_COUNT_KEY, 3600);
  } catch (error) {
    await log(`Failed to increment retry count: ${error.message}`, true);
  }
};
const resetRetryCount = async () => {
  try {
    await redis.del(RETRY_COUNT_KEY);
  } catch (error) {
    await log(`Failed to reset retry count: ${error.message}`, true);
  }
};
const storeLIDMapping = async () => {
  try {
    const stream = redis.scanStream({ match: 'lid-mapping-*', count: 100 });
    const updates = [];
    stream.on('data', async (keys) => {
      for (const key of keys) {
        const id = key.replace('lid-mapping-', '');
        const value = await readData(key);
        if (!value || typeof value !== 'string') continue;
        let phoneNumber, lid;
        if (id.endsWith('_reverse')) {
          const lidNumber = id.replace('_reverse', '');
          lid = lidNumber.includes('@') ? lidNumber : `${lidNumber}@lid`;
          phoneNumber = value.includes('@') ? value : `${value}@s.whatsapp.net`;
        } else {
          phoneNumber = id.includes('@') ? id : `${id}@s.whatsapp.net`;
          lid = value.includes('@') ? value : `${value}@lid`;
        }
        updates.push({ phoneNumber, lid });
      }
    });
    stream.on('error', (err) => {
      log(`Redis scan error: ${err.message}`, true);
    });
    await new Promise((resolve, reject) => {
      stream.on('end', resolve);
      stream.on('error', reject);
    });
    if (updates.length > 0) {
      const jids = updates.map(u => u.phoneNumber);
      const existingContacts = await StoreContact.find(
        { jid: { $in: jids } },
        { jid: 1, lid: 1, _id: 0 }
      ).lean();
      const existingMap = new Map(
        existingContacts.map(c => [c.jid, c.lid])
      );
      const needsSync = updates.filter(({ phoneNumber, lid }) => {
        const existingLid = existingMap.get(phoneNumber);
        return !existingLid || existingLid !== lid;
      });
      if (needsSync.length > 0) {
        const bulkOps = needsSync.map(({ phoneNumber, lid }) => ({
          updateOne: {
            filter: { jid: phoneNumber },
            update: {
              $setOnInsert: { jid: phoneNumber, createdAt: new Date() },
              $set: { lid, lastUpdated: new Date() }
            },
            upsert: true
          }
        }));
        const result = await StoreContact.bulkWrite(bulkOps, { ordered: false });
        const totalSynced = result.upsertedCount + result.modifiedCount;
        if (totalSynced > 0) {
          await log(`Synced ${totalSynced}/${updates.length} lid-mappings (${updates.length - totalSynced} skipped)`);
        }
      } else {
        await log(`All ${updates.length} lid-mappings already synced`);
      }
    }
  } catch (error) {
    await log(`Failed to sync lid-mappings: ${error.message}`, true);
  }
};

export default async function AuthStore() {
  const creds = (await readData(REDIS_PREFIX.CREDS)) || initAuthCreds();
  const backupCredsToRedis = async () => {
    try {
      await writeData(BACKUP_CREDS_KEY, creds);
      return true;
    } catch (error) {
      await log(`Failed to backup creds: ${error.message}`, true);
      return false;
    }
  };
  const restoreCredsFromBackup = async () => {
    try {
      const backupCreds = await readData(BACKUP_CREDS_KEY);
      if (!backupCreds) {
        await log('No backup credentials found', true);
        return false;
      }
      Object.keys(creds).forEach(key => delete creds[key]);
      Object.assign(creds, backupCreds);
      await writeData(REDIS_PREFIX.CREDS, creds);
      await log('Credentials restored from backup');
      return true;
    } catch (error) {
      await log(`Failed to restore creds from backup: ${error.message}`, true);
      return false;
    }
  };
  const clearSessionKeys = async () => {
    try {
      await log('Clearing session keys (keeping creds)...');
      const stream = redis.scanStream({ match: '*', count: 100 });
      const keysToDelete = [];
      stream.on('data', (keys) => {
        keys.forEach(k => {
          if (
            k.startsWith(REDIS_PREFIX.LOCK) ||
            k === REDIS_PREFIX.CREDS ||
            k === BACKUP_CREDS_KEY ||
            k === RETRY_COUNT_KEY ||
            k.startsWith('lid-mapping-')
          ) {
            return;
          }
          keysToDelete.push(k);
        });
      });
      await new Promise(resolve => stream.on('end', resolve));
      if (keysToDelete.length > 0) {
        for (let i = 0; i < keysToDelete.length; i += 1000) {
          const batch = keysToDelete.slice(i, i + 1000);
          await redis.del(batch);
        }
        await log(`Cleared ${keysToDelete.length} session keys (creds preserved)`);
      }
      return true;
    } catch (error) {
      await log(`Failed to clear session keys: ${error.message}`, true);
      return false;
    }
  };

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          try {
            const data = {};
            await Promise.all(
              ids.map(async id => {
                let value = await readData(`${type}-${id}`);
                if (type === 'app-state-sync-key' && value) {
                  value = proto.Message.AppStateSyncKeyData.create(value);
                }
                data[id] = value;
              })
            );
            return data;
          } catch (error) {
            await log(`Failed to get keys for type ${type}: ${error.message}`, true);
            return {};
          }
        },
        set: async (data) => {
          try {
            const tasks = [];
            for (const category in data) {
              for (const id in data[category]) {
                const value = data[category][id];
                const key = `${category}-${id}`;
                tasks.push(
                  value ? writeData(key, value) : removeData(key)
                );
              }
            }
            await Promise.all(tasks);
          } catch (error) {
            await log(`Failed to set keys: ${error.message}`, true);
            throw error;
          }
        },
      },
    },
    saveCreds: async () => {
      const releaseLock = await acquireRedisLock('creds', 15);
      try {
        const success = await writeData(REDIS_PREFIX.CREDS, creds);
        if (success) {
          await backupCredsToRedis();
        }
        return success;
      } catch (error) {
        await log(`Failed to save credentials: ${error.message}`, true);
        return false;
      } finally {
        await releaseLock();
      }
    },
    restoreSession: async (maxRetries = 5) => {
      try {
        const currentRetry = await getRetryCount();
        if (currentRetry >= maxRetries) {
          await log(`Max retry attempts (${maxRetries}) reached. Cannot restore session.`, true);
          return { success: false, shouldClearSession: true };
        }
        await log(`Attempting session restore (attempt ${currentRetry + 1}/${maxRetries})...`);
        await clearSessionKeys();
        const restored = await restoreCredsFromBackup();
        if (restored) {
          await incrementRetryCount();
          await log('Session keys cleared, creds restored. Flag set for session recreation...');
          return { success: true, shouldClearSession: false, attempt: currentRetry + 1 };
        }
        await incrementRetryCount();
        return { success: false, shouldClearSession: false, attempt: currentRetry + 1 };
      } catch (error) {
        await log(`Session restore failed: ${error.message}`, true);
        await incrementRetryCount();
        return { success: false, shouldClearSession: false };
      }
    },
    resetRetryAttempts: async () => {
      await resetRetryCount();
      await log('Session retry counter reset');
    },
    clearSession: async () => {
      try {
        const stream = redis.scanStream({ match: '*', count: 100 });
        const keysToDelete = [];
        stream.on('data', (keys) => {
          keys.forEach(k => {
            if (!k.startsWith(REDIS_PREFIX.LOCK)) {
              keysToDelete.push(k);
            }
          });
        });
        await new Promise(resolve => stream.on('end', resolve));
        if (keysToDelete.length > 0) {
          for (let i = 0; i < keysToDelete.length; i += 1000) {
            const batch = keysToDelete.slice(i, i + 1000);
            await redis.del(batch);
          }
        }
        await log(`Session cleared. Deleted ${keysToDelete.length} keys.`);
        await resetRetryCount();
        Object.keys(creds).forEach(key => delete creds[key]);
        Object.assign(creds, initAuthCreds());
        await writeData(REDIS_PREFIX.CREDS, creds);
        return true;
      } catch (error) {
        await log(`Failed to clear session: ${error.message}`, true);
        return false;
      }
    },
    getLidMappings: async () => {
      try {
        return await StoreContact.find({}, { jid: 1, lid: 1, lastUpdated: 1, _id: 0 }).lean();
      } catch (error) {
        await log(`Failed to get LID mappings: ${error.message}`, true);
        return [];
      }
    },
    getLIDForPN: async (phoneNumber) => {
      try {
        const normalizedPN = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@s.whatsapp.net`;
        const pnNumber = normalizedPN.split('@')[0];
        const lidFromRedis = await readData(`lid-mapping-${pnNumber}`);
        if (typeof lidFromRedis === 'string') {
          return lidFromRedis.includes('@') ? lidFromRedis : `${lidFromRedis}@lid`;
        }
        const contact = await StoreContact.findOne({ jid: normalizedPN }, { lid: 1, _id: 0 }).lean();
        return contact?.lid || null;
      } catch (error) {
        await log(`Failed to get LID for PN ${phoneNumber}: ${error.message}`, true);
        return null;
      }
    },
    getPNForLID: async (lid) => {
      try {
        const normalizedLid = lid.includes('@') ? lid : `${lid}@lid`;
        const lidNumber = normalizedLid.split('@')[0];
        const pnFromRedis = await readData(`lid-mapping-${lidNumber}_reverse`);
        if (typeof pnFromRedis === 'string') {
          return pnFromRedis.includes('@') ? pnFromRedis : `${pnFromRedis}@s.whatsapp.net`;
        }
        const contact = await StoreContact.findOne({ lid: normalizedLid }, { jid: 1, _id: 0 }).lean();
        return contact?.jid || null;
      } catch (error) {
        await log(`Failed to get PN for LID ${lid}: ${error.message}`, true);
        return null;
      }
    },
    getSessionStats: async () => {
      try {
        const stream = redis.scanStream({ match: '*', count: 100 });
        const keysByCategory = {};
        stream.on('data', (keys) => {
          keys.forEach(key => {
            if (key.startsWith(REDIS_PREFIX.LOCK)) return;
            const category = key.split('-')[0];
            keysByCategory[category] = (keysByCategory[category] || 0) + 1;
          });
        });
        await new Promise(resolve => stream.on('end', resolve));
        return Object.entries(keysByCategory)
          .map(([category, count]) => ({ _id: category, count }))
          .sort((a, b) => b.count - a.count);
      } catch (error) {
        await log(`Failed to get session stats: ${error.message}`, true);
        return [];
      }
    },
    storeLIDMapping
  };
};