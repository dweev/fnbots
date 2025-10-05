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
import { MediaValidationError, MediaProcessingError, MediaSizeError } from '../src/lib/errorManager.js';
import { randomByte, getBuffer, getSizeMedia, writeExif, convertAudio } from '../src/function/index.js';
import { jidNormalizedUser, generateWAMessage, generateWAMessageFromContent, downloadContentFromMessage, jidDecode, jidEncode, getBinaryNodeChildString, getBinaryNodeChildren, getBinaryNodeChild, proto } from 'baileys';

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
export const ttsId = require('node-gtts')('id');

const createQuotedOptions = (quoted, options = {}) => ({
  quoted,
  ephemeralExpiration: quoted?.expiration ?? 0,
  messageId: randomByte(32),
  ...options
});
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
  } else if (/^data:.*?\/.*?;base64,/i.test(input)) {
    return Buffer.from(input.split(',')[1], 'base64');
  } else if (/^https?:\/\//.test(input)) {
    return await getBuffer(input);
  } else {
    return await fs.readFile(input);
  }
};
const createMediaMessage = (mime, data, caption, options = {}) => {
  if (mime.includes('gif')) {
    return { video: data, caption, gifPlayback: true, ...options };
  } else if (mime === 'image/webp' && options.asSticker) {
    return { sticker: data, ...options };
  } else if (mime.startsWith('image/')) {
    return { image: data, caption, ...options };
  } else if (mime.startsWith('video/')) {
    return { video: data, caption, mimetype: mime, ...options };
  } else if (mime.startsWith('audio/')) {
    return { audio: data, mimetype: mime, ...options };
  } else {
    return {
      document: data,
      mimetype: mime,
      fileName: options.fileName || `file.${mime.split('/')[1] || 'bin'}`,
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
  fn.sendMediaBufferOrURL = async (jid, path, fileName = '', caption = '', quoted = '', options = {}) => {
    const { mime, data, filename } = await fn.getFile(path, true);
    const isWebpSticker = options.asSticker || /webp/.test(mime);
    let pathFile = filename;
    let messageContent;
    if (isWebpSticker) {
      pathFile = await writeExif(data, {
        packname: options.packname || dbSettings.packName,
        author: options.author || dbSettings.packAuthor,
        categories: options.categories || [''],
      });
      await tmpDir.deleteFile(filename);
      messageContent = { sticker: { url: pathFile }, ...options };
    } else {
      const mediaType = mime.startsWith('image') ? 'image' : mime.startsWith('video') ? 'video' : mime.startsWith('audio') ? 'audio' : 'document';
      const mimetype = mediaType === 'video' ? 'video/mp4' : mediaType === 'audio' ? 'audio/mpeg' : mime;
      messageContent = {
        [mediaType]: { url: pathFile },
        caption,
        mimetype,
        fileName,
        ...options
      };
    }
    const result = await fn.sendMessage(jid, messageContent, createQuotedOptions(quoted, options));
    await tmpDir.deleteFile(pathFile);
    return result;
  };
  async function _internalSendMessage(chat, content, options = {}) {
    const { quoted, ...restOptions } = options;
    let mentions = [];
    if (typeof content === 'string' || content?.text || content?.caption) {
      const textToParse = content.text || content.caption || content;
      mentions = extractMentions(textToParse);
    }
    const opts = typeof content === 'object' ? { ...restOptions, ...content } : { ...restOptions, mentions };
    if (typeof content === 'object') {
      return await fn.sendMessage(chat, content, createQuotedOptions(quoted, opts));
    } else if (typeof content === 'string') {
      try {
        if (/^https?:\/\//.test(content)) {
          const data = await axios.get(content, { responseType: 'arraybuffer' });
          const mime = await detectMimeType(data.data, data.headers);
          const finalCaption = opts.caption || '';
          if (/gif|image|video|audio|pdf|stream/i.test(mime)) {
            return await fn.sendMediaBufferOrURL(chat, data.data, '', finalCaption, quoted, opts);
          }
        }
        return await fn.sendMessage(chat, { text: content, ...opts }, createQuotedOptions(quoted));
      } catch (error) {
        log(error, true);
        return await fn.sendMessage(chat, { text: content, ...opts }, createQuotedOptions(quoted));
      }
    }
  };
  fn.sendPesan = async (chat, content, crot = {}) => {
    const isMessageObject = crot && (crot.expiration !== undefined || crot.chat !== undefined);
    const options = isMessageObject ? {} : crot || {};
    return _internalSendMessage(chat, content, options);
  };
  fn.sendReply = async (chat, content, options = {}) => {
    const quoted = options.quoted || options.m || null;
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
  fn.sendMediaByType = async (jid, mime, dataBuffer, caption, quoted, options = {}) => {
    if (!mime) {
      return await fn.sendMessage(jid, { document: dataBuffer, mimetype: 'application/octet-stream', fileName: 'file', caption, ...options }, createQuotedOptions(quoted, options));
    }
    const messageContent = createMediaMessage(mime, dataBuffer, caption, options);
    return await fn.sendMessage(jid, messageContent, createQuotedOptions(quoted, options));
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
          availableKeys: Object.keys(message || {}),
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
    const buff = await handleBufferInput(path);
    const result = await writeExif(buff, options);
    await fn.sendMessage(jid, { sticker: { url: result }, ...options }, createQuotedOptions(quoted, options));
    await tmpDir.deleteFile(result);
  };
  fn.sendFileUrl = async (jid, url, caption, quoted, options = {}) => {
    try {
      const res = await axios({
        method: 'get',
        url: url,
        responseType: 'arraybuffer',
        family: config.security.networkFamily,
        headers: { 'User-Agent': config.security.userAgent }
      });
      const mime = await detectMimeType(res.data, res.headers);
      return await fn.sendMediaByType(jid, mime, res.data, caption, quoted, options);
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
        return await fn.sendMediaByType(jid, mime, buffer, caption, quoted, options);
      }
      const MAX_FILE_SIZE_BYTES = config.performance.maxFileSize;
      const headResponse = await axios({
        method: 'head',
        url: url,
        family: config.security.networkFamily,
        headers: { 'User-Agent': config.security.userAgent }
      });
      const contentLength = headResponse.headers['content-length'];
      if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE_BYTES) throw new Error(`File terlalu besar (>${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB).`);
      const dataResponse = await axios({
        method: 'get',
        url: url,
        responseType: 'arraybuffer',
        family: config.security.networkFamily,
        headers: { 'User-Agent': config.security.userAgent }
      });
      const mimeType = await detectMimeType(dataResponse.data, dataResponse.headers);
      return await fn.sendMediaByType(jid, mimeType, dataResponse.data, caption, quoted, options);
    } catch (error) {
      throw error;
    }
  };
  fn.sendFilePath = async (jid, caption, localPath, options = {}) => {
    let convertedPath;
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
        convertedPath = await convertAudio(localPath);
        messageContent = { audio: { stream: fs.createReadStream(convertedPath) }, mimetype: options?.ptt ? 'audio/ogg; codecs=opus' : 'audio/mpeg', ptt: options?.ptt || true, mentions, ...options };
      } else {
        const streamContent = { stream: fs.createReadStream(localPath) };
        messageContent = createMediaMessage(mime, streamContent, caption, { mentions, fileName, ...options });
      }
      return await fn.sendMessage(jid, messageContent, quotedOptions);
    } catch (error) {
      throw error;
    } finally {
      if (convertedPath) await tmpDir.deleteFile(convertedPath);
    }
  };
  fn.extractGroupMetadata = (result) => {
    const group = getBinaryNodeChild(result, 'group');
    const descChild = getBinaryNodeChild(group, 'description');
    const desc = descChild ? getBinaryNodeChildString(descChild, 'body') : undefined;
    const descId = descChild?.attrs?.id;
    const groupId = group.attrs.id.includes('@') ? group.attrs.id : jidEncode(group.attrs.id, 'g.us');
    const eph = getBinaryNodeChild(group, 'ephemeral')?.attrs?.expiration;
    const participants = getBinaryNodeChildren(group, 'participant') || [];
    return {
      id: groupId,
      addressingMode: group.attrs.addressing_mode,
      subject: group.attrs.subject,
      subjectOwner: group.attrs.s_o?.endsWith('@lid') ? group.attrs.s_o_pn : group.attrs.s_o,
      subjectOwnerPhoneNumber: group.attrs.s_o_pn,
      subjectTime: +group.attrs.s_t,
      creation: +group.attrs.creation,
      size: participants.length,
      owner: group.attrs.creator?.endsWith('@lid') ? group.attrs.creator_pn : group.attrs.creator,
      ownerPhoneNumber: group.attrs.creator_pn ? jidNormalizedUser(group.attrs.creator_pn) : undefined,
      desc,
      descId,
      linkedParent: getBinaryNodeChild(group, 'linked_parent')?.attrs?.jid,
      restrict: !!getBinaryNodeChild(group, 'locked'),
      announce: !!getBinaryNodeChild(group, 'announcement'),
      isCommunity: !!getBinaryNodeChild(group, 'parent'),
      isCommunityAnnounce: !!getBinaryNodeChild(group, 'default_sub_group'),
      joinApprovalMode: !!getBinaryNodeChild(group, 'membership_approval_mode'),
      memberAddMode: getBinaryNodeChildString(group, 'member_add_mode') === 'all_member_add',
      ephemeralDuration: eph ? +eph : undefined,
      participants: participants.map(({ attrs }) => ({
        id: attrs.jid.endsWith('@lid') ? attrs.phone_number : attrs.jid,
        jid: attrs.jid.endsWith('@lid') ? attrs.phone_number : attrs.jid,
        lid: attrs.jid.endsWith('@lid') ? attrs.jid : attrs.lid,
        admin: attrs.type || null
      }))
    };
  };
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
  fn.sendGroupInvite = async (jid, participant, inviteCode, inviteExpiration, groupName = 'Unknown Subject', caption = 'Invitation to join my WhatsApp group', jpegThumbnail = null, options = {}) => {
    const msg = proto.Message.fromObject({
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
    const caption = `@${memberNum}\n\n${messageText}`;
    await fn.sendFilePath(idGroup, caption, outputPath);
    await tmpDir.deleteFile(outputPath);
  };
  return fn;
};