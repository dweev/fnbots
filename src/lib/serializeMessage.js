// ─── Info ─────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info src/lib/serializeMessage.js ─────────────

import log from './logger.js';
import { mongoStore } from '../../database/index.js';
import { updateContact } from '../function/index.js';
import { jidNormalizedUser, extractMessageContent, getDevice, areJidsSameUser } from 'baileys';

function normalizeMentionsInBody(body, originalMentionedJids, resolvedMentionedJids) {
  if (!body || !Array.isArray(originalMentionedJids) || !Array.isArray(resolvedMentionedJids)) return body;
  let normalizedBody = body;
  const lidToJidMap = new Map();
  for (let i = 0; i < Math.min(originalMentionedJids.length, resolvedMentionedJids.length); i++) {
    const original = originalMentionedJids[i];
    const resolved = resolvedMentionedJids[i];
    if (original !== resolved && original.endsWith('@lid') && resolved.endsWith('@s.whatsapp.net')) {
      const lidNumber = original.split('@')[0];
      const jidNumber = resolved.split('@')[0];
      lidToJidMap.set(lidNumber, jidNumber);
    }
  }
  for (const [lidNumber, jidNumber] of lidToJidMap.entries()) {
    const patterns = [
      new RegExp(`@\\+?\\s*${lidNumber.replace(/(\d)/g, '$1\\s*')}\\b`, 'g'),
      new RegExp(`@${lidNumber}\\b`, 'g')
    ];
    for (const pattern of patterns) {
      normalizedBody = normalizedBody.replace(pattern, `@${jidNumber}`);
    }
  }
  return normalizedBody;
};
function getContentType(content) {
  if (content) {
    const keys = Object.keys(content);
    const key = keys.find(k => (k === 'conversation' || k.endsWith('Message') || k.includes('V2') || k.includes('V3')) && k !== 'senderKeyDistributionMessage');
    return key;
  }
};
function unwrapMessage(msg) {
  if (!msg || typeof msg !== 'object') return null;
  if (msg.viewOnceMessageV2?.message) return unwrapMessage(msg.viewOnceMessageV2.message);
  if (msg.viewOnceMessageV2Extension?.message) return unwrapMessage(msg.viewOnceMessageV2Extension.message);
  if (msg.viewOnceMessage?.message) return unwrapMessage(msg.viewOnceMessage.message);
  if (msg.ephemeralMessage?.message) return unwrapMessage(msg.ephemeralMessage.message);
  if (msg.editedMessage?.message) {
    const innerMsg = msg.editedMessage.message;
    if (innerMsg.protocolMessage?.type === 14 && innerMsg.protocolMessage?.editedMessage) {
      return unwrapMessage(innerMsg.protocolMessage.editedMessage);
    }
    return unwrapMessage(innerMsg);
  }
  if (msg.contextInfo?.quotedMessage) msg.contextInfo.quotedMessage = unwrapMessage(msg.contextInfo.quotedMessage);
  if (msg.message) {
    const extracted = extractMessageContent(msg.message);
    if (extracted) msg.message = extracted;
  }
  return msg;
};

