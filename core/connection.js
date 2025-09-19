// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info connection.js ──────────────────

import axios from 'axios';
import readline from 'readline';
import config from '../config.js';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import { clientBot } from './client.js';
import { handleRestart } from './handler.js';
import { parsePhoneNumber } from 'awesome-phonenumber';
import log, { pinoLogger } from '../src/utils/logger.js';
import { AuthStore, BaileysSession } from '../database/auth.js';
import { Settings, mongoStore, GroupMetadata } from '../database/index.js';
import { default as makeWASocket, jidNormalizedUser, Browsers, makeCacheableSignalKeyStore, isJidBroadcast, fetchLatestBaileysVersion } from 'baileys';

let phoneNumber;
let pairingStarted = false;

const pairingCode = process.argv.includes('--qr') ? false : process.argv.includes('--pairing-code') || config.usePairingCode;;
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function getBaileysVersion() {
  try {
    const { version } = await fetchLatestBaileysVersion();
    return version;
  } catch (error) {
    await log(`Failed to fetch Baileys version:\n${error}`, true);
    const { data } = await axios.get("https://raw.githubusercontent.com/wppconnect-team/wa-version/main/versions.json");
    const currentVersion = data.currentVersion;
    if (!currentVersion) throw new Error("Versi saat ini tidak ditemukan dalam data");
    const versionParts = currentVersion.split('.');
    if (versionParts.length < 3) throw new Error("Format versi tidak valid");
    const major = parseInt(versionParts[0]);
    const minor = parseInt(versionParts[1]);
    const build = parseInt(versionParts[2].split('-')[0]);
    if (isNaN(major) || isNaN(minor) || isNaN(build)) throw new Error("Komponen versi tidak valid");
    return [major, minor, build];
  }
};

export async function createWASocket(dbSettings) {
  global.version = await getBaileysVersion();
  const { state, saveCreds } = await AuthStore();
  const fn = makeWASocket({
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: undefined,
    keepAliveIntervalMs: 6000,
    logger: pinoLogger,
    version: global.version,
    browser: Browsers.ubuntu('Chrome'),
    emitOwnEvents: true,
    retryRequestDelayMs: 1000,
    maxMsgRetryCount: 5,
    qrTimeout: 60000,
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pinoLogger) },
    transactionOpts: { maxCommitRetries: 5, delayBetweenTriesMs: 1000 },
    markOnlineOnConnect: true,
    linkPreviewImageThumbnailWidth: 192,
    syncFullHistory: true,
    fireInitQueries: true,
    generateHighQualityLinkPreview: true,
    shouldIgnoreJid: (jid) => { return isJidBroadcast(jid) && jid !== 'status@broadcast'; },
    appStateMacVerification: { patch: true, snapshot: true },
    enableAutoSessionRecreation: true,
    enableRecentMessageCache: true
  });
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
    await BaileysSession.deleteMany({});
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
          await log('Requesting Pairing Code...')
          let code = await fn.requestPairingCode(phoneNumber);
          code = code?.match(/.{1,4}/g)?.join('-') || code;
          await log(`Your Pairing Code : ${code}`);
        }, 3000);
      }
      if (connection === 'open') {
        if (dbSettings.restartState) {
          dbSettings.restartState = false;
          await fn.sendPesan(dbSettings.restartId, `✅ Restart sukses..`, dbSettings.dataM);
          dbSettings.restartId = undefined;
          dbSettings.dataM = {};
          await Settings.updateSettings(dbSettings);
        }
        await log(`Menghubungkan ke WhatsApp...`);
        const participatingGroups = await fn.groupFetchAllParticipating();
        await log('Memulai sinkronisasi data grup...');
        try {
          const currentGroupIds = new Set(Object.keys(participatingGroups));
          const storedMetadatas = await GroupMetadata.find({}, { groupId: 1, _id: 0 }).lean();
          const storedGroupIds = storedMetadatas.map(g => g.groupId);
          const staleGroupIds = storedGroupIds.filter(id => !currentGroupIds.has(id));
          if (staleGroupIds.length > 0) {
            await log(`Mendeteksi ${staleGroupIds.length} grup usang. Memulai pembersihan...`);
            const deleteResult = await GroupMetadata.deleteMany({ groupId: { $in: staleGroupIds } });
            await log(`Pembersihan database selesai: ${deleteResult.deletedCount} metadata grup usang telah dihapus.`);
            staleGroupIds.forEach(id => mongoStore.clearGroupCacheByKey(id));
            await log(`Cache untuk ${staleGroupIds.length} grup usang telah dibersihkan dari StoreDB.`);
          } else {
            await log('Sinkronisasi selesai. Tidak ada data grup usang ditemukan.');
          }
        } catch (error) {
          await log(`Terjadi kesalahan saat sinkronisasi data grup: ${error}`, true);
        }
        await log(`WA Version: ${global.version.join('.')}`);
        await log(`BOT Number: ${jidNormalizedUser(fn.user.id).split('@')[0]}`);
        await log(`${dbSettings.botName} Berhasil tersambung ke whatsapp...`);
        if (config.restartAttempts > 0) {
          process.env.RESTART_ATTEMPTS = '0';
        }
      }
      if (connection === 'close') {
        await log(`[DISCONNECTED] Connection closed. Code: ${statusCode}`);
        const code = [401, 402, 403, 411, 500];
        if (code.includes(statusCode)) {
          dbSettings.botNumber = null;
          await BaileysSession.deleteMany({});
          await Settings.updateSettings(dbSettings);
          process.exit(1);
        } else {
          await handleRestart(`Koneksi terputus dengan kode ${statusCode}`);
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
      await log(`Error connection.update:\n${error}`, true);
    }
  });
  return fn;
}