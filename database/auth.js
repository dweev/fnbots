// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info auth.js ────────────────────────

import mongoose from 'mongoose';
import { BufferJSON, initAuthCreds, proto } from 'baileys';
import Contact from '../src/models/StoreContact.js';
import { Mutex } from 'async-mutex';
import log from '../src/utils/logger.js';

const ACQUIRE_TIMEOUT = 5000;
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

export async function AuthStore() {
  const writeData = async (key, data) => {
    const value = JSON.stringify(data, BufferJSON.replacer);
    await BaileysSession.findOneAndUpdate({ key }, { value }, { upsert: true });
  };
  const readData = async (key) => {
    const session = await BaileysSession.findOne({ key }).lean();
    if (!session) return null;
    return JSON.parse(session.value, BufferJSON.reviver);
  };
  const writeBatch = async (items) => {
    const operations = Object.entries(items).map(([key, value]) => {
      const BSONValue = JSON.stringify(value, BufferJSON.replacer);
      return {
        updateOne: {
          filter: { key },
          update: { $set: { value: BSONValue } },
          upsert: true,
        },
      };
    });
    await BaileysSession.bulkWrite(operations);
  };
  const removeBatch = async (keys) => {
    if (keys.length === 0) return;
    await BaileysSession.deleteMany({ key: { $in: keys } });
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
    await log(error, true);
    creds = initAuthCreds();
  } finally {
    if (release) release();
  }
  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const keys = ids.map(id => `${type}-${id}`);
          const sessions = await BaileysSession.find({ key: { $in: keys } }).lean();
          const data = {};
          for (const session of sessions) {
            const id = session.key.replace(`${type}-`, '');
            let value = JSON.parse(session.value, BufferJSON.reviver);
            if (type === 'app-state-sync-key' && value) {
              value = proto.Message.AppStateSyncKeyData.create(value);
            }
            data[id] = value;
          }
          return data;
        },
        set: async (data) => {
          const writeItems = {};
          const removeKeys = [];
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const key = `${category}-${id}`;
              if (value) {
                if (key.startsWith('lid-mapping-')) {
                  const base = key.replace('lid-mapping-', '').replace('_reverse', '');
                  const [pn, lid] = key.endsWith('_reverse')
                    ? [String(value) + '@s.whatsapp.net', base + '@lid']
                    : [base + '@s.whatsapp.net', String(value) + '@lid'];
                  await Contact.findOneAndUpdate(
                    { jid: pn },
                    { $set: { lid: lid } },
                    { upsert: true }
                  );
                  continue;
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
          await Promise.all(promises);
        },
      },
    },
    saveCreds: async () => {
      return await writeData('creds', creds);
    },
  };
}