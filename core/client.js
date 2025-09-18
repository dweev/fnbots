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
import { randomByte, getBuffer, getSizeMedia, deleteFile, writeExif } from '../src/lib/function.js';
import { jidNormalizedUser, generateWAMessageFromContent, downloadContentFromMessage, jidDecode, jidEncode, getBinaryNodeChildString, getBinaryNodeChildren, getBinaryNodeChild, proto } from 'baileys';

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
      log(`Error decodeJid: ${jid}\n${error}`, true);
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
  fn.getFile = async (path, save) => {
    let res;
    let filename;
    let data = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await getBuffer(path) : await fs.readFile(path) ? (filename = path, await fs.readFile(path)) : typeof path === 'string' ? path : Buffer.alloc(0)
    let type = await FileType.fromBuffer(data) || { mime: 'application/octet-stream', ext: '.bin' }
    filename = path.join(global.tmpDir, new Date * 1 + '.' + type.ext)
    if (data && save) fs.writeFile(filename, data)
    return {
      res,
      filename,
      size: await getSizeMedia(data),
      ...type,
      data
    }
  };
  fn.sendMediaMessage = async (jid, path, fileName = '', caption = '', quoted = '', options = {}) => {
    const { mime, data, filename } = await fn.getFile(path, true);
    const isWebpSticker = options.asSticker || /webp/.test(mime);
    let type = 'document', mimetype = mime, pathFile = filename;
    if (isWebpSticker) {
      pathFile = await writeExif(data, {
        packname: options.packname || dbSettings.packName,
        author: options.author || dbSettings.packAuthor,
        categories: options.categories || [''],
      })
      await deleteFile(filename);
      type = 'sticker';
      mimetype = 'image/webp';
    } else if (/image|video|audio/.test(mime)) {
      type = mime.split('/')[0];
      mimetype = type == 'video' ? 'video/mp4' : type == 'audio' ? 'audio/mpeg' : mime
    }
    let anu = await fn.sendMessage(jid, { [type]: { url: pathFile }, caption, mimetype, fileName, ...options }, { quoted, ephemeralExpiration: quoted?.expiration ?? 0, messageId: randomByte(32), ...options });
    await deleteFile(pathFile);
    return anu;
  };
  fn.sendPesan = async (chat, content, crot = {}) => {
    const isMessageObject = crot && (crot.expiration !== undefined || crot.chat !== undefined);
    const ephemeralExpiration = isMessageObject ? crot.expiration ?? 0 : 0;
    const options = isMessageObject ? {} : crot || {};
    let mentions = [];
    if (typeof content === 'string' || typeof content?.text === 'string' || typeof content?.caption === 'string') {
      const textToParse = content.text || content.caption || content;
      mentions = [...textToParse.matchAll(/@(\d{0,16})(@lid|@s\.whatsapp\.net)?/g)]
        .map(v => v[1] + (v[2] || '@s.whatsapp.net'));
    }
    const opts = typeof content === 'object' ? { ...options, ...content } : { ...options, mentions };
    if (typeof content === 'object') {
      return await fn.sendMessage(chat, content, { ...opts, ephemeralExpiration, messageId: randomByte(32) });
    } else if (typeof content === 'string') {
      try {
        if (/^https?:\/\//.test(content)) {
          const data = await axios.get(content, { responseType: 'arraybuffer' });
          const mime = data.headers['content-type'] || (await FileType.fromBuffer(data.data))?.mime;
          const finalCaption = opts.caption || '';
          if (/gif|image|video|audio|pdf|stream/i.test(mime)) {
            return await fn.sendMediaMessage(chat, data.data, '', finalCaption, opts);
          } else {
            return await fn.sendMessage(chat, { text: content, ...opts }, { ephemeralExpiration, messageId: randomByte(32) });
          }
        } else {
          return await fn.sendMessage(chat, { text: content, ...opts }, { ephemeralExpiration, messageId: randomByte(32) });
        }
      } catch {
        return await fn.sendMessage(chat, { text: content, ...opts }, { ephemeralExpiration, messageId: randomByte(32) });
      }
    }
  };
  fn.sendReply = async (chat, content, options = {}) => {
    const quoted = options.quoted || options.m || null;
    const ephemeralExpiration = options?.quoted?.expiration ?? 0;
    let mentions = [];
    if (typeof content === 'string' || typeof content?.text === 'string' || typeof content?.caption === 'string') {
      const textToParse = content.text || content.caption || content;
      mentions = [...textToParse.matchAll(/@(\d{0,16})(@lid|@s\.whatsapp\.net)?/g)]
        .map(v => v[1] + (v[2] || '@s.whatsapp.net'));
    }
    const opts = typeof content === 'object' ? { ...options, ...content } : { ...options, mentions };
    if (typeof content === 'object') {
      return await fn.sendMessage(chat, content, { ...opts, quoted, ephemeralExpiration, messageId: randomByte(32) });
    } else if (typeof content === 'string') {
      try {
        if (/^https?:\/\//.test(content)) {
          const data = await axios.get(content, { responseType: 'arraybuffer' });
          const mime = data.headers['content-type'] || (await FileType.fromBuffer(data.data))?.mime;
          const finalCaption = opts.caption || '';
          if (/gif|image|video|audio|pdf|stream/i.test(mime)) {
            return await fn.sendMediaMessage(chat, data.data, '', finalCaption, quoted, opts);
          } else {
            return await fn.sendMessage(chat, { text: content, ...opts }, { quoted, ephemeralExpiration, messageId: randomByte(32) });
          }
        } else {
          return await fn.sendMessage(chat, { text: content, ...opts }, { quoted, ephemeralExpiration, messageId: randomByte(32) });
        }
      } catch {
        return await fn.sendMessage(chat, { text: content, ...opts }, { quoted, ephemeralExpiration, messageId: randomByte(32) });
      }
    }
  };
  fn.getMediaBuffer = async (message) => {
    try {
      if (!message) throw new Error('Input untuk getMediaBuffer kosong');
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
        const foundKey = Object.keys(message).find((key) =>
          ["imageMessage", "videoMessage", "stickerMessage", "audioMessage", "documentMessage"].includes(key)
        );
        if (foundKey) {
          messageType = foundKey.replace("Message", "");
          mediaMessage = message[foundKey];
        }
      }
      if (!messageType) throw new Error('Error_getMediaBuffer_media_tidak_valid');
      const stream = await downloadContentFromMessage(
        mediaMessage,
        messageType
      );
      if (!stream) throw new Error("Error_getMediaBuffer_stream");
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }
      if (buffer.length === 0) throw new Error("Error_getMediaBuffer_buffer_kosong");
      return buffer;
    } catch (error) {
      await log(`Error getMediaBuffer:\n${error}`, true);
      return null;
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
    await deleteFile(result);
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
      const fileSizeInBytes = fs.statSync(localPath).size;
      const fileSizeInMB = fileSizeInBytes / (1024 * 1024);
      const quoted = options.quoted || null;
      const ephemeralExpiration = options?.quoted?.expiration ?? 0;
      const quotedOptions = {
        quoted,
        ephemeralExpiration,
        ...options
      };
      let messageContent = {};
      const fileName = path.basename(localPath);
      if (fileSizeInMB > 200) {
        messageContent = {
          document: { stream: fs.createReadStream(localPath) },
          mimetype: mime,
          fileName: fileName,
          mentions: mentions,
          ...options
        };
      } else {
        if (mime.includes('gif')) {
          messageContent = { video: { stream: fs.createReadStream(localPath) }, gifPlayback: true, mentions: mentions, ...options };
        } else if (mime.startsWith('image/')) {
          messageContent = { image: { stream: fs.createReadStream(localPath) }, caption: caption, mentions: mentions, ...options };
        } else if (mime.startsWith('video/')) {
          messageContent = { video: { stream: fs.createReadStream(localPath) }, caption: caption, mentions: mentions, ...options };
        } else if (mime.startsWith('audio/')) {
          messageContent = { audio: { stream: fs.createReadStream(localPath) }, mimetype: 'audio/mpeg', mentions: mentions, ptt: true, ...options };
        } else {
          messageContent = { document: { stream: fs.createReadStream(localPath) }, mimetype: mime, fileName: fileName, mentions: mentions, ...options };
        }
      }
      return await fn.sendMessage(jid, messageContent, quotedOptions);
    } catch (error) {
      await log(`Error sendFilePath ${localPath}:\n${error}`, true);
      throw error;
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
  return fn
};