// ─── Info ──────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info src/handler/antidelete.js ────────────────

import log from '../lib/logger.js';
import { normalizeMentionsInBody } from '../function/index.js';

function rehydrateBuffer(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return Buffer.from(obj.data);
  }
  if (obj instanceof Uint8Array || obj instanceof ArrayBuffer || ArrayBuffer.isView(obj)) {
    return Buffer.from(obj);
  }
  if (Array.isArray(obj)) {
    if (obj.length > 0 && typeof obj[0] === 'number') {
      return Buffer.from(obj);
    }
    return obj.map(item => rehydrateBuffer(item));
  }
  const keys = Object.keys(obj);
  const hasNumericKeys = keys.length > 0 && keys.every(key => !isNaN(parseInt(key)));
  if (hasNumericKeys && !obj.type && !Array.isArray(obj)) {
    const maxIndex = Math.max(...keys.map(k => parseInt(k)));
    const arr = new Array(maxIndex + 1);
    for (const key in obj) {
      arr[parseInt(key)] = obj[key];
    }
    return Buffer.from(arr);
  }
  if (obj.data && !obj.type) {
    if (Array.isArray(obj.data) || Buffer.isBuffer(obj.data) ||
      obj.data instanceof Uint8Array || obj.data instanceof ArrayBuffer) {
      return Buffer.from(obj.data);
    }
  }
  if (obj.buffer && !obj.type) {
    if (Array.isArray(obj.buffer) || Buffer.isBuffer(obj.buffer) ||
      obj.buffer instanceof Uint8Array || obj.buffer instanceof ArrayBuffer) {
      return Buffer.from(obj.buffer);
    }
  }
  const cloned = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = rehydrateBuffer(obj[key]);
    }
  }
  return cloned;
}

