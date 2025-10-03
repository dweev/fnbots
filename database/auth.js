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
      await BaileysSession.findOneAndUpdate(
        { key: fullKey },
        { value: stringified },
        { upsert: true }
      );
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
  const backupLIDMapping = async (id, value) => {
    try {
      let phoneNumber, lid;
      if (id.endsWith('_reverse')) {
        const lidNumber = id.replace('_reverse', '');
        lid = lidNumber.includes('@') ? lidNumber : lidNumber + '@lid';
        phoneNumber = value ? (value.includes('@') ? value : value + '@s.whatsapp.net') : null;
      } else {
        phoneNumber = id.includes('@') ? id : id + '@s.whatsapp.net';
        lid = value ? (value.includes('@') ? value : value + '@lid') : null;
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
        await log(`LID Mapping backed up to StoreContact: ${phoneNumber} <-> ${lid}`);
        return true;
      }
      return false;
    } catch (error) {
      await log(`Failed to backup LID mapping: ${error.message}`, true);
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
  const keyLocks = new Map();
  const acquireKeyLock = async (key) => {
    if (!keyLocks.has(key)) {
      keyLocks.set(key, new Mutex());
    }
    return await keyLocks.get(key).acquire();
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
      await log(`LID Mapping stored manually: ${normalizedPN} <-> ${normalizedLid}`);
      if (autoMigrate) {
        await validateAndMigrateSession(normalizedPN, normalizedLid);
      }
      return true;
    } catch (error) {
      await log(`Failed to store LID mapping: ${error.message}`, true);
      return false;
    }
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
              const keys = ids.map(id => `sessions:${instanceId}:${type}-${id}`);
              const sessions = await BaileysSession.find({ key: { $in: keys } }).lean();
              const data = {};
              for (const session of sessions) {
                if (session.value) {
                  const keyParts = session.key.split(':');
                  const originalKey = keyParts.slice(2).join(':');
                  const id = originalKey.replace(`${type}-`, '');
                  const value = safeJSONParse(session.value);
                  data[id] = typeof value === 'string' ? value : null;
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
                    const lid = lidNumber.includes('@') ? lidNumber : lidNumber + '@lid';
                    lids.push(lid);
                    idMapping[lid] = id;
                  } else {
                    const phoneNumber = id.includes('@') ? id : id + '@s.whatsapp.net';
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
                      await log(`Fallback from StoreContact: ${contact.jid} -> ${lidValue}`);
                    }
                    if (contact.lid && idMapping[contact.lid] && contact.jid) {
                      const pnValue = contact.jid.replace('@s.whatsapp.net', '');
                      data[idMapping[contact.lid]] = pnValue;
                      await log(`Fallback from StoreContact: ${contact.lid} -> ${pnValue}`);
                    }
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
                if (value !== null && value !== undefined) {
                  if (category === 'lid-mapping') {
                    if (typeof value !== 'string') {
                      await log(`Invalid lid-mapping value for ${id}, expected string got ${typeof value}`, true);
                      continue;
                    }
                    await log(`LID Mapping update: ${id} -> ${value}`);
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
        return await StoreContact.find({}, { jid: 1, lid: 1, lastUpdated: 1, _id: 0 }).lean();
      } catch (error) {
        await log(`Failed to get LID mappings: ${error.message}`, true);
        return [];
      }
    },
    getLIDForPN: async (phoneNumber) => {
      try {
        const normalizedPN = phoneNumber.includes('@') ? phoneNumber : phoneNumber + '@s.whatsapp.net';
        const contact = await StoreContact.findOne({ jid: normalizedPN }, { lid: 1, _id: 0 }).lean();
        if (contact?.lid) {
          await log(`Phone ${phoneNumber} mapped to LID ${contact.lid} (from StoreContact)`);
          return contact.lid;
        }
        const pnNumber = normalizedPN.split('@')[0];
        const key = `sessions:${instanceId}:lid-mapping-${pnNumber}`;
        const session = await BaileysSession.findOne({ key }).lean();
        if (session?.value) {
          const lid = safeJSONParse(session.value);
          if (typeof lid === 'string') {
            const fullLid = lid.includes('@') ? lid : lid + '@lid';
            await log(`Phone ${phoneNumber} mapped to LID ${fullLid} (from Baileys session)`);
            return fullLid;
          }
        }
        await log(`No LID found for phone: ${phoneNumber}`, true);
        return null;
      } catch (error) {
        await log(`Failed to get LID for PN ${phoneNumber}: ${error.message}`, true);
        return null;
      }
    },
    getPNForLID: async (lid) => {
      try {
        const normalizedLid = lid.includes('@') ? lid : lid + '@lid';
        const contact = await StoreContact.findOne({ lid: normalizedLid }, { jid: 1, _id: 0 }).lean();
        if (contact?.jid) {
          await log(`LID ${lid} mapped to phone ${contact.jid} (from StoreContact)`);
          return contact.jid;
        }
        const lidNumber = normalizedLid.split('@')[0];
        const reverseKey = `${lidNumber}_reverse`;
        const key = `sessions:${instanceId}:lid-mapping-${reverseKey}`;
        const session = await BaileysSession.findOne({ key }).lean();
        if (session?.value) {
          const pn = safeJSONParse(session.value);
          if (typeof pn === 'string') {
            const fullPN = pn.includes('@') ? pn : pn + '@s.whatsapp.net';
            await log(`LID ${lid} mapped to phone ${fullPN} (from Baileys session)`);
            return fullPN;
          }
        }
        await log(`No mapping found for LID: ${lid}`, true);
        return null;
      } catch (error) {
        await log(`Failed to get PN for LID ${lid}: ${error.message}`, true);
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
  };
};