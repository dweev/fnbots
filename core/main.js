// ─── Info ─────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info core/main.js ────────────────────────

import process from 'process';
import config from '../config.js';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import { createWASocket } from './connection.js';
import { jidNormalizedUser, proto } from 'baileys';
import { tmpDir } from '../src/lib/tempManager.js';
import { loadPlugins } from '../src/lib/plugins.js';
import errorTracker from '../src/lib/errorTracker.js';
import log, { pinoLogger } from '../src/lib/logger.js';
import { signalHandler } from '../src/lib/signalHandler.js';
import { restartManager } from '../src/lib/restartManager.js';
import startPluginWatcher from '../src/lib/watcherPlugins.js';
import { database, Settings, store } from '../database/index.js';
import updateMessageUpsert from '../src/lib/updateMessageUpsert.js';
import { initializeDbSettings } from '../src/lib/settingsManager.js';
import { performanceManager } from '../src/lib/performanceManager.js';
import { randomByte, initializeFuse } from '../src/function/index.js';
import groupParticipantsUpdate from '../src/lib/groupParticipantsUpdate.js';
import { updateContact, batchProcessContactUpdates } from '../src/lib/contactManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let dbSettings;
let fn;
let authStore;
global.randomSuffix = randomByte(16);
global.debugs = false;

async function ensureMongoDBRunning() {
  const { execSync } = await import('child_process');
  const { default: waitPort } = await import('wait-port');
  try {
    execSync('pgrep mongod', { stdio: 'pipe' });
    log('MongoDB process is running');
    await waitPort({ host: 'localhost', port: 27017, timeout: 10000 });
    log('MongoDB port is ready');
    return true;
  } catch {
    log('Starting MongoDB...');
    execSync('sudo systemctl start mongod', { stdio: 'inherit' });
    log('Waiting for MongoDB...');
    await waitPort({ host: 'localhost', port: 27017, timeout: 15000 });
    log('MongoDB started successfully');
    return true;
  }
}

async function initializeDatabases() {
  try {
    await database.connect();
    await store.connect();
    dbSettings = await initializeDbSettings();
    pinoLogger.level = dbSettings.pinoLogger || 'silent';
    await log('Databases initialized successfully');
  } catch (error) {
    await log(error, true);
    throw error;
  }
};

