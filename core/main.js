// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info main.js ────────────────────────

// console.clear(); // only effect if you use screen / tmux (pm2 didnt work)
global.activeIntervals = [];
import util from 'util';
import path from 'path';
import cron from 'node-cron';
import process from 'process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const exec = util.promisify(cp_exec);
import { exec as cp_exec } from 'child_process';
import { createWASocket } from './connection.js';
import { randomByte } from '../src/lib/function.js';
import { loadPlugins } from '../src/lib/plugins.js';
import updateContact from '../src/lib/updateContact.js';
import log, { pinoLogger } from '../src/utils/logger.js';
import { handleRestart, initializeFuse } from './handler.js';
import updateMessageUpsert from '../src/lib/updateMessageUpsert.js';
import { initializeDbSettings } from '../src/lib/settingsManager.js';
import processContactUpdate from '../src/lib/processContactUpdate.js';
import groupParticipantsUpdate from '../src/lib/groupParticipantsUpdate.js';
import { database, Settings, mongoStore, Messages, Story } from '../database/index.js';
import { jidNormalizedUser } from 'baileys';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const isPm2 = process.env.pm_id !== undefined || process.env.NODE_APP_INSTANCE !== undefined;
const isSelfRestarted = process.env.RESTARTED_BY_SELF === '1';

function logRestartInfo() {
  log('Starting Engine...')
  log(`Running Mode: ${isPm2 ? 'PM2' : 'Node'} | RestartedBySelf: ${isSelfRestarted}`);
};

let dbSettings;
let debugs = false;

global.randomSuffix = randomByte(16);
global.debugs = debugs;

async function initializeDatabases() {
  try {
    await database.connect();
    await mongoStore.connect();
    dbSettings = await initializeDbSettings();
    pinoLogger.level = dbSettings.pinoLogger || 'silent';
  } catch (error) {
    await log(error, true);
    throw error;
  }
};
async function starts() {
  try {
    await initializeDatabases();
    await loadPlugins(path.join(__dirname, '..', 'src', 'plugins'));
    await initializeFuse();
    mongoStore.init();
    const fn = await createWASocket(dbSettings);
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
        if (daget.participants && daget.participants.length > 0) {
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
    fn.ev.on('groups.upsert', async (newMetas) => {
      for (const daget of newMetas) {
        const id = jidNormalizedUser(daget.id);
        await mongoStore.updateGroupMetadata(id, daget);
        if (daget.participants) {
          for (const participant of daget.participants) {
            const contactJid = jidNormalizedUser(participant.id);
            const contactName = await fn.getName(contactJid);
            await updateContact(contactJid, { lid: participant.lid, name: contactName });
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
        if (!resolvedJid) {
          continue;
        }
        resolvedPresences[resolvedJid] = {
          ...update[participantId],
          lastSeen: Date.now()
        };
      }
      mongoStore.updatePresences(id, update);
      Messages.updatePresences(id, update).catch(err => log(err, true));
    });
    const keepAliveInterval = setInterval(async () => {
      try {
        await fn.query({
          tag: "iq",
          attrs: { to: "s.whatsapp.net", type: "get", xmlns: "w:p" },
        });
      } catch {
        await starts();
      }
    }, 4 * 60 * 1000);
    global.activeIntervals.push(keepAliveInterval);
    const memoryUsageInterval = setInterval(() => {
      const memUsage = process.memoryUsage();
      log(`Memory usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
    }, 300000);
    global.activeIntervals.push(memoryUsageInterval);
    cron.schedule('0 21 * * 2', async () => {
      log('Menjalankan tugas pembersihan data lama...');
      try {
        const chatResult = await Messages.cleanupOldData();
        const storyResult = await Story.cleanupOldData();
        await exec('rm -rf ../logs/*');
        log(`Pembersihan selesai. Messages terhapus: ${chatResult.deletedCount}. Story terhapus: ${storyResult.deletedCount}. Log dihapus.`);
      } catch (error) { await log(error, true); }
    }, {
      scheduled: true,
      timezone: "Asia/Jakarta"
    });
  } catch (error) {
    await log(error, true);
    await handleRestart('Gagal memuat database store');
  }
};
async function cleanup(signal) {
  await log(`[${signal}] Menyimpan data dan membersihkan interval yang aktif sebelum keluar...`);
  global.activeIntervals.forEach(intervalId => clearInterval(intervalId));
  global.activeIntervals = [];
  try {
    if (dbSettings) {
      await Settings.updateSettings(dbSettings);
    }
    if (mongoStore) {
      await mongoStore.disconnect();
    }
    if (database && database.isConnected) {
      await database.disconnect();
    }
    await log(`[OK] Semua data berhasil disimpan dan koneksi ditutup.`);
  } catch (error) { await log(error, true); }
  process.exit(0);
}

process.on('SIGINT', () => cleanup('SIGINT'));
process.on('SIGTERM', () => cleanup('SIGTERM'));
process.on('SIGUSR2', () => cleanup('SIGUSR2'));

logRestartInfo();
try {
  await starts();
} catch (error) {
  await log(error, true);
  process.exit(1);
}