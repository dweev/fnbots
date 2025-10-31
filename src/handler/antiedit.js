// ─── Info ──────────────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info src/handler/antiedit.js ────────────────

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
    return obj.map((item) => rehydrateBuffer(item));
  }
  const keys = Object.keys(obj);
  const hasNumericKeys = keys.length > 0 && keys.every((key) => !isNaN(parseInt(key)));
  if (hasNumericKeys && !obj.type && !Array.isArray(obj)) {
    const maxIndex = Math.max(...keys.map((k) => parseInt(k)));
    const arr = new Array(maxIndex + 1);
    for (const key in obj) {
      arr[parseInt(key)] = obj[key];
    }
    return Buffer.from(arr);
  }
  if (obj.data && !obj.type) {
    if (Array.isArray(obj.data) || Buffer.isBuffer(obj.data) || obj.data instanceof Uint8Array || obj.data instanceof ArrayBuffer) {
      return Buffer.from(obj.data);
    }
  }
  if (obj.buffer && !obj.type) {
    if (Array.isArray(obj.buffer) || Buffer.isBuffer(obj.buffer) || obj.buffer instanceof Uint8Array || obj.buffer instanceof ArrayBuffer) {
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

class AntiEditHandler {
  constructor(store, fn) {
    this.store = store;
    this.fn = fn;
  }
  async handle(params) {
    const { store, fn, m, dbSettings } = params;
    if (!m.isEditedMessage || !dbSettings?.antiEditMessage) {
      return;
    }
    try {
      const editInfo = m.editInfo;
      const originalMessageId = editInfo.originalMessageId;
      const newText = editInfo.newText;
      const mediaType = editInfo.mediaType;
      const isMediaEdit = editInfo.isMediaEdit;
      const originalMessage = await this.getOriginalMessage(store, m.chat, originalMessageId);
      if (!originalMessage) {
        await this.sendTextOnlyNotification(m, editInfo, isMediaEdit, mediaType, newText, fn);
        return;
      }
      const oldText = this.extractOldText(originalMessage, isMediaEdit, mediaType);
      editInfo.oldText = oldText;
      if (isMediaEdit) {
        await this.processMediaEdit(originalMessage, m, oldText, mediaType, fn);
      } else {
        await this.processTextEdit(m, oldText, fn, originalMessage);
      }
    } catch (error) {
      log(`Error in anti-edit handler: ${error}`, true);
    }
  }
  async getOriginalMessage(store, chatId, messageId) {
    try {
      const rawOriginalMessage = await store.loadMessage(chatId, messageId);
      if (!rawOriginalMessage || rawOriginalMessage.fromMe) {
        return;
      }
      const messages = rehydrateBuffer(rawOriginalMessage);
      return messages;
    } catch (error) {
      log(`Error mengambil pesan original: ${error}`, true);
      return null;
    }
  }
  extractOldText(originalMessage, isMediaEdit, mediaType) {
    if (!isMediaEdit) {
      return originalMessage.body || originalMessage.message?.conversation || originalMessage.message?.extendedTextMessage?.text || '[Konten tidak bisa diambil]';
    }
    const msgContent = originalMessage.message;
    switch (mediaType) {
      case 'image':
        return msgContent?.imageMessage?.caption || '[Gambar tanpa caption]';
      case 'video':
        return msgContent?.videoMessage?.caption || '[Video tanpa caption]';
      case 'document':
        return msgContent?.documentMessage?.caption || msgContent?.documentMessage?.fileName || '[Dokumen]';
      default:
        return originalMessage.body || '[Media tidak bisa diambil]';
    }
  }
  buildEditCaption(oldText) {
    const caption = oldText;
    return caption;
  }
  buildTextEditMessage(oldText) {
    const message = oldText;
    return message;
  }
  async processMediaEdit(originalMessage, m, oldText, mediaType, fn) {
    try {
      switch (mediaType) {
        case 'image':
          await this.handleImageEdit(originalMessage, m, oldText, fn);
          break;
        case 'video':
          await this.handleVideoEdit(originalMessage, m, oldText, fn);
          break;
        case 'document':
          await this.handleDocumentEdit(originalMessage, m, oldText, fn);
          break;
        default:
          log(`Unsupported media type for edit: ${mediaType}`);
      }
    } catch (error) {
      log(`Error processing media edit: ${error}`, true);
    }
  }
  async handleImageEdit(originalMessage, m, oldText, fn) {
    try {
      const buffer = await fn.getMediaBuffer(originalMessage.message);
      const caption = this.buildEditCaption(oldText);
      await fn.sendMessage(
        m.chat,
        {
          image: buffer,
          caption: caption
        },
        { quoted: m, ephemeralExpiration: originalMessage.expiration ?? 0 }
      );
    } catch (error) {
      log(`Error handling image edit: ${error}`, true);
    }
  }
  async handleVideoEdit(originalMessage, m, oldText, fn) {
    try {
      const buffer = await fn.getMediaBuffer(originalMessage.message);
      const caption = this.buildEditCaption(oldText);
      await fn.sendMessage(
        m.chat,
        {
          video: buffer,
          caption: caption
        },
        { quoted: m, ephemeralExpiration: originalMessage.expiration ?? 0 }
      );
    } catch (error) {
      log(`Error handling video edit: ${error}`, true);
    }
  }
  async handleDocumentEdit(originalMessage, m, oldText, fn) {
    try {
      const buffer = await fn.getMediaBuffer(originalMessage.message);
      const caption = this.buildEditCaption(oldText);
      await fn.sendMessage(
        m.chat,
        {
          document: buffer,
          mimetype: originalMessage.mime,
          fileName: originalMessage.message.documentMessage?.fileName,
          caption: caption
        },
        { quoted: m, ephemeralExpiration: originalMessage.expiration ?? 0 }
      );
    } catch (error) {
      log(`Error handling document edit: ${error}`, true);
    }
  }
  async processTextEdit(m, oldText, fn, originalMessage) {
    try {
      const message = this.buildTextEditMessage(oldText);
      await fn.sendReply(m.chat, message, { quoted: m, ephemeralExpiration: originalMessage.expiration });
    } catch (error) {
      log(`Error handling text edit: ${error}`, true);
    }
  }
}

export const handleAntiEdit = async (params) => {
  const handler = new AntiEditHandler(params.store, params.fn);
  return await handler.handle(params);
};
