// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info main.js ────────────────────────

import process from 'process';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import { jidNormalizedUser } from 'baileys';

import config from '../config.js';
import { handleRestart } from './handler.js';
import { createWASocket } from './connection.js';
import { tmpDir } from '../src/lib/tempManager.js';
import { loadPlugins } from '../src/lib/plugins.js';
import log, { pinoLogger } from '../src/lib/logger.js';
import startPluginWatcher from '../src/lib/watcherPlugins.js';
import updateMessageUpsert from '../src/lib/updateMessageUpsert.js';
import { initializeDbSettings } from '../src/lib/settingsManager.js';
import groupParticipantsUpdate from '../src/lib/groupParticipantsUpdate.js';
import { database, Settings, mongoStore, StoreMessages } from '../database/index.js';
import { randomByte, updateContact, processContactUpdate, initializeFuse } from '../src/function/function.js';
import { performanceManager } from '../src/lib/performanceManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let dbSettings;
let fn;
global.randomSuffix = randomByte(16);
global.debugs = false;

async function initializeDatabases() {
  try {
    await database.connect();
    await mongoStore.connect();
    dbSettings = await initializeDbSettings();
    pinoLogger.level = dbSettings.pinoLogger || 'silent';
    await log('Database & MongoStore berhasil diinisialisasi.');
  } catch (error) {
    await log(`Database initialization error: ${error}`);
    await log(error, true);
    throw error;
  }
};

function setupWhatsAppEventHandlers(fn) {
  fn.ev.on('messaging-history.set', async (event) => {
    for (const contact of event.contacts) {
      await processContactUpdate(contact);
    }
  });
  fn.ev.on('contacts.upsert', async (contacts) => {
    for (const contact of contacts) {
      await processContactUpdate(contact);
    }
  });
  fn.ev.on('contacts.update', async (updates) => {
    for (const contact of updates) {
      await processContactUpdate(contact);
    }
  });
  fn.ev.on('messages.upsert', async (message) => {
    await updateMessageUpsert(fn, message, dbSettings);
  });
  fn.ev.on('group-participants.update', async (update) => {
    await groupParticipantsUpdate(update, fn);
  });
  fn.ev.on('groups.upsert', async (newMetas) => {
    for (const daget of newMetas) {
      const id = jidNormalizedUser(daget.id);
      await mongoStore.updateGroupMetadata(id, daget);
      if (daget.participants?.length) {
        const participantJids = daget.participants.map(p => jidNormalizedUser(p.id));
        const contacts = await mongoStore.getArrayContacts(participantJids);
        if (contacts) {
          const contactMap = new Map(contacts.map(c => [c.jid, c]));
          for (const participant of daget.participants) {
            const contactJid = jidNormalizedUser(participant.id);
            const contact = contactMap.get(contactJid);
            const contactName = contact?.name || contact?.notify || 'Unknown';
            await updateContact(contactJid, { lid: participant.lid, name: contactName });
          }
        }
      }
    }
  });
  fn.ev.on('chats.update', async (updates) => {
    for (const chatUpdate of updates) {
      const lastMessage = chatUpdate.messages?.[0];
      if (!lastMessage || !lastMessage.key) continue;
      const key = lastMessage.key;
      const isGroup = key.remoteJid.endsWith('@g.us');
      if (isGroup) {
        delete key.remoteJidAlt;
      } else {
        delete key.participant;
        delete key.participantAlt;
      }
      let jid, lid;
      if (isGroup) {
        const participant = jidNormalizedUser(key.participant);
        const participantAlt = jidNormalizedUser(key.participantAlt);
        jid = participant?.endsWith('@s.whatsapp.net') ? participant : (participantAlt?.endsWith('@s.whatsapp.net') ? participantAlt : null);
        lid = participant?.endsWith('@lid') ? participant : (participantAlt?.endsWith('@lid') ? participantAlt : null);
      } else {
        const remoteJid = jidNormalizedUser(key.remoteJid);
        const remoteJidAlt = jidNormalizedUser(key.remoteJidAlt);
        jid = remoteJid?.endsWith('@s.whatsapp.net') ? remoteJid : (remoteJidAlt?.endsWith('@s.whatsapp.net') ? remoteJidAlt : null);
        lid = remoteJid?.endsWith('@lid') ? remoteJid : (remoteJidAlt?.endsWith('@lid') ? remoteJidAlt : null);
      }
      if (jid && lid) {
        const eName = lastMessage.pushName || await fn.getName(jid);
        await updateContact(jid, { lid: lid, name: eName });
      }
    }
  });
  fn.ev.on('presence.update', async ({ id, presences: update }) => {
    if (!id.endsWith('@g.us')) return;
    const resolvedPresences = {};
    for (const participantId in update) {
      let resolvedJid;
      if (participantId.endsWith('@lid')) {
        resolvedJid = await mongoStore.findJidByLid(participantId);
      } else {
        resolvedJid = jidNormalizedUser(participantId);
      }
      if (!resolvedJid) continue;
      resolvedPresences[resolvedJid] = {
        ...update[participantId],
        lastSeen: Date.now()
      };
    }
    mongoStore.updatePresences(id, resolvedPresences);
    StoreMessages.updatePresences(id, resolvedPresences).catch(err => log(err, true));
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
    await tmpDir.ensureDirectory();
    await initializeDatabases();
    await loadPlugins(path.join(__dirname, '..', 'src', 'plugins'));
    await initializeFuse();
    startPluginWatcher();
    mongoStore.init();
    fn = await createWASocket(dbSettings);
    setupWhatsAppEventHandlers(fn);
    await performanceManager.initialize(fn, config, dbSettings);
  } catch (error) {
    log(error, true)
    await log(`Startup error: ${error}`, true);
    await log(error, true);
    await handleRestart('Gagal memuat database store');
  }
};

async function cleanup(signal) {
  await log(`[${signal}] Enhanced cleanup initiated...`);
  try {
    if (dbSettings) {
      await Settings.updateSettings(dbSettings);
    }
    if (mongoStore) {
      await mongoStore.disconnect();
    }
    if (database?.isConnected) {
      await database.disconnect();
    }
    await log(`Enhanced cleanup completed successfully.`);
  } catch (error) {
    await log(`Cleanup error: ${error}`);
    await log(error, true);
  } finally {
    process.exit(0);
  }
}

process.on('SIGINT', () => cleanup('SIGINT'));
process.on('SIGTERM', () => cleanup('SIGTERM'));
process.on('SIGUSR2', () => cleanup('SIGUSR2'));

process.on('unhandledRejection', async (reason, promise) => {
  await log(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});
process.on('uncaughtException', async (error) => {
  await log(`Uncaught Exception: ${error}`);
  await log(error, true);
  await performanceManager.cache.forceSync();
  process.exit(1);
});

try {
  await starts();
} catch (error) {
  await log(`Fatal startup error: ${error}`);
  await log(error, true);
  process.exit(1);
}