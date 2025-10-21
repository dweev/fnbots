// ─── Info ─────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info core/connection.js ──────────────────

import 'dotenv/config.js';
import readline from 'readline';
import config from '../config.js';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import { clientBot } from './client.js';
import AuthStore from '../database/auth.js';
import { parsePhoneNumber } from 'awesome-phonenumber';
import log, { pinoLogger } from '../src/lib/logger.js';
import { Settings, store } from '../database/index.js';
import { fetch as nativeFetch } from '../src/addon/bridge.js';
import { restartManager } from '../src/lib/restartManager.js';
import { default as makeWASocket, jidNormalizedUser, Browsers, makeCacheableSignalKeyStore, fetchLatestWaWebVersion, isJidBroadcast } from 'baileys';

let phoneNumber;
let pairingStarted = false;

const pairingCode = process.argv.includes('--qr') ? false : process.argv.includes('--pairing-code') || config.usePairingCode;
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function getBaileysVersion() {
  try {
    const { version } = await fetchLatestWaWebVersion();
    return version;
  } catch (error) {
    await log(`Failed to fetch latest Baileys version, using fallback:\n${error.message}`, true);
    const response = await nativeFetch("https://raw.githubusercontent.com/wppconnect-team/wa-version/main/versions.json");
    if (!response.ok) throw new Error(`Fallback failed with status: ${response.status}`);
    const data = await response.json();
    const currentVersion = data.currentVersion;
    if (!currentVersion) throw new Error("Versi saat ini tidak ditemukan dalam data fallback");
    const versionParts = currentVersion.split('.');
    if (versionParts.length < 3) throw new Error("Format versi fallback tidak valid");
    const [major, minor] = versionParts.map(p => parseInt(p));
    const build = parseInt(versionParts[2].split('-')[0]);
    if (isNaN(major) || isNaN(minor) || isNaN(build)) throw new Error("Komponen versi fallback tidak valid");
    return [major, minor, build];
  }
};

