// ─── Info ────────────────────────────────
/*
  * Created with ❤️ and 💦 By FN
  * Follow https://github.com/Terror-Machine
  * Feel Free To Use
*/
// ─── Info main.js ────────────────────────

import log from './src/utils/logger.js';
import { isBug } from './src/utils/security.js';
import { randomByte, gifToWebp, imageToWebp, videoToWebp, getBuffer, getSizeMedia, deleteFile } from './src/utils/function.js';
import { database, Settings, mongoStore } from './database/index.js';
import { AuthStore, BaileysSession } from './database/auth.js';
import { loadPlugins } from './src/utils/plugins.js';
import arfine from './src/utils/handler.js';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const exec = util.promisify(cp_exec);
const isPm2 = process.env.pm_id !== undefined || process.env.NODE_APP_INSTANCE !== undefined;
const isSelfRestarted = process.env.RESTARTED_BY_SELF === '1';
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 5000;

function logRestartInfo() { 
    log(`Mode Jalankan: ${isPm2 ? 'PM2' : 'Manual'} | RestartedBySelf: ${isSelfRestarted}`) ;
};

import 'dotenv/config';
import path from 'path';
import util from 'util';
import process from 'process';
import { spawn } from 'child_process';
import { exec as cp_exec } from 'child_process';
import pino from 'pino';
import dayjs from 'dayjs';
import fs from 'fs-extra';
import axios from 'axios';
import webp from 'node-webpmux';
import readline from 'readline';
import FileType from 'file-type';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import { parsePhoneNumber } from 'awesome-phonenumber';
import { 
    default as makeWASocket, 
    jidNormalizedUser, 
    extractMessageContent, 
    generateWAMessageFromContent,
    downloadContentFromMessage, 
    jidDecode, 
    jidEncode, 
    getDevice, 
    areJidsSameUser, 
    Browsers, 
    makeCacheableSignalKeyStore, 
    WAMessageStubType,
    getBinaryNodeChildString, 
    getBinaryNodeChildren, 
    getBinaryNodeChild, 
    isJidBroadcast, 
    fetchLatestBaileysVersion, 
    proto, 
    delay 
} from 'baileys';

class CrotToLive extends Map {
    set(key, value, ttl) {
        super.set(key, value);
        setTimeout(() => this.delete(key), ttl);
    }
};

const pairingCode = process.argv.includes('--qr') ? false : process.argv.includes('--pairing-code') || process.env.PAIRING_CODE === 'true';
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

let pairingStarted = false;
let phoneNumber, version, dbSettings;
let ownerNumber = JSON.parse(process.env.OWNER_NUMBER);
let duplexM = new CrotToLive();
let debugs = false;

import utc from 'dayjs/plugin/utc.js';
import duration from 'dayjs/plugin/duration.js';
import timezone from 'dayjs/plugin/timezone.js';
import localizedFormat from 'dayjs/plugin/localizedFormat.js';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(duration);
dayjs.extend(localizedFormat);

global.tmpDir = './src/sampah';
global.randomSuffix = randomByte(16);
global.debugs = debugs;

const pinoLogger = pino({
    level: 'silent',
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:dd-mm-yyyy HH:MM:ss',
            ignore: 'pid,hostname',
            depthLimit: 10,
            maxExpandDepth: 10,
            showHidden: true
        }
    }
});

