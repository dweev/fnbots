// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info groupParticipantsUpdate.js ─────

import log from '../utils/logger.js';
import { jidNormalizedUser } from 'baileys';
import updateContact from './updateContact.js';
import { mongoStore, GroupMetadata } from '../../database/index.js';

export default async function groupParticipantsUpdate({ id, participants, action }, fn) {
  log(`Event: group-participants.update | Aksi: ${action} | Grup: ${id}`);
  try {
    const botJid = jidNormalizedUser(fn.user.id);
    switch (action) {
      case 'add': {
        let isBotAdded = false;
        for (const userId of participants) {
          const addedMemberJid = userId.endsWith('@lid') ?
            await mongoStore.findJidByLid(userId) : jidNormalizedUser(userId);
          if (addedMemberJid && addedMemberJid === botJid) {
            isBotAdded = true;
            break;
          }
        }
        if (isBotAdded) {
          try {
            const freshMetadata = await fn.groupMetadata(id);
            if (freshMetadata) {
              await mongoStore.updateGroupMetadata(id, freshMetadata);
              const botParticipant = freshMetadata.participants.find(p => p.id === botJid || jidNormalizedUser(p.id) === botJid);
              if (botParticipant && botParticipant.admin) {
                log(`Bot adalah admin di grup ${id}. Siap untuk operasi.`);
              } else {
                log(`Bot bukan admin di grup ${id}.`);
              }
            }
          } catch (metadataError) {
            log(`Gagal mendapatkan metadata grup setelah bot ditambahkan: ${metadataError}`, true);
          }
        } else {
          const freshMetadata = await fn.groupMetadata(id);
          if (freshMetadata) await mongoStore.updateGroupMetadata(id, freshMetadata);
        }
        break;
      }
      case 'remove': {
        let isBotRemoved = false;
        for (const userId of participants) {
          const leaveMemberJid = userId.endsWith('@lid') ? await mongoStore.findJidByLid(userId) : jidNormalizedUser(userId);
          if (leaveMemberJid && leaveMemberJid === botJid) {
            isBotRemoved = true;
            break;
          }
        }
        if (isBotRemoved) {
          log(`Bot dikeluarkan dari grup ${id}. Membersihkan metadata...`);
          await GroupMetadata.deleteOne({ groupId: id });
          mongoStore.clearGroupCacheByKey(id);
          return;
        } else {
          const freshMetadata = await fn.groupMetadata(id);
          if (freshMetadata) await mongoStore.updateGroupMetadata(id, freshMetadata);
        }
        break;
      }
      case 'promote':
      case 'demote': {
        let isBotAffected = false;
        for (const userId of participants) {
          const affectedMemberJid = userId.endsWith('@lid') ? await mongoStore.findJidByLid(userId) : jidNormalizedUser(userId);
          if (affectedMemberJid && affectedMemberJid === botJid) {
            isBotAffected = true;
            break;
          }
        }
        if (isBotAffected) {
          try {
            const freshMetadata = await fn.groupMetadata(id);
            if (freshMetadata) await mongoStore.updateGroupMetadata(id, freshMetadata);
          } catch (metadataError) {
            log(`Gagal mendapatkan metadata grup setelah perubahan admin: ${metadataError}`, true);
          }
        } else {
          const newStatus = action === 'promote' ? 'admin' : null;
          const currentMetadata = await mongoStore.getGroupMetadata(id);
          if (currentMetadata && currentMetadata.participants) {
            let metadataChanged = false;
            currentMetadata.participants.forEach(p => {
              if (participants.includes(p.id)) {
                p.admin = newStatus;
                metadataChanged = true;
              }
            });
            if (metadataChanged) {
              await mongoStore.updateGroupMetadata(id, currentMetadata);
            }
          }
        }
        break;
      }
    }
    const finalMetadata = await mongoStore.getGroupMetadata(id);
    if (finalMetadata && finalMetadata.participants) {
      for (const participant of finalMetadata.participants) {
        if (participant.id && participant.lid) {
          await updateContact(participant.id, { lid: participant.lid });
        }
      }
    }
  } catch (error) {
    log(`Error saat menangani group-participants.update untuk ${id}:\n${error}`, true);
  }
};