export async function createWASocket(dbSettings) {
  global.version = await getBaileysVersion();
  const authStore = await AuthStore();
  const { state, saveCreds } = authStore;
  const fn = makeWASocket({
    qrTimeout: config.performance.qrTimeout,
    connectTimeoutMs: config.performance.connectTimeoutMs,
    keepAliveIntervalMs: config.performance.keepAliveIntervals,
    defaultQueryTimeoutMs: undefined,
    logger: pinoLogger,
    version: [2, 3000, 1028718893],
    browser: Browsers.ubuntu('Chrome'),
    emitOwnEvents: true,
    retryRequestDelayMs: 1000,
    maxMsgRetryCount: 5,
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pinoLogger) },
    transactionOpts: { maxCommitRetries: 5, delayBetweenTriesMs: 1000 },
    markOnlineOnConnect: true,
    linkPreviewImageThumbnailWidth: 192,
    syncFullHistory: true,
    fireInitQueries: true,
    generateHighQualityLinkPreview: true,
    shouldIgnoreJid: (jid) => { return isJidBroadcast(jid) && jid !== 'status@broadcast'; },
    appStateMacVerification: { patch: true, snapshot: true },
  });

  fn.clearSession = authStore.clearSession;
  fn.storeLIDMapping = authStore.storeLIDMapping;
  fn.getPN = authStore.getPNForLID;
  fn.getLID = authStore.getLIDForPN;
  fn.restoreSession = authStore.restoreSession;
  fn.resetRetryAttempts = authStore.resetRetryAttempts;

  if (pairingCode && !phoneNumber && !fn.authState.creds.registered) {
    let numberToValidate = config.botNumber ? config.botNumber : dbSettings.botNumber;
    let isValid = false;
    while (!isValid) {
      if (!numberToValidate) {
        numberToValidate = await question('Please type your WhatsApp number : ');
      }
      const cleanedNumber = numberToValidate.replace(/[^0-9]/g, '');
      if (cleanedNumber.length >= 9 && parsePhoneNumber('+' + cleanedNumber).valid) {
        phoneNumber = cleanedNumber;
        dbSettings.botNumber = cleanedNumber;
        await Settings.updateSettings(dbSettings);
        isValid = true;
        await log('Phone number valid, continuing...');
      } else {
        await log('Invalid number. Start with your country code and make sure it is correct, Example: 628123456789');
        numberToValidate = null;
      }
    }
    await authStore.clearSession();
    dbSettings.botNumber = null;
    await Settings.updateSettings(dbSettings);
  };
  await clientBot(fn, dbSettings);
  fn.ev.on('creds.update', saveCreds);
  fn.ev.on('connection.update', async ({ connection, lastDisconnect, qr, isNewLogin }) => {
    const statusCode = lastDisconnect?.error ? new Boom(lastDisconnect.error).output.statusCode : 0;
    try {
      if ((connection === 'connecting' || !!qr) && pairingCode && phoneNumber && !fn.authState.creds.registered && !pairingStarted) {
        setTimeout(async () => {
          pairingStarted = true;
          await log('Requesting Pairing Code...');
          let code = await fn.requestPairingCode(phoneNumber);
          code = code?.match(/.{1,4}/g)?.join('-') || code;
          await log(`Your Pairing Code : ${code}`);
        }, 3000);
      }
      if (connection === 'open') {
        restartManager.reset();
        if (dbSettings.restartState) {
          dbSettings.restartState = false;
          if (dbSettings.restartId.includes('@g.us')) {
            const res = await fn.groupMetadata(dbSettings.restartId);
            await fn.sendPesan(dbSettings.restartId, `Restart sukses..`, { ephemeralExpiration: res.ephemeralDuration ?? 0 });
          }
          if (dbSettings.restartId.includes('@s.whatsapp.net')) {
            const expiration = await fn.getEphemeralExpiration(dbSettings.restartId);
            await fn.sendPesan(dbSettings.restartId, `Restart sukses..`, { ephemeralExpiration: expiration });
          }
          dbSettings.restartId = undefined;
          await Settings.updateSettings(dbSettings);
        }
        await log(`Connecting to WhatsApp...`);
        try {
          await log('Starting group data synchronization...');
          const participatingGroups = await fn.groupFetchAllParticipating();
          const currentGroupIds = new Set(Object.keys(participatingGroups));
          const groupsToUpdate = Object.values(participatingGroups);
          await log(`Fetched ${groupsToUpdate.length} active groups from WhatsApp`);
          if (groupsToUpdate.length > 0) {
            await store.bulkUpsertGroups(groupsToUpdate);
          }
          await log('Checking for stale groups...');
          const syncResult = await store.syncStaleGroups(currentGroupIds);
          if (syncResult.removed > 0) {
            await log(`Cleaned up ${syncResult.removed} stale groups`);
          }
          if (syncResult.errors > 0) {
            await log(`${syncResult.errors} errors during cleanup`, true);
          }
          await log('Group synchronization completed successfully.');
        } catch (error) {
          await log(`Error during group sync: ${error}`, true);
        }
        await log(`WA Version: ${global.version.join('.')}`);
        await log(`BOT Number: ${jidNormalizedUser(fn.user.id).split('@')[0]}`);
        await log(`${dbSettings.botName} Success Connected to whatsapp...`);
        await fn.storeLIDMapping().catch(err => log(`Background LID sync failed: ${err.message}`, true));
        await fn.resetRetryAttempts();
        setInterval(() => {
          fn.storeLIDMapping().catch(err => log(`Periodic LID sync failed: ${err.message}`, true));
        }, 6 * 60 * 60 * 1000);
      }
      if (connection === 'close') {
        await log(`Connection closed. Code: ${statusCode}`);
        const errorMessage = lastDisconnect?.error?.message || '';
        if (errorMessage.includes('QR refs attempts ended')) {
          await log('Pairing code timeout. Silakan restart dan input code lebih cepat.', true);
          return await restartManager.restart('Pairing code timeout', (await import('../src/lib/performanceManager.js')).performanceManager);
        }
        const code = [401, 402, 403, 411, 503];
        if (code.includes(statusCode)) {
          dbSettings.botNumber = null;
          await authStore.clearSession();
          await Settings.updateSettings(dbSettings);
          restartManager.forceExit(1);
        } else if (statusCode === 500) {
          const restoreResult = await fn.restoreSession(5);
          if (restoreResult.shouldClearSession) {
            await log('Max retry attempts reached. Clearing session...', true);
            dbSettings.botNumber = null;
            await authStore.clearSession();
            await Settings.updateSettings(dbSettings);
            restartManager.forceExit(1);
          } else if (restoreResult.success) {
            await log(`Session restored (attempt ${restoreResult.attempt}). Restarting...`);
            await restartManager.restart(`Session restored, reconnecting (attempt ${restoreResult.attempt})`, (await import('../src/lib/performanceManager.js')).performanceManager);
          } else {
            await log(`Session restore failed (attempt ${restoreResult.attempt}). Retrying...`);
            await restartManager.restart(`Retry connection (attempt ${restoreResult.attempt})`, (await import('../src/lib/performanceManager.js')).performanceManager);
          }
        } else {
          await restartManager.restart(`Connection closed: ${statusCode}`, (await import('../src/lib/performanceManager.js')).performanceManager);
        }
      }
      if (isNewLogin) await log(`New device detected, session restarted!`);
      if (qr) {
        if (!pairingCode) {
          log('Scan QR berikut:');
          qrcode.generate(qr, { small: true }, (qrcodeString) => {
            const qrStr = String(qrcodeString);
            log(`\n${qrStr}`);
          });
        }
      }
    } catch (error) {
      await log(`Connection update error: ${error}`, true);
      await log(error, true);
    }
  });
  return { fn, authStore };
}