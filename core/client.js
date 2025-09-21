// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info client.js ──────────────────────

import path from 'path';
import fs from 'fs-extra';
import axios from 'axios';
import FileType from 'file-type';
import log from '../src/utils/logger.js';
import { mongoStore } from '../database/index.js';
import { tmpDir } from '../src/lib/tempManager.js';
import { randomByte, getBuffer, getSizeMedia, writeExif, convertAudio } from '../src/lib/function.js';
import { MediaValidationError, MediaProcessingError, MediaSizeError } from '../src/lib/errorManager.js';
import { jidNormalizedUser, generateWAMessage, generateWAMessageFromContent, downloadContentFromMessage, jidDecode, jidEncode, getBinaryNodeChildString, getBinaryNodeChildren, getBinaryNodeChild, proto } from 'baileys';

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
export const ttsId = require('node-gtts')('id');

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
  let botNumber = fn.decodeJid(fn.user?.id);
  fn.getName = async (jid) => {
    let id = jidNormalizedUser(jid);
    if (id === botNumber) {
      return fn.user?.name;
    }
    if (id.endsWith("g.us")) {
      let metadata = await mongoStore.getGroupMetadata(id);
      return metadata ? metadata.subject : "none";
    } else {
      let contact = await mongoStore.getContact(id);
      return (contact?.name || contact?.verifiedName || contact?.notify || "Unknown?");
    }
  };
  fn.getFile = async (inputPath, save) => {
    try {
      let data;
      if (Buffer.isBuffer(inputPath)) {
        data = inputPath;
      } else if (/^data:.*?\/.*?;base64,/i.test(inputPath)) {
        data = Buffer.from(inputPath.split(',')[1], 'base64');
      } else if (/^https?:\/\//.test(inputPath)) {
        data = await getBuffer(inputPath);
      } else {
        data = await fs.readFile(inputPath);
      }
      const type = await FileType.fromBuffer(data) || {
        mime: 'application/octet-stream',
        ext: 'bin'
      };
      const filename = tmpDir.createTempFile(type.ext);
      if (data.length > 0 && save) {
        await fs.writeFile(filename, data);
      }
      return {
        filename,
        size: await getSizeMedia(data),
        mime: type.mime,
        ext: type.ext,
        data
      };
    } catch (error) {
      throw new Error(error);
    }
  };
  fn.sendMediaBufferOrURL = async (jid, path, fileName = '', caption = '', quoted = '', options = {}) => {
    const { mime, data, filename } = await fn.getFile(path, true);
    const isWebpSticker = options.asSticker || /webp/.test(mime);
    let type = 'document', mimetype = mime, pathFile = filename;
    if (isWebpSticker) {
      pathFile = await writeExif(data, {
        packname: options.packname || dbSettings.packName,
        author: options.author || dbSettings.packAuthor,
        categories: options.categories || [''],
      })
      tmpDir.deleteFile(filename);
      type = 'sticker';
      mimetype = 'image/webp';
    } else if (/image|video|audio/.test(mime)) {
      type = mime.split('/')[0];
      mimetype = type == 'video' ? 'video/mp4' : type == 'audio' ? 'audio/mpeg' : mime
    }
    let anu = await fn.sendMessage(jid, { [type]: { url: pathFile }, caption, mimetype, fileName, ...options }, { quoted, ephemeralExpiration: quoted?.expiration ?? 0, messageId: randomByte(32), ...options });
    tmpDir.deleteFile(pathFile);
    return anu;
  };
  async function _internalSendMessage(chat, content, options = {}) {
    const { quoted, ...restOptions } = options;
    const ephemeralExpiration = quoted?.expiration ?? 0;
    let mentions = [];
    if (typeof content === 'string' || typeof content?.text === 'string' || typeof content?.caption === 'string') {
      const textToParse = content.text || content.caption || content;
      mentions = [...textToParse.matchAll(/@(\d{0,16})(@lid|@s\.whatsapp\.net)?/g)]
        .map(v => v[1] + (v[2] || '@s.whatsapp.net'));
    }
    const opts = typeof content === 'object' ? { ...restOptions, ...content } : { ...restOptions, mentions };
    if (typeof content === 'object') {
      return await fn.sendMessage(chat, content, { ...opts, quoted, ephemeralExpiration, messageId: randomByte(32) });
    } else if (typeof content === 'string') {
      try {
        if (/^https?:\/\//.test(content)) {
          const data = await axios.get(content, { responseType: 'arraybuffer' });
          const mime = data.headers['content-type'] || (await FileType.fromBuffer(data.data))?.mime;
          const finalCaption = opts.caption || '';
          if (/gif|image|video|audio|pdf|stream/i.test(mime)) {
            return await fn.sendMediaBufferOrURL(chat, data.data, '', finalCaption, quoted, opts);
          } else {
            return await fn.sendMessage(chat, { text: content, ...opts }, { quoted, ephemeralExpiration, messageId: randomByte(32) });
          }
        } else {
          return await fn.sendMessage(chat, { text: content, ...opts }, { quoted, ephemeralExpiration, messageId: randomByte(32) });
        }
      } catch (error) {
        log(error, true);
        return await fn.sendMessage(chat, { text: content, ...opts }, { quoted, ephemeralExpiration, messageId: randomByte(32) });
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
      await fn.sendMessage(jid, { audio: { stream: fs.createReadStream(tempFilePath) }, mimetype: 'audio/mpeg', }, { quoted, ephemeralExpiration: quoted?.expiration ?? 0, messageId: randomByte(32) });
    } catch (error) {
      throw new Error(error);
    } finally {
      tmpDir.deleteFile(tempFilePath);
    }
  };
  fn.sendContact = async (jid, displayName, contactName, nomor, quoted) => {
    const vcard =
      `BEGIN:VCARD\n` +
      `VERSION:3.0\n` +
      `N:${displayName}\n` +
      `FN:${contactName}\n` +
      `ORG:${contactName}\n` +
      `TEL;type=CELL;type=VOICE;waid=${nomor}:+${nomor}\n` +
      `END:VCARD`;
    await fn.sendMessage(jid, { contacts: { displayName: displayName, contacts: [{ vcard }] } }, { quoted, ephemeralExpiration: quoted?.expiration ?? 0, messageId: randomByte(32) });
  };
  fn.sendMediaByType = async (jid, mime, dataBuffer, caption, quoted, options) => {
    const quotedOptions = {
      quoted,
      ephemeralExpiration: quoted?.expiration ?? 0,
      messageId: randomByte(32),
      ...options
    };
    if (!mime) {
      return await fn.sendMessage(jid, { document: dataBuffer, mimetype: 'application/octet-stream', fileName: 'file', caption, ...options }, quotedOptions);
    }
    if (mime.includes('gif')) {
      return await fn.sendMessage(jid, { video: dataBuffer, caption, gifPlayback: true, ...options }, quotedOptions);
    } else if (mime.startsWith('image/')) {
      if (mime === 'image/webp') {
        return await fn.sendRawWebpAsSticker(jid, dataBuffer, quoted, options);
      }
      return await fn.sendMessage(jid, { image: dataBuffer, caption, ...options }, quotedOptions);
    } else if (mime.startsWith('video/')) {
      return await fn.sendMessage(jid, { video: dataBuffer, caption, mimetype: mime, ...options }, quotedOptions);
    } else if (mime.startsWith('audio/')) {
      return await fn.sendMessage(jid, { audio: dataBuffer, mimetype: mime, ...options }, quotedOptions);
    } else {
      return await fn.sendMessage(jid, { document: dataBuffer, mimetype: mime, fileName: `file.${mime.split('/')[1] || 'bin'}`, caption, ...options }, quotedOptions);
    }
  };
  fn.getMediaBuffer = async (message) => {
    const MAX_FILE_SIZE = 100 * 1024 * 1024;
    try {
      if (!message) throw new MediaValidationError('Input message kosong');
      let messageType;
      let mediaMessage = message;
      if (message.mimetype) {
        const type = message.mimetype.split('/')[0];
        if (type === 'audio') messageType = 'audio';
        else if (type === 'image') messageType = 'image';
        else if (type === 'video') messageType = 'video';
        else if (type === 'sticker') messageType = 'sticker';
        else messageType = 'document';
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
      throw new Error(error);
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
    const buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await getBuffer(path) : await fs.readFile(path) ? await fs.readFile(path) : Buffer.alloc(0);
    const result = await writeExif(buff, options);
    await fn.sendMessage(jid, { sticker: { url: result }, ...options }, { quoted, ephemeralExpiration: quoted?.expiration ?? 0, messageId: randomByte(32), ...options });
    tmpDir.deleteFile(result);
  };
  fn.sendFileUrl = async (jid, url, caption, quoted, options = {}) => {
    const quotedOptions = {
      quoted,
      ephemeralExpiration: quoted?.expiration ?? 0,
      messageId: randomByte(32),
      ...options
    };
    async function getFileUrl(res, mime) {
      const data = res.data;
      if (!mime) return;
      if (mime.includes('gif')) {
        return await fn.sendMessage(jid, { video: data, caption, gifPlayback: true, ...options }, quotedOptions);
      } else if (mime === 'application/pdf') {
        return await fn.sendMessage(jid, { document: data, mimetype: mime, caption, ...options }, quotedOptions);
      } else if (mime.startsWith('image/')) {
        return await fn.sendMessage(jid, { image: data, caption, ...options }, quotedOptions);
      } else if (mime.startsWith('video/')) {
        return await fn.sendMessage(jid, { video: data, caption, mimetype: mime, ...options }, quotedOptions);
      } else if (mime === 'image/webp') {
        return await fn.sendRawWebpAsSticker(jid, data, quoted, options);
      } else if (mime.startsWith('audio/')) {
        return await fn.sendMessage(jid, { audio: data, mimetype: mime, ptt: true, ...options }, quotedOptions);
      }
    }
    const res = await axios({
      method: 'get',
      url: url,
      responseType: 'arraybuffer',
      family: 4,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36' }
    });
    let mime = res.headers['content-type'];
    if (!mime || mime.includes('octet-stream')) {
      const fileType = await FileType.fromBuffer(res.data);
      mime = fileType?.mime || null;
    }
    return await getFileUrl(res, mime);
  };
  fn.sendFileUrl2 = async (jid, url, caption, quoted, options = {}) => {
    try {
      if (url.startsWith('data:')) {
        const [meta, data] = url.split(',');
        const mime = meta.match(/:(.*?);/)[1];
        const buffer = Buffer.from(data, 'base64');
        const quotedOptions = { quoted, ...options };
        let messageContent = {};
        if (mime.includes('gif')) {
          return await fn.sendMessage(jid, { video: buffer, caption, gifPlayback: true, ...options }, quotedOptions);
        } else if (mime.startsWith('image/')) {
          messageContent = { image: buffer, caption, ...options };
        } else if (mime.startsWith('video/')) {
          messageContent = { video: buffer, caption, mimetype: mime, ...options };
        } else if (mime.startsWith('audio/')) {
          messageContent = { audio: buffer, mimetype: mime, ...options };
        } else {
          messageContent = { document: buffer, mimetype: mime, fileName: caption || 'file', ...options };
        }
        return await fn.sendMessage(jid, messageContent, quotedOptions);
      }
      const MAX_FILE_SIZE_BYTES = 1024 * 1024 * 1024;
      const headResponse = await axios({
        method: 'head',
        url: url,
        family: 4,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36' }
      });
      const contentLength = headResponse.headers['content-length'];
      if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE_BYTES) throw new Error(`File terlalu besar (>${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB).`);
      const dataResponse = await axios({
        method: 'get',
        url: url,
        responseType: 'arraybuffer',
        family: 4,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36' }
      });
      const dataBuffer = dataResponse.data;
      let mimeType = dataResponse.headers['content-type'];
      if (!mimeType || mimeType.includes('octet-stream')) {
        const fileType = await FileType.fromBuffer(dataBuffer);
        mimeType = fileType?.mime || null;
      }
      return await fn.sendMediaByType(jid, mimeType, dataBuffer, caption, quoted, options);
    } catch (error) {
      throw new Error(error);
    }
  };
  fn.sendFilePath = async (jid, caption, localPath, options = {}) => {
    try {
      if (!fs.existsSync(localPath)) throw new Error(`File tidak ditemukan di path: ${localPath}`);
      let mentions = [];
      if (caption && typeof caption === 'string') {
        mentions = [...caption.matchAll(/@(\d+)/g)].map(v => v[1] + '@s.whatsapp.net');
      }
      const fileType = await FileType.fromFile(localPath);
      const mime = fileType?.mime || 'application/octet-stream';
      const fileSizeInMB = fs.statSync(localPath).size / (1024 * 1024);
      const quoted = options.quoted || null;
      const ephemeralExpiration = options?.quoted?.expiration ?? 0;
      const quotedOptions = { quoted, ephemeralExpiration, ...options };
      const fileName = path.basename(localPath);
      let messageContent = {};
      if (fileSizeInMB > 200) {
        messageContent = {
          document: { stream: fs.createReadStream(localPath) },
          mimetype: mime,
          fileName,
          mentions,
          ...options
        };
      } else if (mime.startsWith('audio/')) {
        const convertedPath = await convertAudio(localPath, {
          isNotVoice: !options?.ptt
        });
        const buffer = fs.readFileSync(convertedPath);
        messageContent = {
          audio: buffer, // { stream: fs.createReadStream(convertedPath) }
          mimetype: options?.ptt ? 'audio/ogg; codecs=opus' : 'audio/mpeg',
          ptt: true,
          mentions,
          ...options
        };
      } else if (mime.includes('gif')) {
        messageContent = { video: { stream: fs.createReadStream(localPath) }, gifPlayback: true, mentions, ...options };
      } else if (mime.startsWith('image/')) {
        messageContent = { image: { stream: fs.createReadStream(localPath) }, caption, mentions, ...options };
      } else if (mime.startsWith('video/')) {
        messageContent = { video: { stream: fs.createReadStream(localPath) }, caption, mentions, ...options };
      } else {
        messageContent = { document: { stream: fs.createReadStream(localPath) }, mimetype: mime, fileName, mentions, ...options };
      }
      return await fn.sendMessage(jid, messageContent, quotedOptions);
    } catch (error) {
      throw new Error(error);
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
      attrs: {
        type: 'get',
        xmlns: 'w:g2',
        to: jid
      },
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
        if (meta.isCommunity) {
          continue;
        }
        if (meta.announce) {
          continue;
        }
        data[meta.id] = meta;
      }
    }
    fn.ev.emit('groups.update', Object.values(data));
    return data;
  };
  fn.sendGroupInvite = async (jid, participant, inviteCode, inviteExpiration, groupName = 'Unknown Subject', caption = 'Invitation to join my WhatsApp group', jpegThumbnail = null, options = {}) => {
    const msg = proto.Message.create({
      groupInviteMessage: {
        inviteCode,
        inviteExpiration: parseInt(inviteExpiration) || + new Date(new Date + (3 * 86400000)),
        groupJid: jid,
        groupName,
        jpegThumbnail: Buffer.isBuffer(jpegThumbnail) ? jpegThumbnail : null,
        caption,
        contextInfo: {
          mentionedJid: options.mentions || []
        }
      }
    });
    const message = generateWAMessageFromContent(participant, msg, options);
    const invite = await fn.relayMessage(participant, message.message, { messageId: message.key.id })
    return invite
  };
  fn.deleteBugMessage = async (key, timestamp) => {
    if (key.remoteJid.endsWith('@g.us')) {
      await fn.chatModify({ deleteForMe: { key, timestamp, deleteMedia: true } }, key.remoteJid);
      await fn.sendMessage(key.remoteJid, { delete: key });
    }
    await fn.chatModify({ deleteForMe: { key, timestamp, deleteMedia: true } }, key.remoteJid);
  };
  /*
  fn.handleGroupEventImage = async (idGroup, eventDetails) => {
    const { memberJid, eventText, subject, messageText } = eventDetails;
    const memberNum = memberJid.split('@')[0];
    let profilePictureUrl;
    try {
      profilePictureUrl = await fn.profilePictureUrl(memberJid, 'image');
    } catch {
      profilePictureUrl = './src/media/apatar.png';
    }
    const imageBuffer = await groupImage(memberNum, subject, eventText, profilePictureUrl);
    const outputPath = `./src/sampah/${Date.now()}_${memberNum}.png`;
    await fs.writeFile(outputPath, imageBuffer);
    const caption = `@${memberNum}\n\n${messageText}`;
    await fn.sendFilePath(idGroup, caption, outputPath);
    tmpDir.deleteFile(outputPath);
  };
  */
  fn.sendAlbum = async (jid, array, options = {}) => {
    if (!Array.isArray(array) || array.length < 2) throw new RangeError("Parameter 'array' harus berupa array dengan minimal 2 media.");
    const messageContent = {
      messageContextInfo: {
        messageSecret: randomByte(32),
      },
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
    await fn.relayMessage(album.key.remoteJid, album.message, {
      messageId: album.key.id,
    });
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
  return fn
};