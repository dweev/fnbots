// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info processContactUpdate.js ────────

import { jidNormalizedUser } from 'baileys';
import updateContact from './updateContact.js';
import { mongoStore } from '../../database/index.js';

export default async function processContactUpdate(contact) {
  let trueJid;
  const idFromEvent = contact.id;
  if (idFromEvent.endsWith('@s.whatsapp.net')) {
    trueJid = jidNormalizedUser(idFromEvent);
  } else if (idFromEvent.endsWith('@lid')) {
    trueJid = await mongoStore.findJidByLid(idFromEvent);
  }
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