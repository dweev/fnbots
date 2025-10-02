// ─── Info ─────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info database/auth.js ────────────────────────

import mongoose from 'mongoose';
import config from '../config.js';
import { Mutex } from 'async-mutex';
import log from '../src/lib/logger.js';
import { StoreContact } from './index.js';
import { BufferJSON, initAuthCreds, proto } from 'baileys';

const ACQUIRE_TIMEOUT = config.performance.acquireMutexInterval;
const BaileysSessionSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  }
}, {
  timestamps: true
});

BaileysSessionSchema.index({ updatedAt: -1 });

export const BaileysSession = mongoose.models.BaileysSession || mongoose.model('BaileysSession', BaileysSessionSchema);

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
    return JSON.parse(value, BufferJSON.reviver);
  } catch {
    return fallback;
  }
};

export async function AuthStore(instanceId = 'default') {
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
      const fullKey = `sessions:${instanceId}:${validKey}`;
      await BaileysSession.findOneAndUpdate({ key: fullKey }, { value: stringified }, { upsert: true });
      return true;
    } catch (error) {
      await log(`Failed to write data for key ${key}: ${error.message}`, true);
      return false;
    }
  };
  const readData = async (key) => {
    try {
      const validKey = validateKey(key);
      const fullKey = `sessions:${instanceId}:${validKey}`;
      const session = await BaileysSession.findOne({ key: fullKey }).lean();
      if (!session) return null;
      if (!session.value) return null;
      return safeJSONParse(session.value);
    } catch (error) {
      await log(`Failed to read data for key ${key}: ${error.message}`, true);
      return null;
    }
  };
  const writeBatch = async (items) => {
    try {
      const operations = Object.entries(items).map(([key, value]) => {
        const fullKey = `sessions:${instanceId}:${key}`;
        const BSONValue = JSON.stringify(value, BufferJSON.replacer);
        return {
          updateOne: {
            filter: { key: fullKey },
            update: { $set: { value: BSONValue } },
            upsert: true,
          },
        };
      });
      await BaileysSession.bulkWrite(operations);
      return true;
    } catch (error) {
      await log(`Failed to write batch data: ${error.message}`, true);
      return false;
    }
  };
  const removeBatch = async (keys) => {
    if (keys.length === 0) return true;
    try {
      const fullKeys = keys.map(key => `sessions:${instanceId}:${key}`);
      await BaileysSession.deleteMany({ key: { $in: fullKeys } });
      return true;
    } catch (error) {
      await log(`Failed to remove batch data: ${error.message}`, true);
      return false;
    }
  };
  const handleLidMapping = async (key, value) => {
    try {
      if (key.startsWith('lid-mapping-')) {
        const mappingKey = key.replace('lid-mapping-', '');
        let phoneNumber, lid;
        if (mappingKey.endsWith('_reverse')) {
          const lidNumber = mappingKey.replace('_reverse', '');
          lid = lidNumber.includes('@') ? lidNumber : lidNumber + '@lid';
          phoneNumber = value ? (String(value).includes('@') ? String(value) : String(value) + '@s.whatsapp.net') : null;
        } else {
          phoneNumber = mappingKey.includes('@') ? mappingKey : mappingKey + '@s.whatsapp.net';
          lid = value ? (String(value).includes('@') ? String(value) : String(value) + '@lid') : null;
        }
        if (phoneNumber && lid) {
          await StoreContact.findOneAndUpdate(
            { $or: [{ jid: phoneNumber }, { lid: lid }] },
            {
              $set: {
                jid: phoneNumber,
                lid: lid,
                lastUpdated: new Date()
              }
            },
            { upsert: true }
          );
          await log(`LID Mapping stored: ${phoneNumber} <-> ${lid}`);
        }
        return true;
      }
      return false;
    } catch (error) {
      await log(`Failed to handle LID mapping for key ${key}: ${error.message}`, true);
      return false;
    }
  };
  const credsMutex = new Mutex();
  let credsCache;
  let release = null;
  try {
    release = await Promise.race([
      credsMutex.acquire(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Mutex timeout')), ACQUIRE_TIMEOUT)
      )
    ]);
    credsCache = (await readData('creds')) || initAuthCreds();
  } catch (error) {
    await log(`Failed to acquire credentials: ${error.message}`, true);
    credsCache = initAuthCreds();
  } finally {
    if (release && typeof release === 'function') {
      try {
        release();
      } catch (releaseError) {
        await log(`Mutex release error: ${releaseError.message}`, true);
      }
    }
  }
  const identifyKeyType = (key) => {
    const cleaned = key.replace(`sessions:${instanceId}:`, '');
    if (cleaned === 'creds') return 'credentials';
    if (cleaned.startsWith('app-state-sync-key-')) return 'app-state';
    if (cleaned.startsWith('app-state-sync-version-')) return 'app-state-version';
    if (cleaned.startsWith('pre-key-')) return 'pre-key';
    if (cleaned.startsWith('sender-key-')) return 'sender-key';
    if (cleaned.startsWith('sender-key-memory-')) return 'sender-key-memory';
    if (cleaned.startsWith('session-')) return 'signal-session';
    if (cleaned.startsWith('lid-mapping-')) return 'lid-mapping';
    return 'unknown';
  };
  const validateAndMigrateSession = async (fromJid, toJid) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      validateJID(fromJid);
      validateJID(toJid);
      const normalizedFrom = fromJid.includes('@') ? fromJid.split('@')[0] : fromJid;
      const normalizedTo = toJid.includes('@') ? toJid.split('@')[0] : toJid;
      const patterns = [
        new RegExp(`^sessions:${instanceId}:session-${normalizedFrom}$`),
        new RegExp(`^sessions:${instanceId}:session-${normalizedFrom}[:-_]`)
      ];
      const oldSessions = await BaileysSession.find({
        $or: patterns.map(pattern => ({ key: { $regex: pattern } }))
      }).session(session).lean();
      if (oldSessions.length === 0) {
        await session.abortTransaction();
        await log(`No sessions found for ${fromJid} to migrate`);
        return false;
      }
      const bulkOps = oldSessions.map(oldSession => {
        const suffix = oldSession.key.replace(`sessions:${instanceId}:session-${normalizedFrom}`, '');
        const newSessionKey = `sessions:${instanceId}:session-${normalizedTo}${suffix}`;
        return {
          updateOne: {
            filter: { key: newSessionKey },
            update: { $set: { value: oldSession.value } },
            upsert: true
          }
        };
      });
      await BaileysSession.bulkWrite(bulkOps, { session });
      await session.commitTransaction();
      await log(`Migrated ${oldSessions.length} session(s) from ${fromJid} to ${toJid}`);
      return true;
    } catch (error) {
      await session.abortTransaction();
      await log(`Failed to migrate session from ${fromJid} to ${toJid}: ${error.message}`, true);
      return false;
    } finally {
      session.endSession();
    }
  };
  const storeLIDMapping = async (lid, phoneNumber, autoMigrate = true) => {
    try {
      const normalizedLid = lid.includes('@') ? lid : lid + '@lid';
      const normalizedPN = phoneNumber.includes('@') ? phoneNumber : phoneNumber + '@s.whatsapp.net';
      await StoreContact.findOneAndUpdate(
        { $or: [{ jid: normalizedPN }, { lid: normalizedLid }] },
        {
          $set: {
            jid: normalizedPN,
            lid: normalizedLid,
            lastUpdated: new Date()
          }
        },
        { upsert: true }
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
  };
  const keyLocks = new Map();
  const acquireKeyLock = async (key) => {
    if (!keyLocks.has(key)) {
      keyLocks.set(key, new Mutex());
    }
    return await keyLocks.get(key).acquire();
  };
  return {
    state: {
      get creds() {
        return credsCache;
      },
      set creds(newCreds) {
        credsCache = newCreds;
      },
      keys: {
        get: async (type, ids) => {
          try {
            if (type === 'lid-mapping') {
              const data = {};
              const phoneNumbers = [];
              const lids = [];
              const idMapping = {};
              for (const id of ids) {
                const isReverse = id.endsWith('_reverse');
                if (isReverse) {
                  const lidNumber = id.replace('_reverse', '');
                  const lid = lidNumber.includes('@') ? lidNumber : lidNumber + '@lid';
                  lids.push(lid);
                  idMapping[lid] = id;
                } else {
                  const phoneNumber = id.includes('@') ? id : id + '@s.whatsapp.net';
                  phoneNumbers.push(phoneNumber);
                  idMapping[phoneNumber] = id;
                }
              }
              const keys = ids.map(id => `sessions:${instanceId}:${type}-${id}`);
              const sessions = await BaileysSession.find({ key: { $in: keys } }).lean();
              for (const session of sessions) {
                if (session.value) {
                  const keyParts = session.key.split(':');
                  const originalKey = keyParts.slice(2).join(':');
                  const id = originalKey.replace(`${type}-`, '');
                  const value = safeJSONParse(session.value);
                  data[id] = value;
                }
              }
              if (Object.keys(data).length === 0 && (phoneNumbers.length > 0 || lids.length > 0)) {
                const query = {};
                if (phoneNumbers.length > 0 && lids.length > 0) {
                  query.$or = [
                    { jid: { $in: phoneNumbers } },
                    { lid: { $in: lids } }
                  ];
                } else if (phoneNumbers.length > 0) {
                  query.jid = { $in: phoneNumbers };
                } else {
                  query.lid = { $in: lids };
                }
                const contacts = await StoreContact.find(query, { jid: 1, lid: 1, _id: 0 }).lean();
                for (const contact of contacts) {
                  if (contact.jid && idMapping[contact.jid] && contact.lid) {
                    data[idMapping[contact.jid]] = contact.lid.replace('@lid', '');
                  }
                  if (contact.lid && idMapping[contact.lid] && contact.jid) {
                    data[idMapping[contact.lid]] = contact.jid.replace('@s.whatsapp.net', '');
                  }
                }
              }
              return data;
            }
            const keys = ids.map(id => `sessions:${instanceId}:${type}-${id}`);
            const sessions = await BaileysSession.find({ key: { $in: keys } }).lean();
            const data = {};
            for (const session of sessions) {
              if (!session.value) continue;
              const keyParts = session.key.split(':');
              const originalKey = keyParts.slice(2).join(':');
              const id = originalKey.replace(`${type}-`, '');
              let value = safeJSONParse(session.value);
              if (type === 'app-state-sync-key' && value) {
                value = proto.Message.AppStateSyncKeyData.create(value);
              }
              data[id] = value;
            }
            return data;
          } catch (error) {
            await log(`Failed to get keys for type ${type}: ${error.message}`, true);
            return {};
          }
        },
        set: async (data) => {
          const locks = new Map();
          const writeItems = {};
          const removeKeys = [];
          try {
            for (const category in data) {
              for (const id in data[category]) {
                const key = `${category}-${id}`;
                const lockRelease = await acquireKeyLock(key);
                locks.set(key, lockRelease);
              }
            }
            for (const category in data) {
              for (const id in data[category]) {
                const value = data[category][id];
                const key = `${category}-${id}`;
                if (value) {
                  if (category === 'lid-mapping' || key.startsWith('lid-mapping-')) {
                    await handleLidMapping(key, value);
                  }
                  writeItems[key] = value;
                } else {
                  removeKeys.push(key);
                }
              }
            }
            const promises = [];
            if (Object.keys(writeItems).length > 0) promises.push(writeBatch(writeItems));
            if (removeKeys.length > 0) promises.push(removeBatch(removeKeys));
            const results = await Promise.all(promises);
            const success = results.every(result => result === true);
            if (!success) {
              await log('Some batch operations failed', true);
            }
          } catch (error) {
            await log(`Failed to set keys: ${error.message}`, true);
            throw error;
          } finally {
            for (const [key, release] of locks) {
              try {
                if (release && typeof release === 'function') {
                  release();
                }
              } catch {
                await log(`Failed to release lock for ${key}`, true);
              }
            }
          }
        },
      },
    },
    saveCreds: async () => {
      const release = await credsMutex.acquire();
      try {
        const success = await writeData('creds', credsCache);
        if (!success) {
          throw new Error('Failed to save credentials');
        }
        return success;
      } finally {
        if (release && typeof release === 'function') {
          try {
            release();
          } catch (releaseError) {
            await log(`Mutex release error in saveCreds: ${releaseError.message}`, true);
          }
        }
      }
    },
    clearSession: async () => {
      try {
        await BaileysSession.deleteMany({
          key: { $regex: `^sessions:${instanceId}:` }
        });
        await log(`Session cleared successfully for instance: ${instanceId}`, false);
        return true;
      } catch (error) {
        await log(`Failed to clear session for instance ${instanceId}: ${error.message}`, true);
        return false;
      }
    },
    getLidMappings: async () => {
      try {
        return await StoreContact.find({}, { jid: 1, lid: 1, lastUpdated: 1 }).lean();
      } catch (error) {
        await log(`Failed to get LID mappings: ${error.message}`, true);
        return [];
      }
    },
    getPNForLID: async (lid) => {
      try {
        const normalizedLid = lid.includes('@') ? lid : lid + '@lid';
        const contact = await StoreContact.findOne({ lid: normalizedLid }).lean();
        if (contact?.jid) {
          await log(`LID ${lid} mapped to ${contact.jid}`);
          return contact.jid;
        }
        await log(`No mapping found for LID: ${lid}`, true);
        return null;
      } catch (error) {
        await log(`Failed to get PN for LID ${lid}: ${error.message}`, true);
        return null;
      }
    },
    getLIDForPN: async (phoneNumber) => {
      try {
        const normalizedPN = phoneNumber.includes('@') ? phoneNumber : phoneNumber + '@s.whatsapp.net';
        const contact = await StoreContact.findOne({ jid: normalizedPN }).lean();
        if (contact?.lid) {
          await log(`Phone ${phoneNumber} mapped to ${contact.lid}`);
          return contact.lid;
        }
        await log(`No LID found for phone: ${phoneNumber}`, true);
        return null;
      } catch (error) {
        await log(`Failed to get LID for PN ${phoneNumber}: ${error.message}`, true);
        return null;
      }
    },
    getSessionStats: async () => {
      try {
        const stats = await BaileysSession.aggregate([
          { $match: { key: { $regex: `^sessions:${instanceId}:` } } },
          {
            $group: {
              _id: {
                $substr: [
                  '$key',
                  { $add: [{ $strLenCP: `sessions:${instanceId}:` }, 0] },
                  {
                    $indexOfCP: [
                      { $substr: ['$key', { $strLenCP: `sessions:${instanceId}:` }, -1] },
                      '-'
                    ]
                  }
                ]
              },
              count: { $sum: 1 }
            }
          }
        ]);
        return stats;
      } catch (error) {
        await log(`Failed to get session stats for instance ${instanceId}: ${error.message}`, true);
        return [];
      }
    },
    validateAndMigrateSession,
    storeLIDMapping,
    identifyKeyType
  };
};