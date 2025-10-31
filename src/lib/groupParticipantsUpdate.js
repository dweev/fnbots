// ─── Info ────────────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info src/lib/groupParticipantsUpdate.js ─────

import log from './logger.js';
import { jidNormalizedUser } from 'baileys';
import { performanceManager } from './performanceManager.js';
import { batchUpdateContacts } from '../lib/contactManager.js';
import { store, Group, Whitelist } from '../../database/index.js';

async function getCachedMetadata(groupId) {
  try {
    let metadata = performanceManager.cache.groupMetadataCache.get(groupId);
    if (metadata) {
      log(`Group metadata cache HIT (LRU): ${groupId}`);
      return metadata;
    }
    const { default: GroupCache } = await import('../cache/cacheGroupMetadata.js');
    metadata = await GroupCache.getGroup(groupId);
    if (metadata) {
      log(`Group metadata cache HIT (Redis): ${groupId}`);
      performanceManager.cache.groupMetadataCache.set(groupId, metadata);
      return metadata;
    }
    log(`Group metadata cache MISS: ${groupId}, fetching from DB`);
    metadata = await store.getGroupMetadata(groupId);
    if (metadata) {
      await GroupCache.addGroup(groupId, metadata);
      performanceManager.cache.groupMetadataCache.set(groupId, metadata);
    }
    return metadata;
  } catch (error) {
    log(`Error getting cached metadata for ${groupId}: ${error}`, true);
    return null;
  }
}

async function invalidateMetadataCache(groupId) {
  try {
    performanceManager.cache.invalidateGroupMetadataCache(groupId);
    const { default: GroupCache } = await import('../cache/cacheGroupMetadata.js');
    await GroupCache.deleteGroup(groupId);
    log(`All cache layers invalidated for group: ${groupId}`);
  } catch (error) {
    log(`Error invalidating cache for ${groupId}: ${error}`, true);
  }
}

async function resolveParticipantJids(participants) {
  const jids = participants.map((p) => {
    if (typeof p === 'string') return p;
    return p.phoneNumber || p.id;
  });
  const resolved = await store.batchResolveJids(jids);
  return participants.map((p, idx) => {
    const originalId = typeof p === 'string' ? p : p.phoneNumber || p.id;
    return {
      original: p,
      jid: resolved[idx],
      lid: originalId?.endsWith('@lid') ? originalId : typeof p === 'object' ? p.lid : null
    };
  });
}

