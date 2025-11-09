// ─── Info ────────────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info src/lib/contactManager.js ──────────────

import log from './logger.js';
import { store } from '../../database/index.js';

const EMPTY_VALUES = new Set([undefined, null, '', 'Unknown', 'Unknown?', 'unknown']);

const SOURCE_PRIORITY = {
  'contacts.upsert': 100,
  'serializeMessage': 100,
  'contacts.update': 80,
  'groups.update': 80,
  'groups.upsert': 50,
  'group-participants.update': 50,
  'messaging-history.set': 20,
  'chats.update': 20,
  'handleGroupStubMessages': 10,
  'unknown': 0
};

const updateLocks = new Map();
const pendingUpdates = new Map();

async function acquireLock(jid, timeout = 5000) {
  const startTime = Date.now();
  while (updateLocks.has(jid)) {
    if (Date.now() - startTime > timeout) {
      throw new Error(`Lock acquisition timeout for ${jid}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  updateLocks.set(jid, Date.now());
}

function releaseLock(jid) {
  updateLocks.delete(jid);
}

function isEmpty(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return EMPTY_VALUES.has(trimmed);
  }
  return true;
}

function isGoodValue(value) {
  return !isEmpty(value);
}

function getSourcePriority(source) {
  return SOURCE_PRIORITY[source] || 0;
}

function chooseBetterValue(newValue, existingValue, newSource, existingSource) {
  const newIsGood = isGoodValue(newValue);
  const existingIsGood = isGoodValue(existingValue);
  if (newIsGood && !existingIsGood) {
    return { value: newValue, source: newSource };
  }
  if (!newIsGood && existingIsGood) {
    return { value: existingValue, source: existingSource };
  }
  if (newIsGood && existingIsGood) {
    const newPriority = getSourcePriority(newSource);
    const existingPriority = getSourcePriority(existingSource);
    if (newPriority > existingPriority) {
      return { value: newValue, source: newSource };
    } else if (newPriority < existingPriority) {
      return { value: existingValue, source: existingSource };
    } else {
      return { value: newValue, source: newSource };
    }
  }
  return { value: newValue, source: newSource };
}

function cleanupStaleLocks(maxAge = 30000) {
  const now = Date.now();
  let cleaned = 0;
  for (const [jid, timestamp] of updateLocks.entries()) {
    if (now - timestamp > maxAge) {
      updateLocks.delete(jid);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    log(`Cleaned up ${cleaned} stale locks`);
  }
}

export async function updateContact(jid, data = {}, source = 'unknown') {
  if (!jid || typeof jid !== 'string' || !jid.endsWith('@s.whatsapp.net')) {
    return;
  }
  try {
    await acquireLock(jid);
    const existingContact = await store.getContact(jid);
    const mergedData = {};
    if ('name' in data) {
      const result = chooseBetterValue(data.name, existingContact?.name, source, existingContact?.lastUpdateSource || 'unknown');
      if (isGoodValue(result.value)) {
        mergedData.name = result.value;
        if (existingContact?.name && existingContact.name !== result.value) {
          await log(`Name change: "${existingContact.name}" → "${result.value}" (source: ${source})`);
        }
      }
    }
    if ('notify' in data) {
      const result = chooseBetterValue(data.notify, existingContact?.notify, source, existingContact?.lastUpdateSource || 'unknown');
      if (isGoodValue(result.value)) {
        mergedData.notify = result.value;
      }
    }
    if ('verifiedName' in data && isGoodValue(data.verifiedName)) {
      mergedData.verifiedName = data.verifiedName;
    }
    if (data.lid) {
      mergedData.lid = data.lid;
    }
    if (Object.keys(mergedData).length > 0) {
      mergedData.lastUpdateSource = source;
      mergedData.lastUpdateTime = new Date();
    }
    if (Object.keys(mergedData).length === 0) {
      return;
    }
    if (pendingUpdates.has(jid)) {
      const existing = pendingUpdates.get(jid);
      pendingUpdates.set(jid, { ...existing, ...mergedData });
    } else {
      pendingUpdates.set(jid, mergedData);
    }
    const finalData = pendingUpdates.get(jid);
    pendingUpdates.delete(jid);
    await store.updateContact(jid, finalData, source);
  } catch (error) {
    await log(error, true);
  } finally {
    releaseLock(jid);
  }
}

export async function batchUpdateContacts(contacts, source = 'unknown') {
  if (!contacts || contacts.length === 0) return;
  const validContacts = contacts.filter(({ jid }) => jid && typeof jid === 'string' && jid.endsWith('@s.whatsapp.net'));
  if (validContacts.length === 0) return;
  const updatePromises = validContacts.map(({ jid, data }) =>
    updateContact(jid, data, source).catch((err) => {
      log(`Batch update failed for ${jid}: ${err.message}`, true);
    })
  );
  await Promise.allSettled(updatePromises);
}

export async function batchProcessContactUpdates(contacts, source = 'unknown') {
  if (!contacts || contacts.length === 0) return;
  const personalContacts = contacts.filter((contact) => contact && contact.id && contact.id.endsWith('@s.whatsapp.net'));
  if (personalContacts.length === 0) return;
  const resolvePromises = personalContacts.map(async (contact) => {
    const idFromEvent = contact.id;
    const trueJid = await store.resolveJid(idFromEvent);
    if (!trueJid || !trueJid.endsWith('@s.whatsapp.net')) return null;
    const dataToUpdate = {};
    if ('name' in contact) {
      dataToUpdate.name = contact.name;
    }
    if ('notify' in contact) {
      dataToUpdate.notify = contact.notify;
    }
    if ('verifiedName' in contact) {
      dataToUpdate.verifiedName = contact.verifiedName;
    }
    if (idFromEvent.endsWith('@lid')) {
      dataToUpdate.lid = idFromEvent;
    }
    if (contact.lid) {
      dataToUpdate.lid = contact.lid;
    }
    if (Object.keys(dataToUpdate).length === 0) {
      return null;
    }
    return { jid: trueJid, data: dataToUpdate };
  });
  const resolved = await Promise.all(resolvePromises);
  const validContacts = resolved.filter((c) => c !== null);
  if (validContacts.length > 0) {
    await batchUpdateContacts(validContacts, source);
  }
}

setInterval(() => cleanupStaleLocks(), 5 * 60 * 1000);
