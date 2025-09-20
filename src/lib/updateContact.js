// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info updateContact.js ────────────────

import log from '../utils/logger.js';
import { mongoStore } from '../../database/index.js';

export default async function updateContact(jid, data = {}) {
  if (!jid || !jid.endsWith('@s.whatsapp.net')) return;
  try {
    await mongoStore.updateContact(jid, data);
  } catch (error) {
    await log(error, true);
  }
};