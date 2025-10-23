// ─── Info ─────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info src/lib/updateMessageUpsert.js ──────────

import util from 'util';
import log from './logger.js';
import config from '../../config.js';
import { analyzeMessage } from 'safety-safe';
import { arfine } from '../../core/handler.js';
import { store } from '../../database/index.js';
import { jidNormalizedUser, delay } from 'baileys';
import serializeMessage from './serializeMessage.js';
import { handleAntiEdit } from '../handler/index.js';
import handleGroupStubMessages from './handleGroupStubMessages.js';

class CrotToLive extends Map {
  set(key, value, ttl) {
    super.set(key, value);
    setTimeout(() => this.delete(key), ttl);
  }
};

const duplexM = new CrotToLive();

export default async function updateMessageUpsert(fn, message, dbSettings) {
  try {
    if (!message?.messages?.[0]) {
      await log(`Pesan tidak valid: struktur message salah`);
      return;
    }
    const msg = message.messages[0];
    if (global.debugs) {
      await log(util.inspect(msg, false, null, true));
    };
    if (!msg.messageTimestamp) {
      await log(`Pesan diabaikan: tidak ada timestamp`);
      return;
    }
    const m = await serializeMessage(fn, msg);
    if (!m) return;
    const { isMalicious, reason, severity } = analyzeMessage(msg.message);
    if (isMalicious) {
      if (m.botnumber.includes(m.sender)) return;
      if (config.ownerNumber.includes(m.sender)) return;
      const senderJid = m.sender;
      log(`Ancaman Terdeteksi dari ${m.sender}`);
      log(`Alasan: ${reason} | Level Bahaya: ${severity}`);
      try {
        await fn.updateBlockStatus(senderJid, 'block');
        await fn.deleteBugMessage(m.key, m.messageTimestamp);
        await fn.sendMessage(config.ownerNumber, { text: `User: @${m.sender.split('@')[0]} udah di blokir otomatis.\nAlasan: *${reason}*.` });
      } catch (err) {
        log(`Gagal ngambil tindakan blokir/hapus: ${err}`, true);
      }
      return;
    }
    if (m.messageStubType && m.isGroup) {
      await handleGroupStubMessages(fn, m);
      return;
    }
    if (m.key.remoteJid === 'status@broadcast') {
      if (m.messageStubType === 2) return;
      try {
        if (m.type === 'protocolMessage' && m.protocolMessage?.type === 'REVOKE' && m.protocolMessage?.key?.remoteJid === 'status@broadcast') {
          return;
        }
        if (m.key.remoteJid && m.key.participant) {
          if (dbSettings.autolikestory) {
            await fn.sendMessage(
              m.key.remoteJid,
              { react: { key: m.key, text: "💚" } },
              {
                statusJidList: [
                  m.key.participant,
                  jidNormalizedUser(fn.user.id)
                ]
              }
            );
          } else if (dbSettings.autoreadsw) {
            await fn.readMessages([m.key]);
          }
        }
        await store.saveStoryStatus(m.sender, m, config.performance.maxStoreSaved);
      } catch (error) {
        await log(`Story handling error: ${error.message}`, true);
      }
      return;
    }
    if (m.isEditedMessage && dbSettings.antiEditMessage) {
      await handleAntiEdit({ store, fn, m, dbSettings });
    }
    try {
      if (dbSettings.autoread) {
        await fn.readMessages([m.key]);
      }
      if (duplexM.has(m.key.id)) return;
      duplexM.set(m.key.id, Date.now(), config.performance.defaultInterval);
      store.saveMessage(m.chat, m, config.performance.maxStoreSaved);
      if (m.type === 'conversation' || m.type === 'extendedTextMessage') {
        if (m.body?.trim()) {
          const conversationData = {
            sender: m.sender,
            text: m.body,
            name: m.pushName,
            timestamp: m.timestamp || Date.now(),
            quoted: m.isQuoted && m.quoted?.body ? m.quoted.body : null,
            quotedSender: m.quoted?.sender || null,
            keyId: m.key.id
          };
          store.saveConversation(m.chat, conversationData, config.performance.maxStoreSaved);
        }
      }
      const dependencies = {
        store,
        dbSettings,
        ownerNumber: config.ownerNumber,
        version: global.version,
      };
      dependencies.isSuggestion = false;
      await arfine(fn, m, dependencies);
    } catch (error) {
      await log(error, true);
    }
  } catch (globalError) {
    await log(globalError, true);
    if (globalError.message?.includes('rate-overlimit')) {
      await log(`Terkena rate limit, menunggu 5 detik...`);
      await delay(5000);
    }
    if (globalError.message?.includes('No matching sessions') ||
      globalError.message?.includes('Bad MAC')) {
      await log(`Error session, mencoba refresh...`);
      try {
        await fn.ev.emit('creds.update', { deleteSessions: [message.messages?.[0]?.key?.remoteJid] });
      } catch (error) {
        await log(error, true);
      }
    }
  }
};