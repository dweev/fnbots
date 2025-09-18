// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info serializeMessage.js ─────────────

import updateContact from './updateContact.js';
import { mongoStore } from '../../database/index.js';
import { jidNormalizedUser, extractMessageContent, getDevice, areJidsSameUser } from 'baileys';

export default async function serializeMessage(fn, msg) {
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