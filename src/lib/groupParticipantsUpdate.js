// ─── Info ────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info src/lib/groupParticipantsUpdate.js ─────

import log from './logger.js';
import { jidNormalizedUser } from 'baileys';
import { updateContact } from '../lib/contactManager.js';
import { store, StoreGroupMetadata, Group } from '../../database/index.js';

export default async function groupParticipantsUpdate({ id, participants, action }, fn) {
  log(`Event: group-participants.update | Aksi: ${action} | Grup: ${id}`);
  try {
    const botJid = jidNormalizedUser(fn.user.id);
    const getUserId = (participant) => {
      if (typeof participant === 'string') return participant;
      return participant.id || participant.phoneNumber;
    };
    switch (action) {
      case 'add': {
        const groupData = await Group.findOne({ groupId: id }).lean();
        if (groupData?.welcome?.state) {
          const metadata = await store.getGroupMetadata(id);
          for (const participant of participants) {
            const userId = getUserId(participant);
            let newMemberJid;
            if (userId.endsWith('@lid')) {
              newMemberJid = await store.findJidByLid(userId);
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
        await store.syncGroupMetadata(fn, id);
        break;
      }
      case 'remove': {
        let isBotRemoved = false;
        for (const participant of participants) {
          const userId = getUserId(participant);
          const leaveMemberJid = userId.endsWith('@lid') ? await store.findJidByLid(userId) : jidNormalizedUser(userId);
          if (leaveMemberJid && leaveMemberJid === botJid) {
            isBotRemoved = true;
            break;
          }
        }
        if (isBotRemoved) {
          log(`Bot dikeluarkan dari grup ${id}. Membersihkan metadata...`);
          await StoreGroupMetadata.deleteOne({ groupId: id });
          store.clearGroupCacheByKey(id);
          return;
        }
        const groupData = await Group.findOne({ groupId: id }).lean();
        if (groupData?.leave?.state) {
          const metadata = await store.getGroupMetadata(id);
          for (const participant of participants) {
            const userId = getUserId(participant);
            let leaveMemberJid;
            if (userId.endsWith('@lid')) {
              leaveMemberJid = await store.findJidByLid(userId);
            } else {
              leaveMemberJid = jidNormalizedUser(userId);
            }
            if (leaveMemberJid && leaveMemberJid === botJid) continue;
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
        await store.syncGroupMetadata(fn, id);
        break;
      }
      case 'promote':
      case 'demote': {
        let isBotAffected = false;
        for (const participant of participants) {
          const userId = getUserId(participant);
          const affectedMemberJid = userId.endsWith('@lid') ? await store.findJidByLid(userId) : jidNormalizedUser(userId);
          if (affectedMemberJid && affectedMemberJid === botJid) {
            isBotAffected = true;
            break;
          }
        }
        if (isBotAffected) {
          const freshMetadata = await store.syncGroupMetadata(fn, id);
          if (freshMetadata) {
            const botParticipant = freshMetadata.participants.find(p => p.id === botJid || jidNormalizedUser(p.id) === botJid);
            if (action === 'promote' && botParticipant?.admin) {
              log(`Bot dijadikan admin di grup ${id}.`);
            } else if (action === 'demote' && !botParticipant?.admin) {
              log(`Bot dicopot sebagai admin di grup ${id}.`);
            }
          }
        } else {
          const newStatus = action === 'promote' ? 'admin' : null;
          const currentMetadata = await store.getGroupMetadata(id);
          if (currentMetadata && currentMetadata.participants) {
            let metadataChanged = false;
            currentMetadata.participants.forEach(p => {
              const participantIds = participants.map(getUserId);
              if (participantIds.includes(p.id)) {
                p.admin = newStatus;
                metadataChanged = true;
              }
            });
            if (metadataChanged) {
              await store.updateGroupMetadata(id, currentMetadata);
            }
          }
        }
        break;
      }
    }
    const finalMetadata = await store.getGroupMetadata(id);
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