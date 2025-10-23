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
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  updateLocks.set(jid, Date.now());
}

function releaseLock(jid) {
  updateLocks.delete(jid);
}

export async function updateContact(jid, data = {}) {
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
    await store.updateContact(jid, mergedData);
  } catch (error) {
    await log(error, true);
  } finally {
    releaseLock(jid);
  }
}

export async function batchUpdateContacts(contacts) {
  if (!contacts || contacts.length === 0) return;
  const validContacts = contacts.filter(({ jid }) =>
    jid && typeof jid === 'string' && jid.endsWith('@s.whatsapp.net')
  );
  const updatePromises = validContacts.map(({ jid, data }) =>
    updateContact(jid, data).catch(err => {
      log(`Batch update failed for ${jid}: ${err.message}`, true);
    })
  );
  await Promise.allSettled(updatePromises);
}

export async function processContactUpdate(contact) {
  if (!contact || !contact.id) return;
  const idFromEvent = contact.id;
  const trueJid = await store.resolveJid(idFromEvent);
  if (!trueJid || !trueJid.endsWith('@s.whatsapp.net')) return;
  const dataToUpdate = {};
  const nameToUpdate = contact.notify || contact.name;
  if (idFromEvent.endsWith('@lid')) {
    dataToUpdate.lid = idFromEvent;
  }
  if (nameToUpdate) {
    dataToUpdate.name = nameToUpdate;
  }
  if (Object.keys(dataToUpdate).length === 0) return;
  await updateContact(trueJid, dataToUpdate);
}

export async function batchProcessContactUpdates(contacts) {
  if (!contacts || contacts.length === 0) return;
  const resolvePromises = contacts.map(async (contact) => {
    if (!contact || !contact.id) return null;
    const idFromEvent = contact.id;
    const trueJid = await store.resolveJid(idFromEvent);
    if (!trueJid || !trueJid.endsWith('@s.whatsapp.net')) return null;
    const dataToUpdate = {};
    const nameToUpdate = contact.notify || contact.name;
    if (idFromEvent.endsWith('@lid')) {
      dataToUpdate.lid = idFromEvent;
    }
    if (nameToUpdate) {
      dataToUpdate.name = nameToUpdate;
    }
    if (Object.keys(dataToUpdate).length === 0) return null;
    return { jid: trueJid, data: dataToUpdate };
  });
  const resolved = await Promise.all(resolvePromises);
  const validContacts = resolved.filter(c => c !== null);
  await batchUpdateContacts(validContacts);
}