class AntiDeletedHandler {
  constructor(store, fn) {
    this.store = store;
    this.fn = fn;
  }
  async handle(params) {
    const { fn, m, toId, store } = params;
    if (m.type !== 'protocolMessage' || m.protocolMessage.type !== 0) return;
    const deletedMsgId = m.protocolMessage.key.id;
    const remoteJid = toId;
    const rawOriginalMessage = await store.loadMessage(remoteJid, deletedMsgId);
    const originalMessage = rehydrateBuffer(rawOriginalMessage);
    if (!originalMessage || originalMessage.fromMe) return;
    await this.processMessageByType(originalMessage, toId, fn);
  }
  async resolveMentions(mentionedJids) {
    if (!Array.isArray(mentionedJids) || mentionedJids.length === 0) {
      return [];
    }
    const resolved = [];
    for (const jid of mentionedJids) {
      if (jid.endsWith('@lid')) {
        const resolvedJid = await this.store.resolveJid(jid);
        resolved.push(resolvedJid || jid);
      } else {
        resolved.push(jid);
      }
    }
    return resolved;
  }
  async extractMentionsFromMessage(message) {
    const messageType = Object.keys(message).find(key => key !== 'messageContextInfo' && typeof message[key] === 'object');
    if (!messageType) {
      return { mentions: [], body: '' };
    }
    const msgContent = message[messageType];
    const rawMentions = msgContent?.contextInfo?.mentionedJid || [];
    const body = msgContent?.text || msgContent?.caption || msgContent?.conversation || msgContent?.selectedButtonId || msgContent?.singleSelectReply?.selectedRowId || msgContent?.selectedId || msgContent?.contentText || msgContent?.selectedDisplayText || msgContent?.title || msgContent?.name || '';
    if (rawMentions.length === 0) {
      return { mentions: [], body };
    }
    const resolvedMentions = await this.resolveMentions(rawMentions);
    const normalizedBody = normalizeMentionsInBody(
      body,
      rawMentions,
      resolvedMentions
    );
    return {
      mentions: resolvedMentions,
      body: normalizedBody
    };
  }
  async processMessageByType(originalMessage, toId, fn) {
    const messageType = originalMessage.type;
    switch (messageType) {
      case 'imageMessage':
        await this.handleImageMessage(originalMessage, toId, fn);
        break;
      case 'videoMessage':
        await this.handleVideoMessage(originalMessage, toId, fn);
        break;
      case 'stickerMessage':
        await this.handleStickerMessage(originalMessage, toId, fn);
        break;
      case 'audioMessage':
        await this.handleAudioMessage(originalMessage, toId, fn);
        break;
      case 'documentMessage':
        await this.handleDocumentMessage(originalMessage, toId, fn);
        break;
      case 'locationMessage':
        await this.handleLocationMessage(originalMessage, toId, fn);
        break;
      case 'contactMessage':
        await this.handleContactMessage(originalMessage, toId, fn);
        break;
      case 'extendedTextMessage':
      case 'conversation':
        await this.handleTextMessage(originalMessage, toId, fn);
        break;
      default:
        break;
    }
  }
  async handleImageMessage(originalMessage, toId, fn) {
    const buffer = await fn.getMediaBuffer(originalMessage.message);
    const { mentions, body } = await this.extractMentionsFromMessage(originalMessage.message);
    await fn.sendMessage(toId, {
      image: buffer,
      caption: body,
      ...(mentions.length > 0 && { mentions })
    }, {
      ephemeralExpiration: originalMessage.expiration
    });
  }
  async handleVideoMessage(originalMessage, toId, fn) {
    const buffer = await fn.getMediaBuffer(originalMessage.message);
    const { mentions, body } = await this.extractMentionsFromMessage(originalMessage.message);
    await fn.sendMessage(toId, {
      video: buffer,
      caption: body,
      ...(mentions.length > 0 && { mentions })
    }, {
      ephemeralExpiration: originalMessage.expiration
    });
  }
  async handleStickerMessage(originalMessage, toId, fn) {
    const buffer = await fn.getMediaBuffer(originalMessage.message);
    await fn.sendMessage(toId, {
      sticker: buffer
    }, {
      ephemeralExpiration: originalMessage.expiration
    });
  }
  async handleAudioMessage(originalMessage, toId, fn) {
    const buffer = await fn.getMediaBuffer(originalMessage.message);
    await fn.sendMessage(toId, {
      audio: buffer,
      mimetype: 'audio/mp4',
      ptt: false
    }, {
      ephemeralExpiration: originalMessage.expiration
    });
  }
  async handleDocumentMessage(originalMessage, toId, fn) {
    const buffer = await fn.getMediaBuffer(originalMessage.message);
    const { mentions, body } = await this.extractMentionsFromMessage(originalMessage.message);
    await fn.sendMessage(toId, {
      document: buffer,
      mimetype: originalMessage.mime,
      fileName: originalMessage.message.fileName,
      ...(body && { caption: body }),
      ...(mentions.length > 0 && { mentions })
    }, {
      ephemeralExpiration: originalMessage.expiration
    });
  }
  async handleLocationMessage(originalMessage, toId, fn) {
    await fn.sendMessage(toId, {
      location: {
        degreesLatitude: originalMessage.message.degreesLatitude,
        degreesLongitude: originalMessage.message.degreesLongitude,
        name: originalMessage.message.name,
        address: originalMessage.message.address
      }
    }, {
      ephemeralExpiration: originalMessage.expiration
    });
  }
  async handleContactMessage(originalMessage, toId, fn) {
    await fn.sendMessage(toId, {
      contacts: {
        displayName: originalMessage.message.contactMessage.displayName,
        contacts: [{ vcard: originalMessage.message.contactMessage.vcard }]
      }
    }, {
      ephemeralExpiration: originalMessage.expiration
    });
  }
  async handleTextMessage(originalMessage, toId, fn) {
    if (!originalMessage.body) return;
    const { mentions, body } = await this.extractMentionsFromMessage(originalMessage.message);
    if (mentions.length === 0) {
      try {
        await fn.sendMessage(toId, {
          forward: {
            key: {
              remoteJid: originalMessage.key.remoteJid,
              fromMe: originalMessage.key.fromMe,
              id: originalMessage.key.id,
              ...(originalMessage.key.participant && { participant: originalMessage.key.participant })
            },
            message: originalMessage.message,
            messageTimestamp: originalMessage.messageTimestamp
          }
        }, {
          ephemeralExpiration: originalMessage.expiration || 0,
        });
        return;
      } catch (forwardError) {
        log(`Forward failed, sending as new message: ${forwardError}`, false);
      }
    }
    await fn.sendMessage(toId, {
      text: body,
      ...(mentions.length > 0 && { mentions })
    }, {
      quoted: originalMessage,
      ephemeralExpiration: originalMessage.expiration || 0
    });
  }
}

export const handleAntiDeleted = async (params) => {
  const handler = new AntiDeletedHandler(params.store, params.fn);
  return await handler.handle(params);
};