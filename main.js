// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info main.js ────────────────────────

import util from 'util';
import path from 'path';
import cron from 'node-cron';
import process from 'process';
import { dirname } from 'path';
import config from './config.js';
import { fileURLToPath } from 'url';
import { isBug } from './src/utils/security.js';
import { randomByte } from './src/lib/function.js';
import { loadPlugins } from './src/lib/plugins.js';
import { createWASocket } from './core/connection.js';
import log, { pinoLogger } from './src/utils/logger.js';
import { initializeDbSettings } from './src/lib/settingsManager.js';
import { arfine, handleRestart, initializeFuse } from './core/handler.js';
import { database, Settings, mongoStore, GroupMetadata, Messages, Story } from './database/index.js';
import { jidNormalizedUser, extractMessageContent, getDevice, areJidsSameUser, WAMessageStubType, delay } from 'baileys';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const isPm2 = process.env.pm_id !== undefined || process.env.NODE_APP_INSTANCE !== undefined;
const isSelfRestarted = process.env.RESTARTED_BY_SELF === '1';

function logRestartInfo() {
  log(`Mode Jalankan: ${isPm2 ? 'PM2' : 'Manual'} | RestartedBySelf: ${isSelfRestarted}`);
};

class CrotToLive extends Map {
  set(key, value, ttl) {
    super.set(key, value);
    setTimeout(() => this.delete(key), ttl);
  }
};

let dbSettings;
let duplexM = new CrotToLive();
let debugs = false;

global.tmpDir = './src/sampah';
global.randomSuffix = randomByte(16);
global.debugs = debugs;

async function initializeDatabases() {
  try {
    await database.connect();
    await mongoStore.connect();
    dbSettings = await initializeDbSettings();
    pinoLogger.level = dbSettings.pinoLogger || 'silent';
  } catch (error) {
    await log(`Database initialization failed:\n${error}`, true);
    throw error;
  }
};

// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

