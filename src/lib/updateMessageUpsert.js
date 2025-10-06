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
import { isBug } from '../utils/security.js';
import { arfine } from '../../core/handler.js';
import { jidNormalizedUser, delay } from 'baileys';
import serializeMessage from './serializeMessage.js';
import { handleAntiEdit } from '../handler/index.js';
import handleGroupStubMessages from './handleGroupStubMessages.js';
import { mongoStore, StoreMessages, StoreStory } from '../../database/index.js';

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
    try {
      const bugType = isBug(m);
      if (bugType && m.key.fromMe === false) {
        const senderJid = m.sender;
        await log(`Bug terdeteksi: "${bugType}" dari ${senderJid}.`);
        if (['Invalid Sender JID', 'TAMA Concuerror Bomb', 'Null-Byte Injection'].includes(bugType)) {
          await fn.updateBlockStatus(senderJid, 'block');
        }
        await fn.deleteBugMessage(m.key, m.messageTimestamp);
        return;
      }
    } catch (error) {
      await log(error, true);
    }
    if (m.messageStubType && m.isGroup) {
      await handleGroupStubMessages(fn, m);
      return;
    }
    if (m.key.remoteJid === 'status@broadcast') {
      if (m.messageStubType === 2) return;
      try {
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
        mongoStore.addStatus(m.sender, m, config.performance.maxStoreSaved);
        StoreStory.addStatus(m.sender, m, config.performance.maxStoreSaved).catch(err => log(err, true));
        return;
      } catch (error) {
        await log(error, true);
      }
      return;
    }
    if (m.isEditedMessage && dbSettings.antiEditMessage) {
      await handleAntiEdit({ mongoStore, fn, m, dbSettings });
    }
    try {
      if (dbSettings.autoread) {
        await fn.readMessages([m.key]);
      }
      if (duplexM.has(m.key.id)) return;
      duplexM.set(m.key.id, Date.now(), config.performance.defaultInterval);
      mongoStore.updateMessages(m.chat, m, config.performance.maxStoreSaved);
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
          mongoStore.updateConversations(m.chat, conversationData, config.performance.maxStoreSaved);
          StoreMessages.addConversation(m.chat, conversationData).catch(err => log(err, true));
        }
      }
      const dependencies = {
        mongoStore,
        dbSettings,
        ownerNumber: config.ownerNumber,
        version: global.version,
      };
      dependencies.isSuggestion = false;
      await arfine(fn, m, dependencies);
      StoreMessages.addMessage(m.chat, m).catch(err => log(err, true));
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