// ─── Info ────────────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info src/lib/groupParticipantsUpdate.js ─────

import log from './logger.js';
import { jidNormalizedUser } from 'baileys';
import { trackRecentJoin } from '../function/index.js';
import { performanceManager } from './performanceManager.js';
import { batchUpdateContacts } from '../lib/contactManager.js';
import { store, Group, Whitelist } from '../../database/index.js';

let GroupCache = null;

async function getGroupCache() {
  if (!GroupCache) {
    const module = await import('../cache/cacheGroupMetadata.js');
    GroupCache = module.default;
  }
  return GroupCache;
}
async function getCachedMetadata(groupId) {
  try {
    let metadata = performanceManager.cache.groupMetadataCache.get(groupId);
    if (metadata) {
      log(`Group metadata cache HIT (LRU): ${groupId}`);
      return metadata;
    }
    const cache = await getGroupCache();
    metadata = await cache.getGroup(groupId);
    if (metadata) {
      log(`Group metadata cache HIT (Redis): ${groupId}`);
      performanceManager.cache.groupMetadataCache.set(groupId, metadata);
      return metadata;
    }
    log(`Group metadata cache MISS: ${groupId}, fetching from DB`);
    metadata = await store.getGroupMetadata(groupId);
    if (metadata) {
      performanceManager.cache.groupMetadataCache.set(groupId, metadata);
    }
    return metadata;
  } catch (error) {
    log(`Error getting cached metadata for ${groupId}: ${error}`, true);
    return null;
  }
}
async function invalidateCache(groupId) {
  try {
    performanceManager.cache.invalidateGroupMetadataCache(groupId);
    const cache = await getGroupCache();
    await cache.deleteGroup(groupId);
    log(`All cache layers invalidated: ${groupId}`);
  } catch (error) {
    log(`Error invalidating cache for ${groupId}: ${error}`, true);
  }
}
async function refreshMetadata(fn, groupId) {
  try {
    await invalidateCache(groupId);
    let metadata = await store.syncGroupMetadata(fn, groupId);
    if (!metadata) {
      log(`Sync failed, attempting direct fetch for: ${groupId}`, true);
      metadata = await fn.groupMetadata(groupId);
      if (metadata) {
        await store.updateGroupMetadata(groupId, metadata);
        log(`Direct fetch successful: ${groupId}`);
      }
    }
    if (metadata) {
      performanceManager.cache.groupMetadataCache.set(groupId, metadata);
    }
    return metadata;
  } catch (error) {
    log(`Failed to refresh metadata for ${groupId}: ${error.message}`, true);
    return null;
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
async function updateContactsFromMetadata(metadata) {
  if (!metadata?.participants) return;
  const contactUpdates = metadata.participants
    .filter((p) => {
      const hasJid = p.phoneNumber || (p.id && p.id.includes('@s.whatsapp.net'));
      const hasLid = p.lid || (p.id && p.id.includes('@lid'));
      return hasJid && hasLid;
    })
    .map((p) => {
      const jid = p.phoneNumber || (p.id?.includes('@s.whatsapp.net') ? p.id : null);
      const lid = p.lid || (p.id?.includes('@lid') ? p.id : null);
      return { jid, data: { lid } };
    });
  if (contactUpdates.length > 0) {
    await batchUpdateContacts(contactUpdates, 'group-participants.update');
  }
}
async function handleAddParticipants(groupId, resolvedParticipants, fn) {
  const groupData = await Group.findOne({ groupId }).lean();
  const metadata = await refreshMetadata(fn, groupId);
  await updateContactsFromMetadata(metadata);
  if (groupData?.welcome?.state && metadata) {
    for (const { jid, lid } of resolvedParticipants) {
      const newMemberJid = jid || (lid ? await store.findJidByLid(lid) : null);
      if (newMemberJid) {
        trackRecentJoin(groupId, newMemberJid);
        await fn.handleGroupEventImage(groupId, {
          memberJid: newMemberJid,
          eventText: 'Selamat Datang Di',
          subject: metadata.subject || 'Group',
          messageText: groupData.welcome.pesan
        });
      } else {
        log(`Gagal menemukan JID untuk participant. Pesan dilewati.`);
      }
    }
  }
}
async function handleRemoveParticipants(groupId, resolvedParticipants, botJid, fn) {
  const isBotRemoved = resolvedParticipants.some(({ jid }) => jid === botJid);
  if (isBotRemoved) {
    log(`Bot dikeluarkan dari grup ${groupId}. Membersihkan metadata...`);
    await store.deleteGroup(groupId);
    const isWhitelisted = await Whitelist.isWhitelisted(groupId);
    if (isWhitelisted) {
      await Whitelist.removeFromWhitelist(groupId);
      log(`Grup ${groupId} dihapus dari whitelist karena bot dikeluarkan.`);
    }
    log(`Cleanup completed for group ${groupId}. Bot successfully removed.`);
    return;
  }
  const groupData = await Group.findOne({ groupId }).lean();
  const metadata = await getCachedMetadata(groupId);
  if (groupData?.leave?.state && metadata) {
    for (const { jid, lid } of resolvedParticipants) {
      const leaveMemberJid = jid || (lid ? await store.findJidByLid(lid) : null);
      if (leaveMemberJid && leaveMemberJid !== botJid) {
        await fn.handleGroupEventImage(groupId, {
          memberJid: leaveMemberJid,
          eventText: 'Selamat Tinggal!!',
          subject: metadata.subject || 'Group',
          messageText: groupData.leave.pesan
        });
      } else if (!leaveMemberJid) {
        log(`Gagal mengidentifikasi JID untuk anggota. Pesan dilewati.`);
      }
    }
  }
  await refreshMetadata(fn, groupId);
}
async function handleAdminChange(groupId, resolvedParticipants, botJid, action, fn) {
  const isBotAffected = resolvedParticipants.some(({ jid }) => jid === botJid);
  if (isBotAffected) {
    const freshMetadata = await refreshMetadata(fn, groupId);
    if (freshMetadata) {
      const botParticipant = freshMetadata.participants.find((p) => {
        const participantJid = p.phoneNumber || p.id;
        return participantJid === botJid || jidNormalizedUser(participantJid) === botJid;
      });
      if (action === 'promote' && botParticipant?.admin) {
        log(`Bot dijadikan admin di grup ${groupId}.`);
      } else if (action === 'demote' && !botParticipant?.admin) {
        log(`Bot dicopot sebagai admin di grup ${groupId}.`);
      }
    }
  } else {
    await updateParticipantsAdminStatus(groupId, resolvedParticipants, action);
  }
}
async function updateParticipantsAdminStatus(groupId, resolvedParticipants, action) {
  const newStatus = action === 'promote' ? 'admin' : null;
  const currentMetadata = await getCachedMetadata(groupId);
  if (!currentMetadata?.participants) return;
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
    await store.updateGroupMetadata(groupId, currentMetadata);
    performanceManager.cache.groupMetadataCache.set(groupId, currentMetadata);
    log(`Updated admin status in all cache layers for group ${groupId}`);
  }
}

export default async function groupParticipantsUpdate({ id, participants, action }, fn) {
  log(`Event: group-participants.update | Aksi: ${action} | Grup: ${id}`);
  try {
    const botJid = jidNormalizedUser(fn.user.id);
    const resolvedParticipants = await resolveParticipantJids(participants);
    switch (action) {
      case 'add': {
        await handleAddParticipants(id, resolvedParticipants, fn);
        break;
      }
      case 'remove': {
        await handleRemoveParticipants(id, resolvedParticipants, botJid, fn);
        break;
      }
      case 'promote':
      case 'demote': {
        await handleAdminChange(id, resolvedParticipants, botJid, action, fn);
        break;
      }
    }
  } catch (error) {
    log(error, true);
  }
}