async function initializeDatabases() {
    try {
        await database.connect();
        await mongoStore.connect();
        dbSettings = await Settings.getSettings();
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

async function getBaileysVersion() {
    try {
        const { version } = await fetchLatestBaileysVersion();
        return version;
    } catch (error) {
        await log(`Failed to fetch Baileys version:\n${error}`, true);
        const { data } = await axios.get("https://raw.githubusercontent.com/wppconnect-team/wa-version/main/versions.json");
        const currentVersion = data.currentVersion;
        if (!currentVersion) throw new Error("Versi saat ini tidak ditemukan dalam data");
        const versionParts = currentVersion.split('.');
        if (versionParts.length < 3) throw new Error("Format versi tidak valid");
        const major = parseInt(versionParts[0]);
        const minor = parseInt(versionParts[1]);
        const build = parseInt(versionParts[2].split('-')[0]);
        if (isNaN(major) || isNaN(minor) || isNaN(build)) throw new Error("Komponen versi tidak valid");
        return [major, minor, build];
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
async function handleRestart(reason) {
    const currentRestarts = parseInt(process.env.RESTART_ATTEMPTS || '0', 10);
    const nextAttempt = currentRestarts + 1;
    if (currentRestarts >= MAX_RECONNECT_ATTEMPTS) {
        await log(`Gagal total setelah ${MAX_RECONNECT_ATTEMPTS} percobaan. Alasan: ${reason}`);
        process.exit(1);
    }
    await log(`Terjadi error: ${reason}`);
    await log(`Mencoba restart otomatis #${nextAttempt} dalam ${RECONNECT_DELAY_MS / 1000}s...`);
    await delay(RECONNECT_DELAY_MS);
    if (isPm2) {
        await log(`Dijalankan via PM2 → menyerahkan restart ke PM2`);
        process.exit(1);
    } else {
        await log(`Restart manual via spawn`);
        spawn(process.argv[0], process.argv.slice(1), {
            detached: true,
            stdio: 'inherit',
            env: {
                ...process.env,
                RESTART_ATTEMPTS: nextAttempt.toString(),
                RESTARTED_BY_SELF: '1'
            }
        });
        process.exit(0);
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
async function writeExif(media, data) {
    const fileType = await FileType.fromBuffer(media);
    if (!fileType) throw new Error('Error_writeExif_FileType');
    let wMedia;
    if (/webp/.test(fileType.mime)) {
        wMedia = media;
    } else if (/image\/gif/.test(fileType.mime)) {
        wMedia = await gifToWebp(media);
    } else if (/jpeg|jpg|png/.test(fileType.mime)) {
        wMedia = await imageToWebp(media);
    } else if (/video/.test(fileType.mime)) {
        wMedia = await videoToWebp(media);
    } else {
        throw new Error('Error_writeExif');
    }
    const tmpFileIn = path.join(global.tmpDir, `${global.randomSuffix}.webp`);
    const tmpFileOut = path.join(global.tmpDir, `FN-${global.randomSuffix}.webp`);
    await fs.writeFile(tmpFileIn, wMedia);
    if (data) {
        const img = new webp.Image();
        const {
            wra = data.pack_id || dbSettings.packID,
            wrb = data.packname || dbSettings.packName,
            wrc = data.author || dbSettings.packAuthor,
            wrd = data.categories || [''],
            wre = data.isAvatar || 0,
            ...wrf
        } = data;
        const json = {
            'sticker-pack-id': wra,
            'sticker-pack-name': wrb,
            'sticker-pack-publisher': wrc,
            'emojis': wrd,
            'is-avatar-sticker': wre,
            ...wrf
        };
        const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
        const jsonBuff = Buffer.from(JSON.stringify(json), 'utf-8');
        const exif = Buffer.concat([exifAttr, jsonBuff]);
        exif.writeUIntLE(jsonBuff.length, 14, 4);
        await img.load(tmpFileIn);
        await deleteFile(tmpFileIn);
        img.exif = exif;
        await img.save(tmpFileOut);
        return tmpFileOut;
    } else {
        return tmpFileIn;
    };
};
async function clientBot(fn) {
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
        const msg = proto.Message.fromObject({
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
        try {
            if (duplexM.has(m.key.id)) return;
            duplexM.set(m.key.id, Date.now(), 60000);
            const dependencies = {
                dbSettings,
                ownerNumber,
                version
            };
            await arfine(fn, m, dependencies);
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
    try {
        const botJid = jidNormalizedUser(fn.user.id);
        const metadata = await mongoStore.getGroupMetadata(id);
        if (!metadata) {
            const freshMetadata = await fn.groupMetadata(id);
            if (freshMetadata) {
                await mongoStore.updateGroupMetadata(id, freshMetadata);
                if (freshMetadata.participants) {
                    for (const participant of freshMetadata.participants) {
                        const contactJid = jidNormalizedUser(participant.id);
                        const contactName = await fn.getName(contactJid);
                        await updateContact(contactJid, { lid: participant.lid, name: contactName });
                    }
                }
            }
            return;
        }
        if (action === 'add' || action === 'remove') {
            if (action === 'remove') {
                for (const userId of participants) {
                    let leaveMemberJid;
                    if (userId.endsWith('@lid')) {
                        leaveMemberJid = await mongoStore.findJidByLid(userId);
                    } else {
                        leaveMemberJid = jidNormalizedUser(userId);
                    }
                    if (leaveMemberJid.includes(botJid)) {
                        await mongoStore.updateGroupMetadata(id, {});
                        return;
                    }
                }
            }
            const freshMetadata = await fn.groupMetadata(id);
            if (freshMetadata) {
                await mongoStore.updateGroupMetadata(id, freshMetadata);
                if (freshMetadata.participants) {
                    for (const participant of freshMetadata.participants) {
                        const contactJid = jidNormalizedUser(participant.id);
                        const contactName = await fn.getName(contactJid);
                        await updateContact(contactJid, { lid: participant.lid, name: contactName });
                    }
                }
            }
        }
        if (action === 'promote' || action === 'demote') {
            const newStatus = action === 'promote' ? 'admin' : null;
            const currentMetadata = await mongoStore.getGroupMetadata(id);
            if (currentMetadata && currentMetadata.participants) {
                currentMetadata.participants.forEach(p => {
                    if (participants.includes(p.id)) {
                        p.admin = newStatus;
                    }
                });
                await mongoStore.updateGroupMetadata(id, currentMetadata);
                for (const participant of currentMetadata.participants) {
                    const contactJid = jidNormalizedUser(participant.id);
                    const contactName = await fn.getName(contactJid);
                    await updateContact(contactJid, { lid: participant.lid, name: contactName });
                }
            }
        }
    } catch (error) {
        await log(`Error groupParticipantsUpdate:\n${error}`, true);
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
        version = await getBaileysVersion();
        const { state, saveCreds } = await AuthStore();
        const fn = makeWASocket({
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: undefined,
            keepAliveIntervalMs: 6000,
            logger: pinoLogger,
            version: version,
            browser: Browsers.ubuntu('Chrome'),
            emitOwnEvents: true,
            retryRequestDelayMs: 1000,
            maxMsgRetryCount: 5,
            qrTimeout: 60000,
            auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pinoLogger) },
            transactionOpts: { maxCommitRetries: 5, delayBetweenTriesMs: 1000 },
            markOnlineOnConnect: true,
            linkPreviewImageThumbnailWidth: 192,
            syncFullHistory: true,
            fireInitQueries: true,
            generateHighQualityLinkPreview: true,
            shouldIgnoreJid: (jid) => { return isJidBroadcast(jid) && jid !== 'status@broadcast'; },
            appStateMacVerification: { patch: true, snapshot: true },
            enableAutoSessionRecreation: true,
            enableRecentMessageCache: true
        });
        if (pairingCode && !phoneNumber && !fn.authState.creds.registered) {
            let numberToValidate = dbSettings.botNumber ? dbSettings.botNumber : process.env.BOT_NUMBER;
            let isValid = false;
            while (!isValid) {
                if (!numberToValidate) {
                    numberToValidate = await question('Please type your WhatsApp number : ');
                }
                const cleanedNumber = numberToValidate.replace(/[^0-9]/g, '');
                if (cleanedNumber.length >= 9 && parsePhoneNumber('+' + cleanedNumber).valid) {
                    phoneNumber = cleanedNumber;
                    dbSettings.botNumber = cleanedNumber;
                    await Settings.updateSettings(dbSettings);
                    isValid = true;
                    await log('Phone number valid, continuing...\ntunggu sampai kodenya muncul. agak lama. tungguin aja..');
                } else {
                    await log('Invalid number. Start with your country code and make sure it is correct, Example: 628123456789');
                    numberToValidate = null;
                }
            }
            await exec('rm -rf ./src/session/*');
        };
        await clientBot(fn);
        fn.ev.on('creds.update', saveCreds);
        fn.ev.on('connection.update', async ({ connection, lastDisconnect, qr, isNewLogin }) => {
            const statusCode = lastDisconnect?.error ? new Boom(lastDisconnect.error).output.statusCode : 0;
            try {
                if ((connection === 'connecting' || !!qr) && pairingCode && phoneNumber && !fn.authState.creds.registered && !pairingStarted) {
                    setTimeout(async () => {
                        pairingStarted = true;
                        await log('Requesting Pairing Code...')
                        let code = await fn.requestPairingCode(phoneNumber);
                        code = code?.match(/.{1,4}/g)?.join('-') || code;
                        await log(`Your Pairing Code : ${code}`);
                    }, 3000);
                }
                if (connection === 'open') {
                    if (dbSettings.restartState) {
                        dbSettings.restartState = false;
                        await fn.sendPesan(dbSettings.restartId, `✅ Restart sukses..`, dbSettings.dataM);
                        dbSettings.restartId = undefined;
                        dbSettings.dataM = {};
                        await Settings.updateSettings(dbSettings);
                    }
                    await log(`Menghubungkan ke WhatsApp...`);
                    await fn.groupFetchAllParticipating();
                    await log(`WA Version: ${version}`);
                    await log(`BOT Number: ${jidNormalizedUser(fn.user.id).split('@')[0]}`);
                    await log(`${dbSettings.botName} Berhasil tersambung ke whatsapp...`);
                    if (process.env.RESTART_ATTEMPTS && parseInt(process.env.RESTART_ATTEMPTS, 10) > 0) {
                        process.env.RESTART_ATTEMPTS = '0';
                    }
                }
                if (connection === 'close') {
                    await log(`[DISCONNECTED] Connection closed. Code: ${statusCode}`);
                    const code = [401, 402, 403, 411, 500];
                    if (code.includes(statusCode)) {
                        await BaileysSession.deleteMany({});
                        process.exit(1);
                    } else {
                        await handleRestart(`Koneksi terputus dengan kode ${statusCode}`);
                    }
                }
                if (isNewLogin) await log(`New device detected, session restarted!`);
                if (qr) {
                    if (!pairingCode) {
                        log('Scan QR berikut:');
                        qrcode.generate(qr, { small: true }, (qrcodeString) => {
                            const qrStr = String(qrcodeString);
                            log(`\n${qrStr}`);
                        });
                    }
                }
            } catch (error) {
                await log(`Error connection.update:\n${error}`, true);
            }
        });
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