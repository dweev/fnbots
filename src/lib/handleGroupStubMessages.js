// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info handleGroupStubMessages.js ─────

import log from '../utils/logger.js';
import updateContact from './updateContact.js';
import { mongoStore } from '../../database/index.js';
import { jidNormalizedUser, WAMessageStubType } from 'baileys';

export default async function handleGroupStubMessages(fn, m) {
  if (!m.chat) return;
  let needsMetadataRefresh = false;
  const normalizedTarget = m.messageStubParameters?.[0];
  if (!normalizedTarget) return;
  switch (m.messageStubType) {
    case 20:
    case 27:
    case 29:
    case 30:
      needsMetadataRefresh = true;
      break;
    case 28:
    case 32:
      if (m.fromMe && (jidNormalizedUser(fn.user.id) === normalizedTarget)) return;
      needsMetadataRefresh = true;
      break;
    default:
      if (m.messageStubType !== 2) {
        await log({ messageStubType: m.messageStubType, messageStubParameters: m.messageStubParameters, type: WAMessageStubType[m.messageStubType] });
      }
      break;
  }
  if (needsMetadataRefresh) {
    try {
      const freshMetadata = await fn.groupMetadata(m.chat);
      if (!freshMetadata) return;
      await mongoStore.updateGroupMetadata(m.chat, freshMetadata);
      if (freshMetadata.participants) {
        for (const participant of freshMetadata.participants) {
          const contactJid = jidNormalizedUser(participant.id);
          const contactName = fn.getName(contactJid);
          await updateContact(contactJid, { lid: participant.lid, name: contactName });
        }
      }
    } catch (error) {
      await log(`Error handleGroupStubMessages ${m.chat}\n${error}`, true);
    }
  }
};