function setupWhatsAppEventHandlers(fn) {
  fn.ev.on('messaging-history.set', async (event) => {
    if (!event) {
      console.error('Received empty event');
      return;
    }
    const {
      contacts = [],
      messages = [],
      syncType
    } = event;
    if (syncType === proto.HistorySync.HistorySyncType.ON_DEMAND) {
      console.log('received on-demand history sync, messages=', messages.length);
    }
    console.log(`recv ${contacts.length} contacts, ${messages.length} msgs`);
    try {
      if (contacts.length > 0) {
        await batchProcessContactUpdates(contacts);
      }
    } catch (error) {
      console.error('Error batch processing contacts:', error);
    }
  });
  fn.ev.on('contacts.upsert', async (contacts) => {
    await batchProcessContactUpdates(contacts);
  });
  fn.ev.on('contacts.update', async (updates) => {
    await batchProcessContactUpdates(updates);
  });
  fn.ev.on('messages.upsert', async (message) => {
    if (message.type !== 'notify') return;
    await updateMessageUpsert(fn, message, dbSettings);
  });
  fn.ev.on('group-participants.update', async (update) => {
    await groupParticipantsUpdate(update, fn);
  });
  fn.ev.on('groups.upsert', async (newMetas) => {
    for (const daget of newMetas) {
      const id = jidNormalizedUser(daget.id);
      log(`Bot dimasukkan ke grup ${id}. Menyinkronkan metadata...`);
      await store.syncGroupMetadata(fn, id);
      if (daget.participants?.length) {
        log(`Memperbarui kontak peserta untuk grup ${id}...`);
        const participantJids = daget.participants.map(p => jidNormalizedUser(p.id));
        const contacts = await store.getArrayContacts(participantJids);
        if (contacts) {
          const contactMap = new Map(contacts.map(c => [c.jid, c]));
          const contactUpdates = [];
          for (const participant of daget.participants) {
            const contactJid = jidNormalizedUser(participant.id);
            const contact = contactMap.get(contactJid);
            const contactName = contact?.name || contact?.notify || 'Unknown';
            contactUpdates.push({
              jid: contactJid,
              data: { lid: participant.lid, name: contactName }
            });
          }
          const { batchUpdateContacts } = await import('../src/lib/contactManager.js');
          await batchUpdateContacts(contactUpdates);
        }
      }
    }
  });
  fn.ev.on('groups.update', async (updates) => {
    for (const newMeta of updates) {
      const id = jidNormalizedUser(newMeta.id);
      await store.updateGroupMetadata(id, newMeta);
      if (newMeta.participants?.length) {
        const participantJids = newMeta.participants.map(p => jidNormalizedUser(p.id));
        const existingContacts = await store.getArrayContacts(participantJids);
        const contactMap = new Map(existingContacts.map(c => [c.jid, c]));
        const contactUpdates = [];
        for (const participant of newMeta.participants) {
          const contactJid = jidNormalizedUser(participant.id);
          const existingContact = contactMap.get(contactJid);
          const contactName = existingContact?.name || existingContact?.notify || 'Unknown';
          contactUpdates.push({
            jid: contactJid,
            data: { lid: participant.lid, name: contactName }
          });
        }
        const { batchUpdateContacts } = await import('../src/lib/contactManager.js');
        await batchUpdateContacts(contactUpdates);
      }
    }
  });
  fn.ev.on('chats.update', async (updates) => {
    for (const chatUpdate of updates) {
      const lastMessage = chatUpdate.messages?.[0];
      if (!lastMessage) continue;
      const messageData = lastMessage.message;
      if (!messageData || !messageData.key) continue;
      const key = messageData.key;
      const isGroup = key.remoteJid?.endsWith('@g.us');
      let jid, lid;
      if (isGroup) {
        delete key.remoteJidAlt;
        const participant = jidNormalizedUser(key.participant);
        const participantAlt = jidNormalizedUser(key.participantAlt);
        if (key.addressingMode === 'lid') {
          lid = participant?.endsWith('@lid') ? participant : null;
          jid = participantAlt?.endsWith('@s.whatsapp.net') ? participantAlt : null;
        } else {
          jid = participant?.endsWith('@s.whatsapp.net') ? participant : null;
          lid = participantAlt?.endsWith('@lid') ? participantAlt : null;
        }
        if (!jid) {
          jid = participant?.endsWith('@s.whatsapp.net') ? participant : (participantAlt?.endsWith('@s.whatsapp.net') ? participantAlt : null);
        }
        if (!lid) {
          lid = participant?.endsWith('@lid') ? participant : (participantAlt?.endsWith('@lid') ? participantAlt : null);
        }
      } else {
        delete key.participant;
        delete key.participantAlt;
        const remoteJid = jidNormalizedUser(key.remoteJid);
        const remoteJidAlt = jidNormalizedUser(key.remoteJidAlt);
        if (key.addressingMode === 'lid') {
          lid = remoteJid?.endsWith('@lid') ? remoteJid : null;
          jid = remoteJidAlt?.endsWith('@s.whatsapp.net') ? remoteJidAlt : null;
        } else {
          jid = remoteJid?.endsWith('@s.whatsapp.net') ? remoteJid : null;
          lid = remoteJidAlt?.endsWith('@lid') ? remoteJidAlt : null;
        }
        if (!jid) {
          jid = remoteJid?.endsWith('@s.whatsapp.net') ? remoteJid : (remoteJidAlt?.endsWith('@s.whatsapp.net') ? remoteJidAlt : null);
        }
        if (!lid) {
          lid = remoteJid?.endsWith('@lid') ? remoteJid : (remoteJidAlt?.endsWith('@lid') ? remoteJidAlt : null);
        }
      }
      if (jid && lid) {
        const eName = messageData.pushName || await fn.getName(jid);
        await updateContact(jid, { lid: lid, name: eName });
      }
    }
  });
  fn.ev.on('presence.update', async ({ id, presences: update }) => {
    if (!id.endsWith('@g.us')) return;
    const resolvedPresences = {};
    const jidsToResolve = [];
    for (const participantId in update) {
      if (participantId.endsWith('@lid')) {
        jidsToResolve.push(participantId);
      } else {
        resolvedPresences[jidNormalizedUser(participantId)] = {
          ...update[participantId],
          lastSeen: Date.now()
        };
      }
    }
    if (jidsToResolve.length > 0) {
      const resolved = await store.batchResolveJids(jidsToResolve);
      jidsToResolve.forEach((lid, idx) => {
        const resolvedJid = resolved[idx];
        if (resolvedJid) {
          resolvedPresences[resolvedJid] = {
            ...update[lid],
            lastSeen: Date.now()
          };
        }
      });
    }
    await store.updatePresences(id, resolvedPresences);
  });
  fn.ev.on("call", (call) => {
    const { id, status, from } = call[0];
    if (status === "offer" && dbSettings.anticall) {
      return fn.rejectCall(id, from);
    }
  });
  log('WhatsApp event handlers setup completed');
}

async function starts() {
  try {
    await ensureMongoDBRunning();
    await tmpDir.ensureDirectory();
    await initializeDatabases();
    await loadPlugins(path.join(__dirname, '..', 'src', 'plugins'));
    await initializeFuse();
    startPluginWatcher();
    store.init();
    const result = await createWASocket(dbSettings);
    fn = result.fn;
    authStore = result.authStore;
    store.setAuthStore(authStore);
    store.setSocket(fn);
    await log('Socket and AuthStore injected into DBStore successfully');
    setupWhatsAppEventHandlers(fn);
    await performanceManager.initialize(fn, config, dbSettings);
    await performanceManager.cache.warmHotDataOnStartup();
    errorTracker.initialize(performanceManager);
  } catch (error) {
    await log(error, true);
    await restartManager.restart("Failed to load database store", performanceManager);
  }
};

signalHandler.register('database', async (signal) => {
  await log(`${signal}: Database cleanup initiated...`);
  try {
    await errorTracker.shutdown();
    if (authStore) {
      await authStore.saveCreds();
      await log('Credentials saved');
    }
    if (dbSettings) {
      await Settings.updateSettings(dbSettings);
    }
    if (store) {
      await store.disconnect();
    }
    if (database?.isConnected) {
      await database.disconnect();
    }
    await log(`Database cleanup completed.`);
  } catch (error) {
    await log(error, true);
  }
}, 100);

process.on('unhandledRejection', async (reason, promise) => {
  await log(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});
process.on('uncaughtException', async (error) => {
  await log(`Uncaught Exception: ${error}`);
  await log(error, true);
  await performanceManager.cache.forceSync();
  await restartManager.shutdown(performanceManager);
});

try {
  await starts();
} catch (error) {
  await log(error, true);
  process.exit(1);
}