// ─── Info ─────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info core/client.js ──────────────────────

import path from 'path';
import fs from 'fs-extra';
import axios from 'axios';
import FileType from 'file-type';
import config from '../config.js';
import log from '../src/lib/logger.js';
import { mongoStore } from '../database/index.js';
import { tmpDir } from '../src/lib/tempManager.js';
import { runJob } from '../src/worker/worker_manager.js';
import { randomByte, getBuffer, getSizeMedia } from '../src/function/index.js';
import { convert as convertNative, fetch as nativeFetch } from '../src/addon/bridge.js';
import { MediaValidationError, MediaProcessingError, MediaSizeError } from '../src/lib/errorManager.js';
import { jidNormalizedUser, generateWAMessage, generateWAMessageFromContent, downloadContentFromMessage, jidDecode, jidEncode, getBinaryNodeChildString, getBinaryNodeChildren, getBinaryNodeChild, proto, WAMessageAddressingMode } from 'baileys';

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
export const ttsId = require('node-gtts')('id');

const createQuotedOptions = (quoted, options = {}) => {
  const ephemeralExpiration = options?.ephemeralExpiration
    ?? options?.expiration
    ?? quoted?.expiration
    ?? 0;

  return {
    quoted,
    ephemeralExpiration,
    messageId: randomByte(32),
    ...options
  };
};
const extractMentions = (text) => {
  if (!text || typeof text !== 'string') return [];
  return [...text.matchAll(/@(\d{0,16})(@lid|@s\.whatsapp\.net)?/g)].map(v => v[1] + (v[2] || '@s.whatsapp.net'));
};
const detectMimeType = async (data, headers = {}) => {
  let mime = headers['content-type'];
  if (!mime || mime.includes('octet-stream')) {
    const fileType = await FileType.fromBuffer(data);
    mime = fileType?.mime || 'application/octet-stream';
  }
  return mime;
};
const handleBufferInput = async (input) => {
  if (Buffer.isBuffer(input)) {
    return input;
  }
  if (typeof input === 'string') {
    if (/^data:.*?\/.*?;base64,/i.test(input)) {
      return Buffer.from(input.split(',')[1], 'base64');
    }
    if (/^https?:\/\//.test(input)) {
      return await getBuffer(input);
    }
    try {
      const stats = await fs.stat(input);
      if (stats.isFile()) {
        return await fs.readFile(input);
      }
    } catch {
      // dont do anything if it fails
    }
    try {
      const buffer = Buffer.from(input, 'base64');
      if (buffer.toString('base64') === input) {
        return buffer;
      }
    } catch {
      // dont do anything if it fails
    }
  }
  if (input instanceof Uint8Array || input instanceof ArrayBuffer || ArrayBuffer.isView(input)) {
    return Buffer.from(input);
  }
  if (Array.isArray(input) && typeof input[0] === 'number') {
    return Buffer.from(input);
  }
  if (typeof input === 'object' && input !== null) {
    if (input.data) {
      return Buffer.from(input.data);
    }
    if (input.buffer) {
      return Buffer.from(input.buffer);
    }
  }
  throw new Error(`Tipe input tidak didukung untuk diubah menjadi Buffer: ${typeof input}`);
};
const createMediaMessage = (mime, data, caption, options = {}) => {
  if (mime.includes('gif')) {
    return {
      video: data,
      caption,
      gifPlayback: true,
      mimetype: mime,
      ...options
    };
  } else if (mime === 'image/webp' && options.asSticker) {
    return {
      sticker: data,
      ...options
    };
  } else if (mime.startsWith('image/')) {
    return {
      image: data,
      caption,
      mimetype: mime,
      ...options
    };
  } else if (mime.startsWith('video/')) {
    return {
      video: data,
      caption,
      mimetype: mime,
      ...options
    };
  } else if (mime.startsWith('audio/')) {
    return {
      audio: data,
      mimetype: mime,
      ptt: options.ptt || false,
      ...options
    };
  } else if (options.location) {
    return {
      location: {
        degreesLatitude: options.location.degreesLatitude || options.location.latitude,
        degreesLongitude: options.location.degreesLongitude || options.location.longitude,
        name: options.location.name || '',
        address: options.location.address || ''
      }
    };
  } else if (options.contact) {
    return {
      contacts: {
        displayName: options.contact.displayName || options.contact.name,
        contacts: [{
          vcard: options.contact.vcard
        }]
      }
    };
  } else {
    const fileName = options.fileName || `file.${mime.split('/')[1] || 'bin'}`;
    return {
      document: data,
      mimetype: mime,
      fileName: fileName,
      caption,
      ...options
    };
  }
};
export async function clientBot(fn, dbSettings) {
  fn.decodeJid = (jid = '') => {
    try {
      if (typeof jid !== 'string' || jid.length === 0) return jid;
      if (jid.includes(':')) {
        const decode = jidDecode(jid);
        if (decode?.user && decode?.server) {
          return `${decode.user}@${decode.server}`;
        };
      };
      return jid;
    } catch (error) {
      log(error, true);
      return jid;
    };
  };
  const botNumber = fn.decodeJid(fn.user?.id);
  fn.getName = async (jid) => {
    const id = jidNormalizedUser(jid);
    if (id === botNumber) {
      return fn.user?.name;
    }
    if (id.endsWith("g.us")) {
      const metadata = await mongoStore.getGroupMetadata(id);
      return metadata ? metadata.subject : "none";
    } else {
      const contact = await mongoStore.getContact(id);
      return (contact?.name || contact?.verifiedName || contact?.notify || "Unknown?");
    }
  };
  fn.getFile = async (inputPath, save) => {
    try {
      const data = await handleBufferInput(inputPath);
      const type = await FileType.fromBuffer(data) || {
        mime: 'application/octet-stream',
        ext: 'bin'
      };
      let filename;
      if (data.length > 0 && save) {
        filename = await tmpDir.createTempFileWithContent(data, type.ext);
      }
      return {
        filename,
        size: await getSizeMedia(data),
        mime: type.mime,
        ext: type.ext,
        data
      };
    } catch (error) {
      throw error;
    }
  };
  async function _internalSendMessage(chat, content, options = {}) {
    const { quoted, ...restOptions } = options;
    let mentions = [];
    if (typeof content === 'string' || content?.text || content?.caption) {
      const textToParse = content.text || content.caption || content;
      mentions = extractMentions(textToParse);
    }
    const opts = typeof content === 'object' ? { mentions, ...restOptions, ...content } : { mentions, ...restOptions };
    if (typeof content === 'object') {
      return await fn.sendMessage(chat, content, createQuotedOptions(quoted, opts));
    }
    if (typeof content === 'string') {
      try {
        if (/^https?:\/\//.test(content)) {
          const response = await nativeFetch(content);
          if (!response.ok) throw new Error(`Download failed with status: ${response.status} ${response.statusText}`);
          const buffer = await response.arrayBuffer();
          const headers = {};
          response.headers.forEach((value, key) => headers[key] = value);
          const mime = await detectMimeType(buffer, headers);
          const finalCaption = opts.caption || '';
          const isWebpSticker = opts.asSticker || /webp/.test(mime);
          if (isWebpSticker) {
            const stickerBuffer = await runJob('stickerNative', {
              mediaBuffer: buffer,
              packname: opts.packname || dbSettings.packName,
              author: opts.author || dbSettings.packAuthor,
            });
            return await fn.sendMessage(chat, { sticker: stickerBuffer }, createQuotedOptions(quoted, opts));
          } else if (/gif|image|video|audio|pdf|stream/i.test(mime)) {
            return await fn.sendMediaFromBuffer(chat, mime, buffer, finalCaption, quoted, opts);
          }
        }
        return await fn.sendMessage(chat, { text: content, ...opts }, createQuotedOptions(quoted, opts));
      } catch (error) {
        log(error, true);
        return await fn.sendMessage(chat, { text: content, ...opts }, createQuotedOptions(quoted, opts));
      }
    }
  };
  fn.sendPesan = async (chat, content, options = {}) => {
    return _internalSendMessage(chat, content, options);
  };
  fn.sendReply = async (chat, content, options = {}) => {
    const quoted = options.quoted || options.m;
    return _internalSendMessage(chat, content, { ...options, quoted });
  };
  fn.sendAudioTts = async (jid, audioURL, quoted) => {
    const tempFilePath = tmpDir.createTempFile('mp3');
    try {
      await new Promise((resolve, reject) => {
        ttsId.save(tempFilePath, audioURL, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
      await fn.sendMessage(jid, { audio: { stream: fs.createReadStream(tempFilePath) }, mimetype: 'audio/mpeg' }, createQuotedOptions(quoted));
    } catch (error) {
      throw error;
    } finally {
      await tmpDir.deleteFile(tempFilePath);
    }
  };
  fn.sendContact = async (jid, displayName, contactName, nomor, quoted) => {
    const vcard = `BEGIN:VCARD\nVERSION:3.0\nN:${displayName}\nFN:${contactName}\nORG:${contactName}\nTEL;type=CELL;type=VOICE;waid=${nomor}:+${nomor}\nEND:VCARD`;
    await fn.sendMessage(jid, { contacts: { displayName: displayName, contacts: [{ vcard }] } }, createQuotedOptions(quoted));
  };
  fn.sendMediaFromBuffer = async (jid, mime, dataBuffer, caption, quoted, options = {}) => {
    let imageBuffer;
    try {
      if (typeof dataBuffer === 'string') {
        if (dataBuffer.startsWith('data:')) {
          const base64Data = dataBuffer.split(';base64,').pop();
          imageBuffer = Buffer.from(base64Data, 'base64');
        } else {
          imageBuffer = Buffer.from(dataBuffer, 'base64');
        }
      } else if (Buffer.isBuffer(dataBuffer)) {
        imageBuffer = dataBuffer;
      } else if (dataBuffer instanceof Uint8Array ||
        dataBuffer instanceof ArrayBuffer ||
        ArrayBuffer.isView(dataBuffer)) {
        imageBuffer = Buffer.from(dataBuffer);
      } else if (Array.isArray(dataBuffer)) {
        imageBuffer = Buffer.from(dataBuffer);
      } else if (typeof dataBuffer === 'object' && dataBuffer !== null) {
        if (dataBuffer.data) {
          imageBuffer = Buffer.from(dataBuffer.data);
        } else if (dataBuffer.buffer) {
          imageBuffer = Buffer.from(dataBuffer.buffer);
        } else {
          throw new Error('Object tidak memiliki property data atau buffer yang valid');
        }
      } else {
        throw new Error(`Tipe input tidak didukung: ${typeof dataBuffer}`);
      }
      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error('Buffer kosong atau tidak valid');
      }
      if (!mime) {
        return await fn.sendMessage(jid, {
          document: imageBuffer,
          mimetype: 'application/octet-stream',
          fileName: 'file',
          caption,
          ...options
        }, createQuotedOptions(quoted, options));
      }
      const messageContent = createMediaMessage(mime, imageBuffer, caption, options);
      return await fn.sendMessage(jid, messageContent, createQuotedOptions(quoted, options));
    } catch (error) {
      const errorContext = {
        function: 'sendMediaFromBuffer',
        jid,
        mime,
        error: {
          message: error.message,
          stack: error.stack
        },
        inputAnalysis: {
          type: typeof dataBuffer,
          isArray: Array.isArray(dataBuffer),
          isBuffer: Buffer.isBuffer(dataBuffer),
          isUint8Array: dataBuffer instanceof Uint8Array,
          isArrayBuffer: dataBuffer instanceof ArrayBuffer,
          isArrayBufferView: ArrayBuffer.isView(dataBuffer),
          hasLength: dataBuffer?.length,
          length: dataBuffer?.length,
          constructorName: dataBuffer?.constructor?.name
        }
      };
      log(errorContext, true);
      throw new Error(`Gagal memproses media: ${error.message}`);
    }
  };
  fn.getMediaBuffer = async (message) => {
    const MAX_FILE_SIZE = config.performance.maxFileSize;
    try {
      if (!message) throw new MediaValidationError('Input message kosong');
      let messageType;
      let mediaMessage = message;
      if (message.mimetype) {
        const type = message.mimetype.split('/')[0];
        messageType = type === 'audio' ? 'audio' : type === 'image' ? 'image' : type === 'video' ? 'video' : type === 'sticker' ? 'sticker' : 'document';
      } else {
        const foundKey = Object.keys(message).find((key) => ["imageMessage", "videoMessage", "stickerMessage", "audioMessage", "documentMessage"].includes(key));
        if (foundKey) {
          messageType = foundKey.replace("Message", "");
          mediaMessage = message[foundKey];
        }
      }
      if (!messageType) {
        throw new MediaValidationError('Format media tidak didukung', {
          availableKeys: Object.keys(message),
          mimetype: message?.mimetype
        });
      }
      const fileLength = mediaMessage?.fileLength || mediaMessage?.fileLength?.low || mediaMessage?.fileLength?.high * 4294967296;
      if (fileLength > MAX_FILE_SIZE) throw new MediaSizeError('File terlalu besar', fileLength, MAX_FILE_SIZE);
      const stream = await downloadContentFromMessage(mediaMessage, messageType);
      if (!stream) throw new MediaProcessingError('Gagal membuat stream download');
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }
      if (buffer.length === 0) throw new MediaProcessingError('Hasil download kosong');
      return buffer;
    } catch (error) {
      throw error;
    }
  };
  fn.removeParticipant = async (jid, target) => {
    await fn.groupParticipantsUpdate(jid, [target], "remove");
  };
  fn.promoteParticipant = async (jid, target) => {
    await fn.groupParticipantsUpdate(jid, [target], "promote");
  };
  fn.demoteParticipant = async (jid, target) => {
    await fn.groupParticipantsUpdate(jid, [target], "demote");
  };
  fn.sendRawWebpAsSticker = async (jid, path, quoted, options = {}) => {
    try {
      const inputBuffer = await handleBufferInput(path);
      if (!inputBuffer || inputBuffer.length === 0) {
        throw new Error('Gagal mendapatkan buffer dari input yang diberikan');
      }
      const stickerBuffer = await runJob('stickerNative', {
        mediaBuffer: inputBuffer,
        ...options
      });
      await fn.sendMessage(jid, { sticker: stickerBuffer }, createQuotedOptions(quoted, options));
    } catch (error) {
      log(`Error in sendRawWebpAsSticker: ${error.message}`, true);
      await fn.sendReply(jid, 'Gagal memproses stiker.', { quoted: options.m || quoted });
    }
  };
  fn.sendFileUrl = async (jid, url, caption, quoted, options = {}) => {
    try {
      const headers = {
        'User-Agent': config.security.userAgent,
        ...(options.headers || {})
      };
      if (url.includes('tiktok') || url.includes('ttcdn') || url.includes('musical.ly')) {
        headers['Referer'] = 'https://www.tiktok.com/';
      } else if (url.includes('instagram') || url.includes('cdninstagram')) {
        headers['Referer'] = 'https://www.instagram.com/';
      } else if (url.includes('facebook') || url.includes('fbcdn')) {
        headers['Referer'] = 'https://www.facebook.com/';
      }
      const response = await nativeFetch(url, {
        method: 'GET',
        headers: headers
      });
      if (!response.ok) throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      const buffer = await response.arrayBuffer();
      if (!buffer || buffer.byteLength === 0) throw new Error('Downloaded buffer is empty');
      const responseHeaders = {};
      response.headers.forEach((value, key) => responseHeaders[key] = value);
      const mime = await detectMimeType(buffer, responseHeaders);
      return await fn.sendMediaFromBuffer(jid, mime, buffer, caption, quoted, options);
    } catch (error) {
      throw error;
    }
  };
  fn.sendFileUrl2 = async (jid, url, caption, quoted, options = {}) => {
    try {
      if (url.startsWith('data:')) {
        const [meta, data] = url.split(',');
        const mime = meta.match(/:(.*?);/)[1];
        const buffer = Buffer.from(data, 'base64');
        return await fn.sendMediaFromBuffer(jid, mime, buffer, caption, quoted, options);
      }
      const MAX_FILE_SIZE_BYTES = config.performance.maxFileSize;
      const headResponse = await nativeFetch(url, {
        method: 'HEAD',
        headers: { 'User-Agent': config.security.userAgent }
      });
      if (!headResponse.ok) throw new Error(`HEAD request failed: ${headResponse.status} ${headResponse.statusText}`);
      const contentLength = headResponse.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE_BYTES) throw new Error(`File terlalu besar (>${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB).`);
      const dataResponse = await nativeFetch(url, {
        method: 'GET',
        headers: { 'User-Agent': config.security.userAgent }
      });
      if (!dataResponse.ok) throw new Error(`GET request failed: ${dataResponse.status} ${dataResponse.statusText}`);
      const buffer = await dataResponse.arrayBuffer();
      const headers = {};
      dataResponse.headers.forEach((value, key) => headers[key] = value);
      const mimeType = await detectMimeType(buffer, headers);
      return await fn.sendMediaFromBuffer(jid, mimeType, buffer, caption, quoted, options);
    } catch (error) {
      throw error;
    }
  };
  fn.sendFilePath = async (jid, caption, localPath, options = {}) => {
    try {
      try {
        await fs.access(localPath);
      } catch {
        throw new Error(`File tidak ditemukan di path: ${localPath}`);
      }
      const mentions = extractMentions(caption);
      const fileType = await FileType.fromFile(localPath);
      const mime = fileType?.mime || 'application/octet-stream';
      const stats = await fs.stat(localPath);
      const fileSizeInMB = stats.size / (1024 * 1024);
      const fileName = path.basename(localPath);
      const quotedOptions = createQuotedOptions(options.quoted, options);
      let messageContent = {};
      if (fileSizeInMB > 200) {
        messageContent = { document: { stream: fs.createReadStream(localPath) }, mimetype: mime, fileName, mentions, ...options };
      } else if (mime.startsWith('audio/')) {
        const inputBuffer = await fs.readFile(localPath);
        if (options.ptt === true) {
          const outputBuffer = convertNative(inputBuffer, {
            format: 'opus',
            ptt: true
          });
          if (!Buffer.isBuffer(outputBuffer) || outputBuffer.length === 0) {
            throw new Error('Native audio conversion failed to produce a valid buffer.');
          }
          messageContent = {
            audio: outputBuffer,
            mimetype: 'audio/ogg; codecs=opus',
            ptt: true,
            mentions,
            ...options
          };
        } else {
          const outputBuffer = convertNative(inputBuffer, {
            format: 'mpeg',
            ptt: true
          });
          if (!Buffer.isBuffer(outputBuffer) || outputBuffer.length === 0) {
            throw new Error('Native audio conversion failed to produce a valid buffer.');
          }
          messageContent = {
            audio: outputBuffer,
            mimetype: 'audio/mpeg',
            ptt: false,
            mentions,
            ...options
          };
        }
      } else {
        const streamContent = { stream: fs.createReadStream(localPath) };
        messageContent = createMediaMessage(mime, streamContent, caption, { mentions, fileName, ...options });
      }
      return await fn.sendMessage(jid, messageContent, quotedOptions);
    } catch (error) {
      throw error;
    } finally {
      if (!localPath.includes(config.paths.vanya) && !localPath.includes(config.paths.avatar)) {
        await fs.unlink(localPath);
      }
    }
  };
  fn.extractGroupMetadata = (result) => {
    const group = getBinaryNodeChild(result, 'group');
    const descChild = getBinaryNodeChild(group, 'description');
    let desc;
    let descId;
    let descOwner;
    let descOwnerPn;
    let descTime;
    if (descChild) {
      desc = getBinaryNodeChildString(descChild, 'body');
      descOwner = descChild.attrs.participant ? jidNormalizedUser(descChild.attrs.participant) : undefined;
      descOwnerPn = descChild.attrs.participant_pn ? jidNormalizedUser(descChild.attrs.participant_pn) : undefined;
      descTime = +descChild.attrs.t;
      descId = descChild.attrs.id;
    }
    const groupId = group.attrs.id.includes('@') ? group.attrs.id : jidEncode(group.attrs.id, 'g.us');
    const eph = getBinaryNodeChild(group, 'ephemeral')?.attrs.expiration;
    const memberAddMode = getBinaryNodeChildString(group, 'member_add_mode') === 'all_member_add';
    return {
      id: groupId,
      notify: group.attrs.notify,
      addressingMode: group.attrs.addressing_mode === 'lid' ? WAMessageAddressingMode.LID : WAMessageAddressingMode.PN,
      subject: group.attrs.subject,
      subjectOwner: group.attrs.s_o,
      subjectOwnerPn: group.attrs.s_o_pn,
      subjectTime: +group.attrs.s_t,
      size: group.attrs.size ? +group.attrs.size : getBinaryNodeChildren(group, 'participant').length,
      creation: +group.attrs.creation,
      owner: group.attrs.creator ? jidNormalizedUser(group.attrs.creator) : undefined,
      ownerPn: group.attrs.creator_pn ? jidNormalizedUser(group.attrs.creator_pn) : undefined,
      owner_country_code: group.attrs.creator_country_code,
      desc,
      descId,
      descOwner,
      descOwnerPn,
      descTime,
      linkedParent: getBinaryNodeChild(group, 'linked_parent')?.attrs.jid || undefined,
      restrict: !!getBinaryNodeChild(group, 'locked'),
      announce: !!getBinaryNodeChild(group, 'announcement'),
      isCommunity: !!getBinaryNodeChild(group, 'parent'),
      isCommunityAnnounce: !!getBinaryNodeChild(group, 'default_sub_group'),
      joinApprovalMode: !!getBinaryNodeChild(group, 'membership_approval_mode'),
      memberAddMode,
      participants: getBinaryNodeChildren(group, 'participant').map(({ attrs }) => {
        return {
          id: attrs.jid.endsWith('@lid') ? attrs.phone_number : attrs.jid,
          jid: attrs.jid.endsWith('@lid') ? attrs.phone_number : attrs.jid,
          lid: attrs.jid.endsWith('@lid') ? attrs.jid : attrs.lid,
          admin: attrs.type || null
        };
      }),
      ephemeralDuration: eph ? +eph : undefined
    };
  };
  fn.groupQuery = async (jid, type, content) =>
    fn.query({
      tag: 'iq',
      attrs: {
        type,
        xmlns: 'w:g2',
        to: jid
      },
      content
    });
  fn.groupMetadata = async (jid) => {
    const result = await fn.query({
      tag: 'iq',
      attrs: { type: 'get', xmlns: 'w:g2', to: jid },
      content: [{ tag: 'query', attrs: { request: 'interactive' } }]
    });
    return fn.extractGroupMetadata(result);
  };
  fn.groupFetchAllParticipating = async () => {
    const result = await fn.query({
      tag: 'iq',
      attrs: { to: '@g.us', xmlns: 'w:g2', type: 'get' },
      content: [{
        tag: 'participating',
        attrs: {},
        content: [
          { tag: 'participants', attrs: {} },
          { tag: 'description', attrs: {} }
        ]
      }]
    });
    const data = {};
    const groupsChild = getBinaryNodeChild(result, 'groups');
    if (groupsChild) {
      const groups = getBinaryNodeChildren(groupsChild, 'group');
      for (const groupNode of groups) {
        const meta = fn.extractGroupMetadata({
          tag: 'result',
          attrs: {},
          content: [groupNode]
        });
        if (meta.isCommunity || meta.announce) continue;
        data[meta.id] = meta;
      }
    }
    fn.ev.emit('groups.update', Object.values(data));
    return data;
  };
  fn.groupGetInviteInfo = async (code) => {
    const results = await fn.groupQuery('@g.us', 'get', [{ tag: 'invite', attrs: { code } }]);
    return fn.extractGroupMetadata(results);
  };
  fn.sendGroupInvite = async (jid, participant, inviteCode, inviteExpiration, groupName = 'Unknown Subject', caption = 'Invitation to join my WhatsApp group', jpegThumbnail = null, options = {}) => {
    const msg = proto.Message.create({
      groupInviteMessage: {
        inviteCode,
        inviteExpiration: parseInt(inviteExpiration) || + new Date(new Date + (config.performance.inviteExpiration)),
        groupJid: jid,
        groupName,
        jpegThumbnail: Buffer.isBuffer(jpegThumbnail) ? jpegThumbnail : null,
        caption,
        contextInfo: { mentionedJid: options.mentions || [] }
      }
    });
    const message = generateWAMessageFromContent(participant, msg, options);
    return await fn.relayMessage(participant, message.message, { messageId: message.key.id });
  };
  fn.deleteBugMessage = async (key, timestamp) => {
    if (key.remoteJid.endsWith('@g.us')) {
      await fn.chatModify({ deleteForMe: { key, timestamp, deleteMedia: true } }, key.remoteJid);
      await fn.sendMessage(key.remoteJid, { delete: key });
    }
    await fn.chatModify({ deleteForMe: { key, timestamp, deleteMedia: true } }, key.remoteJid);
  };
  fn.sendAlbum = async (jid, array, options = {}) => {
    if (!Array.isArray(array) || array.length < 2) throw new RangeError("Parameter 'array' harus berupa array dengan minimal 2 media.");
    const messageContent = {
      messageContextInfo: { messageSecret: randomByte(32) },
      albumMessage: {
        expectedImageCount: array.filter((a) => a.image).length,
        expectedVideoCount: array.filter((a) => a.video).length,
      }
    };
    const generationOptions = {
      userJid: fn.user.id,
      upload: fn.waUploadToServer,
      quoted: options?.quoted || null,
      ephemeralExpiration: options?.quoted?.expiration ?? 0
    };
    const album = generateWAMessageFromContent(jid, messageContent, generationOptions);
    await fn.relayMessage(album.key.remoteJid, album.message, { messageId: album.key.id });
    for (const content of array) {
      const mediaMessage = await generateWAMessage(album.key.remoteJid, content, {
        upload: fn.waUploadToServer,
        ephemeralExpiration: options?.quoted?.expiration ?? 0
      });
      mediaMessage.message.messageContextInfo = {
        messageSecret: randomByte(32),
        messageAssociation: {
          associationType: 1,
          parentMessageKey: album.key,
        },
      };
      await fn.relayMessage(mediaMessage.key.remoteJid, mediaMessage.message, {
        messageId: mediaMessage.key.id,
      });
    }
    return album;
  };
  fn.forwardMessage = async (jid, message) => {
    return await fn.sendMessage(jid, {
      forward: {
        key: {
          remoteJid: message.key.remoteJid,
          fromMe: message.key.fromMe,
          id: message.key.id,
          ...(message.key.participant && { participant: message.key.participant })
        },
        message: message.message,
        messageTimestamp: message.messageTimestamp
      }
    }, {
      ephemeralExpiration: message.expiration || 0,
    });
  };
  fn.handleGroupEventImage = async (idGroup, eventDetails) => {
    const { memberJid, eventText, subject, messageText } = eventDetails;
    const memberNum = memberJid.split('@')[0];
    let profilePictureUrl;
    try {
      profilePictureUrl = await fn.profilePictureUrl(memberJid, 'image');
    } catch {
      profilePictureUrl = config.paths.avatar;
    }
    const imageBuffer = await runJob('groupImage', {
      username: memberNum,
      groupname: subject,
      welcometext: eventText,
      profileImagePath: profilePictureUrl
    });
    const outputPath = await tmpDir.createTempFileWithContent(imageBuffer, 'png');
    const formattedMessage = messageText.replace(/@user/g, `@${memberNum}`);
    await fn.sendFilePath(idGroup, formattedMessage, outputPath);
  };
  fn.profileImageBuffer = async (jid, type = 'image') => {
    try {
      const url = await fn.profilePictureUrl(jid, type);
      const response = await nativeFetch(url, {
        method: 'GET',
        headers: { 'User-Agent': config.security.userAgent }
      });
      if (!response.ok) throw new Error(`Download failed with status: ${response.status} ${response.statusText}`);
      const buffer = await response.arrayBuffer();
      return Buffer.from(buffer);
    } catch (error) {
      throw error;
    }
  };
  fn.sendFromTiktok = async (jid, url, caption, quoted, options = {}) => {
    try {
      const res = await axios({
        method: 'get',
        url: url,
        responseType: 'arraybuffer',
        family: config.security.networkFamily,
        headers: { 'User-Agent': config.security.userAgent }
      });
      const mime = await detectMimeType(res.data, res.headers);
      return await fn.sendMediaFromBuffer(jid, mime, res.data, caption, quoted, options);
    } catch (error) {
      if (error.message.includes('ECONNRESET')) {
        throw new Error('Gagal mengunduh dari TikTok: Koneksi direset. Coba lagi nanti.');
      } else {
        throw error;
      }
    }
  };
  fn.getEphemeralExpiration = async (jid) => {
    try {
      const data = await fn.fetchDisappearingDuration(jid);
      if (Array.isArray(data) && data.length > 0) {
        const userData = data.find(item => item.id === jid);
        return userData?.disappearing_mode?.duration || 0;
      }
      return 0;
    } catch {
      return 0;
    }
  };
  return fn;
};