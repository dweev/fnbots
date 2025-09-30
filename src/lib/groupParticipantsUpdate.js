// ─── Info ────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info src/lib/groupParticipantsUpdate.js ─────

import log from './logger.js';
import { jidNormalizedUser } from 'baileys';
import { updateContact } from '../function/function.js';
import { mongoStore, StoreGroupMetadata, Group } from '../../database/index.js';

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
          const freshMetadata = await mongoStore.syncGroupMetadata(fn, id);
          if (freshMetadata) {
            const botParticipant = freshMetadata.participants.find(p => p.id === botJid || jidNormalizedUser(p.id) === botJid);
            if (botParticipant && botParticipant.admin) {
              log(`Bot adalah admin di grup ${id}. Siap untuk operasi.`);
            } else {
              log(`Bot bukan admin di grup ${id}.`);
            }
          }
        } else {
          const groupData = await Group.findOne({ groupId: id }).lean();
          if (groupData?.welcome?.state) {
            const metadata = await mongoStore.getGroupMetadata(id);
            for (const userId of participants) {
              let newMemberJid;
              if (userId.endsWith('@lid')) {
                newMemberJid = await mongoStore.findJidByLid(userId);
              } else {
                newMemberJid = jidNormalizedUser(userId);
              }
              if (newMemberJid) {
                await fn.handleGroupEventImage(id, {
                  memberJid: newMemberJid,
                  eventText: 'Selamat Datang Di',
                  subject: metadata.subject,
                  messageText: groupData.welcome.pesan
                });
              } else {
                await log(`Gagal menemukan JID untuk ${userId}. Pesan dilewati.`);
              }
            }
          }
          await mongoStore.syncGroupMetadata(fn, id);
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
          await StoreGroupMetadata.deleteOne({ groupId: id });
          mongoStore.clearGroupCacheByKey(id);
          return;
        } else {
          const groupData = await Group.findOne({ groupId: id }).lean();
          if (groupData?.leave?.state) {
            const metadata = await mongoStore.getGroupMetadata(id);
            for (const userId of participants) {
              let leaveMemberJid;
              if (userId.endsWith('@lid')) {
                leaveMemberJid = await mongoStore.findJidByLid(userId);
              } else {
                leaveMemberJid = jidNormalizedUser(userId);
              }
              if (leaveMemberJid && leaveMemberJid.includes(botJid)) continue;
              if (leaveMemberJid) {
                await fn.handleGroupEventImage(id, {
                  memberJid: leaveMemberJid,
                  eventText: 'Selamat Tinggal!!',
                  subject: metadata.subject,
                  messageText: groupData.leave.pesan
                });
              } else {
                await log(`Gagal mengidentifikasi JID untuk anggota: ${userId}. Pesan dilewati.`);
              }
            }
          }
          await mongoStore.syncGroupMetadata(fn, id);
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
          await mongoStore.syncGroupMetadata(fn, id);
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
    log(error, true);
  }
};