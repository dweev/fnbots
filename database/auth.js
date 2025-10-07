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

const REDIS_LOCK_TTL = 5;
const REDIS_PREFIX = {
  LOCK: 'lock:auth:',
  CREDS: 'creds',
  LID_MAPPING: 'lid-mapping-',
  APP_STATE: 'app-state-sync-key-',
  SESSION: 'session-',
  DEDUP: 'dedup:op:',
  RESULT: 'result:op:'
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

const validateJID = (jid) => {
  if (typeof jid !== 'string') {
    throw new Error('JID must be a string');
  }
  const cleanJid = jid.split('@')[0];
  if (!/^\d+$/.test(cleanJid)) {
    throw new Error('Invalid JID format');
  }
  return jid;
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
  const maxRetries = 20;
  const retryDelay = 100;
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

const executeWithDedup = async (operationKey, operation, ttl = 2) => {
  const dedupKey = `${REDIS_PREFIX.DEDUP}${operationKey}`;
  const resultKey = `${REDIS_PREFIX.RESULT}${operationKey}`;
  const existingResult = await redis.get(resultKey);
  if (existingResult !== null) {
    return safeJSONParse(existingResult);
  }
  const lock = await acquireRedisLock(dedupKey, ttl);
  try {
    const cachedResult = await redis.get(resultKey);
    if (cachedResult !== null) {
      return safeJSONParse(cachedResult);
    }
    const result = await operation();
    const serialized = JSON.stringify(result, BufferJSON.replacer);
    await redis.setex(resultKey, ttl, serialized);
    return result;
  } finally {
    await lock();
  }
};

const writeData = async (key, data) => {
  try {
    const validKey = validateKey(key);
    let stringified;
    try {
      stringified = JSON.stringify(data, BufferJSON.replacer);
    } catch {
      throw new Error('Cannot stringify circular reference');
    }
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

const writeBatch = async (items) => {
  try {
    const pipeline = redis.pipeline();
    for (const [key, value] of Object.entries(items)) {
      const stringified = JSON.stringify(value, BufferJSON.replacer);
      pipeline.set(key, stringified);
    }
    await pipeline.exec();
    return true;
  } catch (error) {
    await log(`Failed to write batch data: ${error.message}`, true);
    return false;
  }
};

const removeBatch = async (keys) => {
  if (keys.length === 0) return true;
  try {
    await redis.del(keys);
    return true;
  } catch (error) {
    await log(`Failed to remove batch data: ${error.message}`, true);
    return false;
  }
};

const backupLIDMapping = async (id, value) => {
  try {
    let phoneNumber, lid;
    if (id.endsWith('_reverse')) {
      const lidNumber = id.replace('_reverse', '');
      lid = lidNumber.includes('@') ? lidNumber : `${lidNumber}@lid`;
      phoneNumber = value ? (value.includes('@') ? value : `${value}@s.whatsapp.net`) : null;
    } else {
      phoneNumber = id.includes('@') ? id : `${id}@s.whatsapp.net`;
      lid = value ? (value.includes('@') ? value : `${value}@lid`) : null;
    }
    if (!phoneNumber || !lid) {
      return false;
    }
    const existingByJid = await StoreContact.findOne({ jid: phoneNumber }).lean();
    const existingByLid = lid ? await StoreContact.findOne({ lid: lid }).lean() : null;
    if (existingByJid && existingByLid && existingByJid._id.toString() !== existingByLid._id.toString()) {
      await StoreContact.deleteOne({ _id: existingByLid._id });
    }
    await StoreContact.findOneAndUpdate(
      { jid: phoneNumber },
      {
        $set: {
          lid: lid,
          lastUpdated: new Date()
        }
      },
      {
        upsert: true,
        new: true
      }
    );
    return true;
  } catch (error) {
    await log(`Failed to backup LID mapping: ${error.message}`, true);
    return false;
  }
};

const validateAndMigrateSession = async (fromJid, toJid) => {
  return executeWithDedup(`migrate:${fromJid}:${toJid}`, async () => {
    try {
      validateJID(fromJid);
      validateJID(toJid);
      const normalizedFrom = fromJid.includes('@') ? fromJid.split('@')[0] : fromJid;
      const normalizedTo = toJid.includes('@') ? toJid.split('@')[0] : toJid;
      const stream = redis.scanStream({
        match: `*${normalizedFrom}*`,
        count: 100
      });
      const keysToMigrate = [];
      stream.on('data', (keys) => {
        keys.forEach(key => {
          if (key.includes(`session-${normalizedFrom}`) ||
            key.includes(`${normalizedFrom}-`) ||
            key.includes(`-${normalizedFrom}`)) {
            keysToMigrate.push(key);
          }
        });
      });
      await new Promise(resolve => stream.on('end', resolve));
      if (keysToMigrate.length === 0) {
        return false;
      }
      const values = await redis.mget(keysToMigrate);
      const pipeline = redis.pipeline();
      for (let i = 0; i < keysToMigrate.length; i++) {
        const oldKey = keysToMigrate[i];
        const value = values[i];
        if (value) {
          const newKey = oldKey.replace(normalizedFrom, normalizedTo);
          pipeline.set(newKey, value);
        }
      }
      await pipeline.exec();
      await log(`Migrated ${keysToMigrate.length} session(s) from ${fromJid} to ${toJid}`);
      return true;
    } catch (error) {
      await log(`Failed to migrate session from ${fromJid} to ${toJid}: ${error.message}`, true);
      return false;
    }
  });
};

const storeLIDMapping = async (lid, phoneNumber, autoMigrate = true) => {
  return executeWithDedup(`store:${lid}:${phoneNumber}`, async () => {
    try {
      const normalizedLid = lid.includes('@') ? lid : `${lid}@lid`;
      const normalizedPN = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@s.whatsapp.net`;
      const existingByJid = await StoreContact.findOne({ jid: normalizedPN }).lean();
      const existingByLid = await StoreContact.findOne({ lid: normalizedLid }).lean();
      if (existingByJid && existingByLid && existingByJid._id.toString() !== existingByLid._id.toString()) {
        await StoreContact.deleteOne({ _id: existingByLid._id });
      }
      await StoreContact.findOneAndUpdate(
        { jid: normalizedPN },
        {
          $set: {
            lid: normalizedLid,
            lastUpdated: new Date()
          }
        },
        {
          upsert: true,
          new: true
        }
      );
      await log(`LID Mapping stored: ${normalizedPN} <-> ${normalizedLid}`);
      if (autoMigrate) {
        await validateAndMigrateSession(normalizedPN, normalizedLid);
      }
      return true;
    } catch (error) {
      await log(`Failed to store LID mapping: ${error.message}`, true);
      return false;
    }
  });
};

export default async function AuthStore() {
  const creds = (await readData(REDIS_PREFIX.CREDS)) || initAuthCreds();
  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          try {
            if (type === 'lid-mapping') {
              const keys = ids.map(id => `${type}-${id}`);
              if (keys.length === 0) return {};
              const data = {};
              const results = await redis.mget(keys);
              for (let i = 0; i < ids.length; i++) {
                const id = ids[i];
                const value = safeJSONParse(results[i]);
                if (typeof value === 'string') {
                  data[id] = value;
                }
              }
              if (Object.keys(data).length === 0 && ids.length > 0) {
                const phoneNumbers = [];
                const lids = [];
                const idMapping = {};
                for (const id of ids) {
                  const isReverse = id.endsWith('_reverse');
                  if (isReverse) {
                    const lidNumber = id.replace('_reverse', '');
                    const lid = lidNumber.includes('@') ? lidNumber : `${lidNumber}@lid`;
                    lids.push(lid);
                    idMapping[lid] = id;
                  } else {
                    const phoneNumber = id.includes('@') ? id : `${id}@s.whatsapp.net`;
                    phoneNumbers.push(phoneNumber);
                    idMapping[phoneNumber] = id;
                  }
                }
                const query = {};
                if (phoneNumbers.length > 0 && lids.length > 0) {
                  query.$or = [
                    { jid: { $in: phoneNumbers } },
                    { lid: { $in: lids } }
                  ];
                } else if (phoneNumbers.length > 0) {
                  query.jid = { $in: phoneNumbers };
                } else if (lids.length > 0) {
                  query.lid = { $in: lids };
                }
                if (Object.keys(query).length > 0) {
                  const contacts = await StoreContact.find(query, { jid: 1, lid: 1, _id: 0 }).lean();
                  for (const contact of contacts) {
                    if (contact.jid && idMapping[contact.jid] && contact.lid) {
                      const lidValue = contact.lid.replace('@lid', '');
                      data[idMapping[contact.jid]] = lidValue;
                    }
                    if (contact.lid && idMapping[contact.lid] && contact.jid) {
                      const pnValue = contact.jid.replace('@s.whatsapp.net', '');
                      data[idMapping[contact.lid]] = pnValue;
                    }
                  }
                }
              }
              return data;
            }
            const keys = ids.map(id => `${type}-${id}`);
            if (keys.length === 0) return {};
            const data = {};
            const results = await redis.mget(keys);
            for (let i = 0; i < ids.length; i++) {
              const id = ids[i];
              let value = safeJSONParse(results[i]);
              if (type === 'app-state-sync-key' && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            }
            return data;
          } catch (error) {
            await log(`Failed to get keys from Redis for type ${type}: ${error.message}`, true);
            return {};
          }
        },
        set: async (data) => {
          const writeItems = {};
          const removeKeys = [];
          try {
            for (const category in data) {
              for (const id in data[category]) {
                const value = data[category][id];
                const key = `${category}-${id}`;
                if (value !== null && value !== undefined) {
                  if (category === 'lid-mapping') {
                    if (typeof value !== 'string') {
                      await log(`Invalid lid-mapping value for ${id}, expected string got ${typeof value}`, true);
                      continue;
                    }
                    backupLIDMapping(id, value).catch(err =>
                      log(`Backup LID mapping failed for ${id}: ${err.message}`, true)
                    );
                  }
                  writeItems[key] = value;
                } else {
                  removeKeys.push(key);
                }
              }
            }
            const promises = [];
            if (Object.keys(writeItems).length > 0) {
              promises.push(writeBatch(writeItems));
            }
            if (removeKeys.length > 0) {
              promises.push(removeBatch(removeKeys));
            }
            await Promise.all(promises);
          } catch (error) {
            await log(`Failed to set keys in Redis: ${error.message}`, true);
            throw error;
          }
        },
      },
    },
    saveCreds: async () => {
      const releaseLock = await acquireRedisLock('creds', 10);
      try {
        const success = await writeData(REDIS_PREFIX.CREDS, creds);
        return success;
      } catch (error) {
        await log(`Failed to save credentials: ${error.message}`, true);
        return false;
      } finally {
        await releaseLock();
      }
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
        await log(`Session cleared from Redis. Deleted ${keysToDelete.length} keys.`);
        Object.keys(creds).forEach(key => delete creds[key]);
        Object.assign(creds, initAuthCreds());
        await writeData(REDIS_PREFIX.CREDS, creds);
        return true;
      } catch (error) {
        await log(`Failed to clear session from Redis: ${error.message}`, true);
        return false;
      }
    },
    getLidMappings: async () => {
      return executeWithDedup('get-all-mappings', async () => {
        try {
          return await StoreContact.find({}, { jid: 1, lid: 1, lastUpdated: 1, _id: 0 }).lean();
        } catch (error) {
          await log(`Failed to get LID mappings: ${error.message}`, true);
          return [];
        }
      }, 10);
    },
    getLIDForPN: async (phoneNumber) => {
      return executeWithDedup(`getLIDForPN:${phoneNumber}`, async () => {
        try {
          const normalizedPN = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@s.whatsapp.net`;
          const contact = await StoreContact.findOne({ jid: normalizedPN }, { lid: 1, _id: 0 }).lean();
          if (contact?.lid) {
            return contact.lid;
          }
          const pnNumber = normalizedPN.split('@')[0];
          const key = `lid-mapping-${pnNumber}`;
          const lidFromRedis = await readData(key);
          if (typeof lidFromRedis === 'string') {
            return lidFromRedis.includes('@') ? lidFromRedis : `${lidFromRedis}@lid`;
          }
          return null;
        } catch (error) {
          await log(`Failed to get LID for PN ${phoneNumber}: ${error.message}`, true);
          return null;
        }
      }, 2);
    },
    getPNForLID: async (lid) => {
      return executeWithDedup(`getPNForLID:${lid}`, async () => {
        try {
          const normalizedLid = lid.includes('@') ? lid : `${lid}@lid`;
          const contact = await StoreContact.findOne({ lid: normalizedLid }, { jid: 1, _id: 0 }).lean();
          if (contact?.jid) {
            return contact.jid;
          }
          const lidNumber = normalizedLid.split('@')[0];
          const reverseKey = `lid-mapping-${lidNumber}_reverse`;
          const pnFromRedis = await readData(reverseKey);
          if (typeof pnFromRedis === 'string') {
            return pnFromRedis.includes('@') ? pnFromRedis : `${pnFromRedis}@s.whatsapp.net`;
          }
          return null;
        } catch (error) {
          await log(`Failed to get PN for LID ${lid}: ${error.message}`, true);
          return null;
        }
      }, 2);
    },
    getSessionStats: async () => {
      return executeWithDedup('session-stats', async () => {
        try {
          const stream = redis.scanStream({ match: '*', count: 100 });
          const keysByCategory = {};
          stream.on('data', (keys) => {
            keys.forEach(key => {
              if (key.startsWith(REDIS_PREFIX.LOCK)) return;
              const category = key.split('-')[0];
              if (!keysByCategory[category]) {
                keysByCategory[category] = 0;
              }
              keysByCategory[category]++;
            });
          });
          await new Promise(resolve => stream.on('end', resolve));
          return Object.entries(keysByCategory).map(([category, count]) => ({
            _id: category,
            count
          })).sort((a, b) => b.count - a.count);
        } catch (error) {
          await log(`Failed to get session stats: ${error.message}`, true);
          return [];
        }
      }, 5);
    },
    validateAndMigrateSession,
    storeLIDMapping,
  };
};