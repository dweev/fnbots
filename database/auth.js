// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info auth.js ────────────────────────

import mongoose from 'mongoose';
import config from '../config.js';
import { Mutex } from 'async-mutex';
import log from '../src/lib/logger.js';
import StoreContact from '../src/models/StoreContact.js';
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

export const BaileysSession = mongoose.models.BaileysSession || mongoose.model('BaileysSession', BaileysSessionSchema);

export async function AuthStore(instanceId = 'default') {
  const writeData = async (key, data) => {
    try {
      const fullKey = `sessions:${instanceId}:${key}`;
      const value = JSON.stringify(data, BufferJSON.replacer);
      await BaileysSession.findOneAndUpdate({ key: fullKey }, { value }, { upsert: true });
      return true;
    } catch (error) {
      await log(`Failed to write data for key ${key}: ${error.message}`, true);
      return false;
    }
  };
  const readData = async (key) => {
    try {
      const fullKey = `sessions:${instanceId}:${key}`;
      const session = await BaileysSession.findOne({ key: fullKey }).lean();
      if (!session) return null;
      if (!session.value) return null;
      return JSON.parse(session.value, BufferJSON.reviver);
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
          lid = lidNumber + '@lid';
          phoneNumber = value ? String(value) + '@s.whatsapp.net' : null;
        } else {
          phoneNumber = mappingKey + '@s.whatsapp.net';
          lid = value ? String(value) + '@lid' : null;
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
  let release, creds;
  try {
    release = await Promise.race([
      credsMutex.acquire(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Mutex timeout')), ACQUIRE_TIMEOUT)
      )
    ]);
    creds = (await readData('creds')) || initAuthCreds();
  } catch (error) {
    await log(`Failed to acquire credentials: ${error.message}`, true);
    creds = initAuthCreds();
  } finally {
    if (release) release();
  }
  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          try {
            const keys = ids.map(id => `sessions:${instanceId}:${type}-${id}`);
            const sessions = await BaileysSession.find({ key: { $in: keys } }).lean();
            const data = {};
            for (const session of sessions) {
              if (!session.value) continue;
              const keyParts = session.key.split(':');
              const originalKey = keyParts.slice(2).join(':');
              const id = originalKey.replace(`${type}-`, '');
              let value = JSON.parse(session.value, BufferJSON.reviver);
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
          try {
            const writeItems = {};
            const removeKeys = [];
            for (const category in data) {
              for (const id in data[category]) {
                const value = data[category][id];
                const key = `${category}-${id}`;
                if (value) {
                  const isLidMapping = await handleLidMapping(key, value);
                  if (!isLidMapping) {
                    writeItems[key] = value;
                  }
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
          }
        },
      },
    },
    saveCreds: async () => {
      try {
        const success = await writeData('creds', creds);
        if (!success) {
          throw new Error('Failed to save credentials');
        }
        return success;
      } catch (error) {
        await log(`Failed to save credentials: ${error.message}`, true);
        throw error;
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
    }
  };
}