async function processContactUpdate(contact) {
  let trueJid;
  const idFromEvent = contact.id;
  if (idFromEvent.endsWith('@s.whatsapp.net')) {
    trueJid = jidNormalizedUser(idFromEvent);
  } else if (idFromEvent.endsWith('@lid')) {
    trueJid = await mongoStore.findJidByLid(idFromEvent);
  }
  if (!trueJid) return;
  const dataToUpdate = {};
  const nameToUpdate = contact.notify || contact.name;
  if (idFromEvent.endsWith('@lid')) {
    dataToUpdate.lid = idFromEvent;
  }
  if (nameToUpdate) {
    dataToUpdate.name = nameToUpdate;
  }
  if (Object.keys(dataToUpdate).length === 0) return;
  await updateContact(trueJid, dataToUpdate);
};
async function updateContact(jid, data = {}) {
  if (!jid || !jid.endsWith('@s.whatsapp.net')) return;
  try {
    await mongoStore.updateContact(jid, data);
  } catch (error) {
    await log(`Error updating contact: ${error}`, true);
  }
};
async function handleGroupStubMessages(fn, m) {
  if (!m.chat) return;
  let needsMetadataRefresh = false;
  const normalizedTarget = m.messageStubParameters?.[0];
  if (!normalizedTarget) return;
  switch (m.messageStubType) {
    case 20:
    case 27:
    case 29:
    case 30:
      needsMetadataRefresh = true;
      break;
    case 28:
    case 32:
      if (m.fromMe && (jidNormalizedUser(fn.user.id) === normalizedTarget)) return;
      needsMetadataRefresh = true;
      break;
    default:
      if (m.messageStubType !== 2) {
        await log({ messageStubType: m.messageStubType, messageStubParameters: m.messageStubParameters, type: WAMessageStubType[m.messageStubType] });
      }
      break;
  }
  if (needsMetadataRefresh) {
    try {
      const freshMetadata = await fn.groupMetadata(m.chat);
      if (!freshMetadata) return;
      await mongoStore.updateGroupMetadata(m.chat, freshMetadata);
      if (freshMetadata.participants) {
        for (const participant of freshMetadata.participants) {
          const contactJid = jidNormalizedUser(participant.id);
          const contactName = fn.getName(contactJid);
          await updateContact(contactJid, { lid: participant.lid, name: contactName });
        }
      }
    } catch (error) {
      await log(`Error handleGroupStubMessages ${m.chat}\n${error}`, true);
    }
  }
};
async function updateMessageUpsert(fn, message) {
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
async function groupParticipantsUpdate({ id, participants, action }, fn) {
  log(`Event: group-participants.update | Aksi: ${action} | Grup: ${id}`);
  try {
    const botJid = jidNormalizedUser(fn.user.id);
    switch (action) {
      case 'add': {
        let isBotAdded = false;
        for (const userId of participants) {
          const addedMemberJid = userId.endsWith('@lid') ?
            await mongoStore.findJidByLid(userId) : jidNormalizedUser(userId);
          if (addedMemberJid && addedMemberJid === botJid) {
            isBotAdded = true;
            break;
          }
        }
        if (isBotAdded) {
          try {
            const freshMetadata = await fn.groupMetadata(id);
            if (freshMetadata) {
              await mongoStore.updateGroupMetadata(id, freshMetadata);
              const botParticipant = freshMetadata.participants.find(p => p.id === botJid || jidNormalizedUser(p.id) === botJid);
              if (botParticipant && botParticipant.admin) {
                log(`Bot adalah admin di grup ${id}. Siap untuk operasi.`);
              } else {
                log(`Bot bukan admin di grup ${id}.`);
              }
            }
          } catch (metadataError) {
            log(`Gagal mendapatkan metadata grup setelah bot ditambahkan: ${metadataError}`, true);
          }
        } else {
          const freshMetadata = await fn.groupMetadata(id);
          if (freshMetadata) await mongoStore.updateGroupMetadata(id, freshMetadata);
        }
        break;
      }
      case 'remove': {
        let isBotRemoved = false;
        for (const userId of participants) {
          const leaveMemberJid = userId.endsWith('@lid') ? await mongoStore.findJidByLid(userId) : jidNormalizedUser(userId);
          if (leaveMemberJid && leaveMemberJid === botJid) {
            isBotRemoved = true;
            break;
          }
        }
        if (isBotRemoved) {
          log(`Bot dikeluarkan dari grup ${id}. Membersihkan metadata...`);
          await GroupMetadata.deleteOne({ groupId: id });
          mongoStore.clearGroupCacheByKey(id);
          return;
        } else {
          const freshMetadata = await fn.groupMetadata(id);
          if (freshMetadata) await mongoStore.updateGroupMetadata(id, freshMetadata);
        }
        break;
      }
      case 'promote':
      case 'demote': {
        let isBotAffected = false;
        for (const userId of participants) {
          const affectedMemberJid = userId.endsWith('@lid') ? await mongoStore.findJidByLid(userId) : jidNormalizedUser(userId);
          if (affectedMemberJid && affectedMemberJid === botJid) {
            isBotAffected = true;
            break;
          }
        }
        if (isBotAffected) {
          try {
            const freshMetadata = await fn.groupMetadata(id);
            if (freshMetadata) await mongoStore.updateGroupMetadata(id, freshMetadata);
          } catch (metadataError) {
            log(`Gagal mendapatkan metadata grup setelah perubahan admin: ${metadataError}`, true);
          }
        } else {
          const newStatus = action === 'promote' ? 'admin' : null;
          const currentMetadata = await mongoStore.getGroupMetadata(id);
          if (currentMetadata && currentMetadata.participants) {
            let metadataChanged = false;
            currentMetadata.participants.forEach(p => {
              if (participants.includes(p.id)) {
                p.admin = newStatus;
                metadataChanged = true;
              }
            });
            if (metadataChanged) {
              await mongoStore.updateGroupMetadata(id, currentMetadata);
            }
          }
        }
        break;
      }
    }
    const finalMetadata = await mongoStore.getGroupMetadata(id);
    if (finalMetadata && finalMetadata.participants) {
      for (const participant of finalMetadata.participants) {
        if (participant.id && participant.lid) {
          await updateContact(participant.id, { lid: participant.lid });
        }
      }
    }
  } catch (error) {
    log(`Error saat menangani group-participants.update untuk ${id}:\n${error}`, true);
  }
};
async function serializeMessage(fn, msg) {
  let botNumber = fn.decodeJid(fn.user?.id);
  let groupAdmins = [];
  let mfrom = null;
  let mchat = null;
  const m = {};
  if (msg.key) {
    const key = { ...msg.key };
    m.isGroup = key.remoteJid.endsWith('@g.us');
    if (m.isGroup) {
      delete key.remoteJidAlt;
    } else {
      if (key.remoteJid !== "status@broadcast") {
        delete key.participant;
        delete key.participantAlt;
      }
    }
    m.key = key;
    m.fromMe = msg.key.fromMe;
    mfrom = msg.key.remoteJid.startsWith('status') ? jidNormalizedUser(msg.key.participant) : jidNormalizedUser(msg.key.remoteJid);
    mchat = msg.key.remoteJid;
  }
  const isStatus = mchat === 'status@broadcast';
  if (msg.messageStubType) {
    m.messageStubType = msg.messageStubType;
    const rawParams = msg.messageStubParameters || [];
    const resolvedParams = [];
    for (const param of rawParams) {
      if (typeof param === 'string' && param.endsWith('@lid')) {
        const jidFromStore = await mongoStore.findJidByLid(param);
        resolvedParams.push(jidFromStore || param);
      } else {
        resolvedParams.push(param);
      }
    }
    m.messageStubParameters = resolvedParams;
    return m;
  }
  const getContentType = (content) => {
    if (content) {
      const keys = Object.keys(content);
      const key = keys.find(k => (k === 'conversation' || k.endsWith('Message') || k.includes('V2') || k.includes('V3')) && k !== 'senderKeyDistributionMessage');
      return key;
    }
  };
  const unwrapMessage = (msg) => {
    if (!msg || typeof msg !== 'object') return null;
    if (msg.viewOnceMessageV2?.message) return unwrapMessage(msg.viewOnceMessageV2.message);
    if (msg.viewOnceMessageV2Extension?.message) return unwrapMessage(msg.viewOnceMessageV2Extension.message);
    if (msg.viewOnceMessage?.message) return unwrapMessage(msg.viewOnceMessage.message);
    if (msg.ephemeralMessage?.message) return unwrapMessage(msg.ephemeralMessage.message);
    if (msg.protocolMessage?.type === 14) {
      const contentType = getContentType(msg.protocolMessage);
      if (contentType && msg.protocolMessage[contentType]) return unwrapMessage(msg.protocolMessage[contentType]);
    }
    if (msg.contextInfo?.quotedMessage) msg.contextInfo.quotedMessage = unwrapMessage(msg.contextInfo.quotedMessage);
    if (msg.message) {
      const extracted = extractMessageContent(msg.message);
      if (extracted) msg.message = extracted;
    }
    return msg;
  };
  if (!msg || !msg.message) return null;
  m.message = unwrapMessage(msg.message);
  let senderJid, senderLid;
  if (isStatus) {
    const p = msg.key.participant;
    const pAlt = msg.key.remoteJidAlt;
    const authorJid = p?.endsWith('@s.whatsapp.net') ? jidNormalizedUser(p) : (pAlt?.endsWith('@s.whatsapp.net') ? jidNormalizedUser(pAlt) : null);
    const authorLid = p?.endsWith('@lid') ? p : (pAlt?.endsWith('@lid') ? pAlt : null);
    m.participant = authorJid || authorLid;
    mfrom = m.participant;
    mchat = m.participant;
    m.key.participant = authorJid;
    m.key.participantAlt = authorLid;
    if (authorJid && authorLid) {
      senderJid = authorJid;
      senderLid = authorLid;
    }
  } else if (m.isGroup) {
    const participant = jidNormalizedUser(msg.key.participant);
    const participantAlt = jidNormalizedUser(msg.key.participantAlt);
    senderJid = participant?.endsWith('@s.whatsapp.net') ? participant : (participantAlt?.endsWith('@s.whatsapp.net') ? participantAlt : null);
    senderLid = participant?.endsWith('@lid') ? participant : (participantAlt?.endsWith('@lid') ? participantAlt : null);
    m.participant = senderJid || participant;
    m.key.participant = senderJid;
    m.key.participantAlt = senderLid || senderJid;
  } else {
    const remoteJid = jidNormalizedUser(msg.key.remoteJid);
    const remoteJidAlt = jidNormalizedUser(msg.key.remoteJidAlt);
    senderJid = remoteJid?.endsWith('@s.whatsapp.net') ? remoteJid : (remoteJidAlt?.endsWith('@s.whatsapp.net') ? remoteJidAlt : null);
    senderLid = remoteJid?.endsWith('@lid') ? remoteJid : (remoteJidAlt?.endsWith('@lid') ? remoteJidAlt : null);
    mfrom = senderJid || remoteJid;
    mchat = mfrom;
    m.participant = mfrom;
    m.key.remoteJid = senderJid;
    m.key.remoteJidAlt = senderLid || senderJid;
  }
  if (senderJid && senderLid) {
    const contactName = msg.pushName || (await mongoStore.getContact(senderJid))?.name || await fn.getName(senderJid);
    await updateContact(senderJid, { lid: senderLid, name: contactName });
  }
  if (m.isGroup) {
    let metadata = await mongoStore.getGroupMetadata(mchat);
    if (!metadata) {
      metadata = await fn.groupMetadata(mchat);
      if (metadata) {
        await mongoStore.updateGroupMetadata(mchat, metadata);
      }
    }
    m.metadata = metadata?.toJSON ? metadata.toJSON() : metadata;
    if (m.metadata?.participants) {
      m.metadata.participants = m.metadata.participants.map(p => ({
        id: p.id,
        admin: p.admin || null
      }));
    }
    groupAdmins = m.metadata?.participants?.reduce((a, b) => {
      if (b.admin) a.push({ id: b.id, admin: b.admin });
      return a;
    }, []) || [];
  }
  m.from = mfrom;
  m.chat = mchat;
  m.sender = m.participant;
  m.botnumber = botNumber;
  if (m.isGroup) {
    m.isAdmin = groupAdmins.some(b => b.id === m.sender);
    m.isBotAdmin = !!groupAdmins.find(member => member.id === botNumber);
  }
  m.pushName = msg.pushName;
  if (m.message) {
    m.type = getContentType(m.message) || Object.keys(m.message)[0];
    const kamuCrot = m.message[m.type] || m.message;
    m.body = m.message?.conversation || kamuCrot?.text || kamuCrot?.conversation || kamuCrot?.caption || kamuCrot?.selectedButtonId || kamuCrot?.singleSelectReply?.selectedRowId || kamuCrot?.selectedId || kamuCrot?.contentText || kamuCrot?.selectedDisplayText || kamuCrot?.title || kamuCrot?.name || '';
    const rawMentionedJid = kamuCrot?.contextInfo?.mentionedJid || [];
    const resolvedJids = [];
    for (const mentionId of rawMentionedJid) {
      if (mentionId.endsWith('@lid')) {
        const jidFromStore = await mongoStore.findJidByLid(mentionId);
        resolvedJids.push(jidFromStore || mentionId);
      } else {
        resolvedJids.push(mentionId);
      }
    }
    m.mentionedJid = resolvedJids;
    m.device = getDevice(m.key.id);
    m.expiration = kamuCrot?.contextInfo?.expiration || 0;
    const parseTimestamp = (t) => typeof t === 'number' ? t : t?.low || t?.high || 0;
    m.timestamp = parseTimestamp(msg.messageTimestamp) || 0;
    m.isMedia = !!kamuCrot?.mimetype || !!kamuCrot?.thumbnailDirectPath;
    if (m.isMedia) {
      m.mime = kamuCrot?.mimetype;
      m.size = kamuCrot?.fileLength;
      m.height = kamuCrot?.height || '';
      m.width = kamuCrot?.width || '';
      if (/webp/i.test(m.mime)) m.isAnimated = kamuCrot?.isAnimated;
    }
    if (m.type === 'reactionMessage') { m.reaction = kamuCrot; m.reaction.sender = m.sender; m.reaction.chat = m.chat; }
    if (m.type === 'protocolMessage') { m.protocolMessage = kamuCrot; }
    if (m.type === 'buttonsResponseMessage') { m.selectedButtonId = kamuCrot.selectedButtonId; m.selectedButtonText = kamuCrot.selectedDisplayText || ''; }
    if (m.type === 'listResponseMessage') { m.selectedRowId = kamuCrot.singleSelectReply?.selectedRowId || ''; m.selectedRowTitle = kamuCrot.title || ''; m.selectedRowDescription = kamuCrot.description || ''; }
    if (m.type === 'pollCreationMessage') { m.poll = kamuCrot; }
    if (m.type === 'pollUpdateMessage') { m.pollUpdate = kamuCrot; }
    if (m.type === 'pollResponseMessage') { m.pollResponse = kamuCrot; }
    if (m.type === 'messageContextInfo' && kamuCrot?.edit) { m.editedMessage = kamuCrot.edit; }
    if (kamuCrot?.contextInfo?.participant?.endsWith('@lid')) {
      const participantLid = kamuCrot.contextInfo.participant;
      const jidFromStore = await mongoStore.findJidByLid(participantLid);
      if (jidFromStore) {
        kamuCrot.contextInfo.participant = jidFromStore;
      }
    }
    m.isQuoted = !!kamuCrot?.contextInfo?.quotedMessage;
    if (m.isQuoted) {
      const quotedInfo = kamuCrot.contextInfo;
      m.quoted = unwrapMessage(quotedInfo.quotedMessage);
      if (m.quoted) {
        m.quoted.type = getContentType(m.quoted) || Object.keys(m.quoted)[0];
        const akuCrot = m.quoted[m.quoted.type] || m.quoted;
        m.quoted.isMedia = !!akuCrot?.mimetype || !!akuCrot?.thumbnailDirectPath;
        m.quoted.key = {
          remoteJid: m.chat,
          participant: jidNormalizedUser(quotedInfo.participant),
          fromMe: areJidsSameUser(jidNormalizedUser(quotedInfo.participant), jidNormalizedUser(fn?.user?.id)),
          id: quotedInfo.stanzaId,
        };
        m.quoted.sender = jidNormalizedUser(m.quoted.key.participant);
        if (m.quoted.sender.endsWith('@lid')) {
          const jidFromStore = await mongoStore.findJidByLid(m.quoted.sender);
          if (jidFromStore) {
            m.quoted.key.participant = jidFromStore;
            m.quoted.sender = jidFromStore;
          }
        }
        if (akuCrot?.contextInfo) {
          const rawQuotedMentionedJid = akuCrot.contextInfo.mentionedJid || [];
          const lidToJidMap = new Map();
          const resolvedJids = await Promise.all(
            rawQuotedMentionedJid.map(async (mentionId) => {
              if (mentionId.endsWith('@lid')) {
                const jidFromStore = await mongoStore.findJidByLid(mentionId);
                if (jidFromStore) {
                  lidToJidMap.set(mentionId.split('@')[0], jidFromStore.split('@')[0]);
                  return jidFromStore;
                }
              }
              return mentionId;
            })
          );
          m.quoted.mentionedJid = resolvedJids;
          akuCrot.contextInfo.mentionedJid = resolvedJids;
          let quotedBody = akuCrot?.text || akuCrot?.caption || akuCrot?.conversation || akuCrot?.selectedButtonId || akuCrot?.singleSelectReply?.selectedRowId || akuCrot?.selectedId || akuCrot?.contentText || akuCrot?.selectedDisplayText || akuCrot?.title || akuCrot?.name || m.quoted.caption || m.quoted.conversation || m.quoted.contentText || m.quoted.selectedDisplayText || m.quoted.title || '';
          for (const [lid, jid] of lidToJidMap.entries()) {
            quotedBody = quotedBody.replace(new RegExp(`@${lid}`, 'g'), `@${jid}`);
          }
          akuCrot.text = quotedBody;
          m.quoted.body = quotedBody;
        } else {
          m.quoted.mentionedJid = [];
          m.quoted.body = akuCrot?.text || akuCrot?.caption || akuCrot?.conversation || akuCrot?.selectedButtonId || akuCrot?.singleSelectReply?.selectedRowId || akuCrot?.selectedId || akuCrot?.contentText || akuCrot?.selectedDisplayText || akuCrot?.title || akuCrot?.name || m.quoted.caption || m.quoted.conversation || m.quoted.contentText || m.quoted.selectedDisplayText || m.quoted.title || '';
        }
        m.quoted.expiration = akuCrot?.contextInfo?.expiration || 0;
        if (m.quoted.isMedia) {
          m.quoted.mime = akuCrot?.mimetype;
          m.quoted.size = akuCrot?.fileLength;
          m.quoted.height = akuCrot?.height || '';
          m.quoted.width = akuCrot?.width || '';
          if (/webp/i.test(m.quoted.mime)) m.quoted.isAnimated = akuCrot?.isAnimated || false;
        }
      }
    }
  }
  return m;
};
async function starts() {
  try {
    await initializeDatabases();
    await loadPlugins(path.join(__dirname, 'src', 'plugins'));
    await initializeFuse();
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
      await updateMessageUpsert(fn, message);
    });
    fn.ev.on('group-participants.update', async (update) => {
      await groupParticipantsUpdate(update, fn);
    });
    fn.ev.on('groups.update', async (updates) => {
      for (const newMeta of updates) {
        const id = jidNormalizedUser(newMeta.id);
        await mongoStore.updateGroupMetadata(id, {
          ...((await mongoStore.getGroupMetadata(id)) || {}),
          ...newMeta
        });
        if (newMeta.participants) {
          for (const participant of newMeta.participants) {
            const contactJid = jidNormalizedUser(participant.id);
            const contactName = await fn.getName(contactJid);
            await updateContact(contactJid, { lid: participant.lid, name: contactName });
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
    setInterval(async () => {
      try {
        await fn.query({
          tag: "iq",
          attrs: { to: "s.whatsapp.net", type: "get", xmlns: "w:p" },
        });
      } catch {
        await starts();
      }
    }, 4 * 60 * 1000);
    cron.schedule('0 21 * * 2', async () => {
    log('Menjalankan tugas pembersihan data lama...');
    try {
        const chatResult = await Messages.cleanupOldData();
        const storyResult = await Story.cleanupOldData();
        log(`Pembersihan selesai. Messages terhapus: ${chatResult.deletedCount}. Story terhapus: ${storyResult.deletedCount}.`);
    } catch (error) {
        log(`Terjadi error saat tugas pembersihan data: ${error}`, true);
    }
}, {
    scheduled: true,
    timezone: "Asia/Jakarta"
});

  } catch (error) {
    await log(`Error loadStore\n${error}`, true);
    await handleRestart('Gagal memuat database store');
  }
};
async function cleanup(signal) {
  await log(`[${signal}] Menyimpan data sebelum keluar...`);
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
  } catch (error) {
    await log(`Error_cleanup:\n${error}`, true);
  }
  process.exit(0);
}

process.on('SIGINT', () => cleanup('SIGINT'));
process.on('SIGTERM', () => cleanup('SIGTERM'));
process.on('SIGUSR2', () => cleanup('SIGUSR2'));

logRestartInfo();
try {
  await starts();
} catch (error) {
  await log(`Fatal Error During BOT Startup:\n${error}`, true);
  process.exit(1);
}