export default async function serializeMessage(fn, msg) {
  try {
    const botNumber = fn.decodeJid(fn.user?.id);
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
      m.messageStubParameters = await Promise.all(rawParams.map(param => mongoStore.resolveJid(param)));
      return m;
    }
    if (!msg || !msg.message) return null;
    m.isEditedMessage = false;
    m.editInfo = null;
    if (msg.message.editedMessage?.message?.protocolMessage) {
      const protocolMsg = msg.message.editedMessage.message.protocolMessage;
      if (protocolMsg.type === 14 && protocolMsg.editedMessage) {
        m.isEditedMessage = true;
        const editedContent = protocolMsg.editedMessage;
        let newText = '';
        let mediaType = null;
        let isMediaEdit = false;
        if (editedContent.conversation) {
          newText = editedContent.conversation;
          mediaType = 'text';
        } else if (editedContent.extendedTextMessage?.text) {
          newText = editedContent.extendedTextMessage.text;
          mediaType = 'extendedText';
        } else if (editedContent.imageMessage) {
          newText = editedContent.imageMessage.caption || '';
          mediaType = 'image';
          isMediaEdit = true;
        } else if (editedContent.videoMessage) {
          newText = editedContent.videoMessage.caption || '';
          mediaType = 'video';
          isMediaEdit = true;
        } else if (editedContent.documentMessage) {
          newText = editedContent.documentMessage.caption || editedContent.documentMessage.fileName || '';
          mediaType = 'document';
          isMediaEdit = true;
        } else {
          newText = '[Unknown Message Type]';
          mediaType = 'unknown';
        }
        const originalKey = {
          remoteJid: protocolMsg.key.remoteJid,
          id: protocolMsg.key.id,
          fromMe: protocolMsg.key.fromMe,
          participant: protocolMsg.key.participant
        };
        const editTimestamp = protocolMsg.timestampMs?.low || protocolMsg.timestampMs?.high || Date.now();
        m.editInfo = {
          originalMessageId: protocolMsg.key.id,
          originalKey: originalKey,
          newText: newText,
          editTimestamp: editTimestamp,
          oldText: null,
          mediaType: mediaType,
          isMediaEdit: isMediaEdit
        };
      }
    }
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
      let tempSenderJid = null;
      let tempSenderLid = null;
      const rawParticipant = jidNormalizedUser(msg.key.participant);
      const rawParticipantAlt = jidNormalizedUser(msg.key.participantAlt);
      if (rawParticipant?.endsWith('@s.whatsapp.net')) {
        tempSenderJid = rawParticipant;
      } else if (rawParticipant?.endsWith('@lid')) {
        tempSenderLid = rawParticipant;
        tempSenderJid = await mongoStore.resolveJid(rawParticipant);
      }
      if (!tempSenderJid && rawParticipantAlt?.endsWith('@s.whatsapp.net')) {
        tempSenderJid = rawParticipantAlt;
      } else if (!tempSenderLid && rawParticipantAlt?.endsWith('@lid')) {
        tempSenderLid = rawParticipantAlt;
        if (!tempSenderJid) {
          tempSenderJid = await mongoStore.resolveJid(rawParticipantAlt);
        }
      }
      senderJid = tempSenderJid;
      senderLid = tempSenderLid;
      m.participant = senderJid || jidNormalizedUser(rawParticipant) || rawParticipant;
      m.key.participant = senderJid;
      m.key.participantAlt = senderLid;
      mfrom = jidNormalizedUser(m.key.remoteJid);
      mchat = m.key.remoteJid;
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
      try {
        const contactName = msg.pushName || (await mongoStore.getContact(senderJid))?.name || await fn.getName(senderJid);
        await updateContact(senderJid, { lid: senderLid, name: contactName });
      } catch (error) {
        log(`Error updating contact: ${error}`, true);
      }
    }
    if (m.isGroup) {
      try {
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
      } catch (error) {
        log(`Error getting group metadata: ${error}`, true);
        m.metadata = null;
        groupAdmins = [];
      }
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
      const originalBody = m.message?.conversation || kamuCrot?.text || kamuCrot?.conversation || kamuCrot?.caption || kamuCrot?.selectedButtonId || kamuCrot?.singleSelectReply?.selectedRowId || kamuCrot?.selectedId || kamuCrot?.contentText || kamuCrot?.selectedDisplayText || kamuCrot?.title || kamuCrot?.name || '';
      const rawMentionedJid = kamuCrot?.contextInfo?.mentionedJid || [];
      m.mentionedJid = await Promise.all(rawMentionedJid.map(mentionId => mongoStore.resolveJid(mentionId)));
      m.body = normalizeMentionsInBody(originalBody, rawMentionedJid, m.mentionedJid);
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
        const resolved = await mongoStore.resolveJid(participantLid);
        if (resolved) {
          kamuCrot.contextInfo.participant = resolved;
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
          if (m.quoted.sender?.endsWith('@lid')) {
            const resolved = await mongoStore.resolveJid(m.quoted.sender);
            if (resolved) {
              m.quoted.key.participant = resolved;
              m.quoted.sender = resolved;
            }
          }
          if (akuCrot?.contextInfo) {
            const rawQuotedMentionedJid = akuCrot.contextInfo.mentionedJid || [];
            const lidToJidMap = new Map();
            const resolvedJids = await Promise.all(rawQuotedMentionedJid.map(mentionId => mongoStore.resolveJid(mentionId)));
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
  } catch (error) {
    log(`Error in serializeMessage: ${error}`, true);
    return null;
  }
};