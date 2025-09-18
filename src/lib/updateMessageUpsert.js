// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info updateMessageUpsert.js ──────────

import util from 'util';
import config from '../../config.js';
import log from '../utils/logger.js';
import { arfine } from '../../core/handler.js';
import { isBug } from '../utils/security.js';
import { jidNormalizedUser, delay } from 'baileys';
import serializeMessage from './serializeMessage.js';
import { mongoStore, Messages, Story } from '../../database/index.js';
import handleGroupStubMessages from './handleGroupStubMessages.js';

class CrotToLive extends Map {
  set(key, value, ttl) {
    super.set(key, value);
    setTimeout(() => this.delete(key), ttl);
  }
};

let duplexM = new CrotToLive();

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
      await log(`Error dalam deteksi bug:\n${error}`, true);
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
        mongoStore.addStatus(m.sender, m, 10000);
        Story.addStatus(m.sender, m, 10000).catch(err => log(err, true));
        return;
      } catch (error) {
        await log(`Error handleStatusBroadcast:\n${error}`, true);
      }
      return;
    }
    try {
      if (dbSettings.autoread) {
        await fn.readMessages([m.key]);
      }
      if (duplexM.has(m.key.id)) return;
      duplexM.set(m.key.id, Date.now(), 60000);
      mongoStore.updateMessages(m.chat, m, 10000);
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
          mongoStore.updateConversations(m.chat, conversationData, 10000);
          Messages.addConversation(m.chat, conversationData).catch(err => log(err, true));
        }
      }
      const dependencies = {
        dbSettings,
        ownerNumber: config.ownerNumber,
        version: global.version,
      };
      dependencies.isSuggestion = false;
      await arfine(fn, m, dependencies);
      Messages.addMessage(m.chat, m).catch(err => log(err, true));
    } catch (error) {
      await log(`Error updateMessageStore:\n${error}`, true);
    }
  } catch (globalError) {
    await log(`Error updateMessageUpsert:\n\n${globalError}`);
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
        await log(`Error refresh session:\n${error}`, true);
      }
    }
  }
};