// ─── Info ──────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info src/handler/antidelete.js ────────────────

import log from '../lib/logger.js';

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
  constructor(mongoStore, fn) {
    this.mongoStore = mongoStore;
    this.fn = fn;
  }
  async handle(params) {
    const { fn, m, toId, mongoStore } = params;
    if (m.type !== 'protocolMessage' || m.protocolMessage.type !== 0) {
      return;
    }
    const deletedMsgId = m.protocolMessage.key.id;
    const remoteJid = toId;
    try {
      const rawOriginalMessage = await mongoStore.loadMessage(remoteJid, deletedMsgId);
      const originalMessage = rehydrateBuffer(rawOriginalMessage);
      if (!originalMessage || originalMessage.fromMe) {
        return;
      }
      await this.processMessageByType(originalMessage, toId, fn);
    } catch (error) {
      log(`Error in anti-deleted handler: ${error}`, true);

    }
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
    try {
      const buffer = await fn.getMediaBuffer(originalMessage.message);
      await fn.sendMessage(toId, {
        image: buffer,
        caption: originalMessage.body
      }, {
        ephemeralExpiration: originalMessage.expiration
      });
    } catch (error) {
      log(`Error handling image message: ${error}`, true);
    }
  }
  async handleVideoMessage(originalMessage, toId, fn) {
    try {
      const buffer = await fn.getMediaBuffer(originalMessage.message);
      await fn.sendMessage(toId, {
        video: buffer,
        caption: originalMessage.body
      }, {
        ephemeralExpiration: originalMessage.expiration
      });
    } catch (error) {
      log(`Error handling video message: ${error}`, true);
    }
  }
  async handleStickerMessage(originalMessage, toId, fn) {
    try {
      const buffer = await fn.getMediaBuffer(originalMessage.message);
      await fn.sendMessage(toId, {
        sticker: buffer
      }, {
        ephemeralExpiration: originalMessage.expiration
      });
    } catch (error) {
      log(`Error handling sticker message: ${error}`, true);
    }
  }
  async handleAudioMessage(originalMessage, toId, fn) {
    try {
      const buffer = await fn.getMediaBuffer(originalMessage.message);
      await fn.sendMessage(toId, {
        audio: buffer,
        mimetype: 'audio/mp4',
        ptt: false
      }, {
        ephemeralExpiration: originalMessage.expiration
      });
    } catch (error) {
      log(`Error handling audio message: ${error}`, true);
    }
  }
  async handleDocumentMessage(originalMessage, toId, fn) {
    try {
      const buffer = await fn.getMediaBuffer(originalMessage.message);
      await fn.sendMessage(toId, {
        document: buffer,
        mimetype: originalMessage.mime,
        fileName: originalMessage.message.fileName
      }, {
        ephemeralExpiration: originalMessage.expiration
      });
    } catch (error) {
      log(`Error handling document message: ${error}`, true);
    }
  }
  async handleLocationMessage(originalMessage, toId, fn) {
    try {
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
    } catch (error) {
      log(`Error handling location message: ${error}`, true);
    }
  }
  async handleContactMessage(originalMessage, toId, fn) {
    try {
      await fn.sendMessage(toId, {
        contacts: {
          displayName: originalMessage.message.contactMessage.displayName,
          contacts: [{ vcard: originalMessage.message.contactMessage.vcard }]
        }
      }, {
        ephemeralExpiration: originalMessage.expiration
      });
    } catch (error) {
      log(`Error handling contact message: ${error}`, true);
    }
  }
  async handleTextMessage(originalMessage, toId, fn) {
    try {
      if (originalMessage.body) {
        await fn.forwardMessage(toId, originalMessage);
      }
    } catch (error) {
      log(`Error handling text message: ${error}`, true);
    }
  }
}

export const handleAntiDeleted = async (params) => {
  const handler = new AntiDeletedHandler(params.mongoStore, params.fn);
  return await handler.handle(params);
};