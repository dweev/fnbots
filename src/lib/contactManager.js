// ─── Info ────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info src/lib/contactManager.js ──────────────

import log from './logger.js';
import { store } from '../../database/index.js';

export async function updateContact(jid, data = {}) {
  if (!jid || !jid.endsWith('@s.whatsapp.net')) return;
  try {
    await store.updateContact(jid, data);
  } catch (error) {
    await log(error, true);
  }
};
export async function processContactUpdate(contact) {
  const idFromEvent = contact.id;
  const trueJid = await store.resolveJid(idFromEvent);
  if (!trueJid) return;
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
};