export default async function groupParticipantsUpdate({ id, participants, action }, fn) {
  log(`Event: group-participants.update | Aksi: ${action} | Grup: ${id}`);
  try {
    const botJid = jidNormalizedUser(fn.user.id);
    const resolvedParticipants = await resolveParticipantJids(participants);
    switch (action) {
      case 'add': {
        const groupData = await Group.findOne({ groupId: id }).lean();
        if (groupData?.welcome?.state) {
          const metadata = await getCachedMetadata(id);
          for (const { jid, lid } of resolvedParticipants) {
            const newMemberJid = jid || (lid ? await store.findJidByLid(lid) : null);
            if (newMemberJid) {
              await fn.handleGroupEventImage(id, {
                memberJid: newMemberJid,
                eventText: 'Selamat Datang Di',
                subject: metadata?.subject || 'Group',
                messageText: groupData.welcome.pesan
              });
            } else {
              await log(`Gagal menemukan JID untuk participant. Pesan dilewati.`);
            }
          }
        }
        await invalidateMetadataCache(id);
        const freshMetadata = await store.syncGroupMetadata(fn, id);
        if (freshMetadata) {
          const { default: GroupCache } = await import('../cache/cacheGroupMetadata.js');
          await GroupCache.addGroup(id, freshMetadata);
          performanceManager.cache.groupMetadataCache.set(id, freshMetadata);
        }
        break;
      }
      case 'remove': {
        const isBotRemoved = resolvedParticipants.some(({ jid }) => jid === botJid);
        if (isBotRemoved) {
          log(`Bot dikeluarkan dari grup ${id}. Membersihkan metadata...`);
          await invalidateMetadataCache(id);
          await store.deleteGroup(id);
          const isWhitelisted = await Whitelist.isWhitelisted(id, 'group');
          if (isWhitelisted) {
            await Whitelist.removeFromWhitelist(id, 'group');
            log(`Grup ${id} dihapus dari whitelist karena bot dikeluarkan.`);
          }
          return;
        }
        const groupData = await Group.findOne({ groupId: id }).lean();
        if (groupData?.leave?.state) {
          const metadata = await getCachedMetadata(id);
          for (const { jid, lid } of resolvedParticipants) {
            const leaveMemberJid = jid || (lid ? await store.findJidByLid(lid) : null);
            if (leaveMemberJid && leaveMemberJid !== botJid) {
              await fn.handleGroupEventImage(id, {
                memberJid: leaveMemberJid,
                eventText: 'Selamat Tinggal!!',
                subject: metadata?.subject || 'Group',
                messageText: groupData.leave.pesan
              });
            } else if (!leaveMemberJid) {
              await log(`Gagal mengidentifikasi JID untuk anggota. Pesan dilewati.`);
            }
          }
        }
        await invalidateMetadataCache(id);
        const freshMetadata = await store.syncGroupMetadata(fn, id);
        if (freshMetadata) {
          const { default: GroupCache } = await import('../cache/cacheGroupMetadata.js');
          await GroupCache.addGroup(id, freshMetadata);
          performanceManager.cache.groupMetadataCache.set(id, freshMetadata);
        }
        break;
      }
      case 'promote':
      case 'demote': {
        const isBotAffected = resolvedParticipants.some(({ jid }) => jid === botJid);
        if (isBotAffected) {
          await invalidateMetadataCache(id);
          const freshMetadata = await store.syncGroupMetadata(fn, id);
          if (freshMetadata) {
            const botParticipant = freshMetadata.participants.find((p) => {
              const participantJid = p.phoneNumber || p.id;
              return participantJid === botJid || jidNormalizedUser(participantJid) === botJid;
            });
            if (action === 'promote' && botParticipant?.admin) {
              log(`Bot dijadikan admin di grup ${id}.`);
            } else if (action === 'demote' && !botParticipant?.admin) {
              log(`Bot dicopot sebagai admin di grup ${id}.`);
            }
            const { default: GroupCache } = await import('../cache/cacheGroupMetadata.js');
            await GroupCache.addGroup(id, freshMetadata);
            performanceManager.cache.groupMetadataCache.set(id, freshMetadata);
          }
        } else {
          const newStatus = action === 'promote' ? 'admin' : null;
          const currentMetadata = await getCachedMetadata(id);
          if (currentMetadata && currentMetadata.participants) {
            let metadataChanged = false;
            const affectedJids = resolvedParticipants.map((p) => p.jid).filter(Boolean);
            currentMetadata.participants.forEach((p) => {
              const participantJid = p.phoneNumber || p.id;
              if (affectedJids.includes(participantJid)) {
                p.admin = newStatus;
                metadataChanged = true;
              }
            });
            if (metadataChanged) {
              await store.updateGroupMetadata(id, currentMetadata);
              const { default: GroupCache } = await import('../cache/cacheGroupMetadata.js');
              await GroupCache.updateGroupMetadata(id, currentMetadata);
              performanceManager.cache.groupMetadataCache.set(id, currentMetadata);
              log(`Updated admin status in all cache layers for group ${id}`);
            }
          }
        }
        break;
      }
    }
    const finalMetadata = await getCachedMetadata(id);
    if (finalMetadata && finalMetadata.participants) {
      const contactUpdates = finalMetadata.participants
        .filter((p) => {
          const hasJid = p.phoneNumber || (p.id && p.id.includes('@s.whatsapp.net'));
          const hasLid = p.lid || (p.id && p.id.includes('@lid'));
          return hasJid && hasLid;
        })
        .map((p) => {
          const jid = p.phoneNumber || (p.id?.includes('@s.whatsapp.net') ? p.id : null);
          const lid = p.lid || (p.id?.includes('@lid') ? p.id : null);
          return {
            jid: jid,
            data: { lid: lid }
          };
        });
      if (contactUpdates.length > 0) {
        await batchUpdateContacts(contactUpdates);
      }
    }
  } catch (error) {
    log(error, true);
  }
}
