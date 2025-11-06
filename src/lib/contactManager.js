// ─── Info ────────────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info src/lib/contactManager.js ──────────────

import log from './logger.js';
import { store } from '../../database/index.js';

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

export async function updateContact(jid, data = {}, source = 'unknown') {
  if (!jid || typeof jid !== 'string' || !jid.endsWith('@s.whatsapp.net')) {
    return;
  }
  try {
    await acquireLock(jid);
    if (pendingUpdates.has(jid)) {
      const existing = pendingUpdates.get(jid);
      pendingUpdates.set(jid, { ...existing, ...data });
    } else {
      pendingUpdates.set(jid, data);
    }
    const mergedData = pendingUpdates.get(jid);
    pendingUpdates.delete(jid);
    await store.updateContact(jid, mergedData, source);
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
    const nameToUpdate = contact.notify || contact.name || contact.verifiedName;
    if (idFromEvent.endsWith('@lid')) {
      dataToUpdate.lid = idFromEvent;
    }
    if (contact.lid) {
      dataToUpdate.lid = contact.lid;
    }
    if (nameToUpdate) {
      dataToUpdate.name = nameToUpdate;
      dataToUpdate.notify = nameToUpdate;
    }
    if (contact.verifiedName) {
      dataToUpdate.verifiedName = contact.verifiedName;
    }
    if (Object.keys(dataToUpdate).length === 0) {
      dataToUpdate.jid = trueJid;
      dataToUpdate.name = '';
    }
    return { jid: trueJid, data: dataToUpdate };
  });
  const resolved = await Promise.all(resolvePromises);
  const validContacts = resolved.filter((c) => c !== null);
  if (validContacts.length > 0) {
    await batchUpdateContacts(validContacts, source);
  }
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

setInterval(() => cleanupStaleLocks(), 5 * 60 * 1000);
