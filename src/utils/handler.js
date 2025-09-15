// ─── Info ────────────────────────────────
/*
  * Created with ❤️ and 💦 By FN
  * Follow https://github.com/Terror-Machine
  * Feel Free To Use
*/
// ─── Info handler.js ─────────────────────

import { formatDuration, formatDurationMessage, formatCommandList, color, waktu, msgs, deleteFile, mycmd, bytesToSize, randomByte } from './function.js';
import { User, Group, Command, Settings, Whitelist } from '../../database/index.js';
import log from './logger.js';
import dayjs from 'dayjs';
import util from 'util';
import os from 'os';
import fs from 'fs-extra';
import axios from 'axios';
import path from 'path';
import { LRUCache } from 'lru-cache';
import { proto, delay } from 'baileys';
import { spawn } from 'child_process';
import { exec as cp_exec } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const exec = util.promisify(cp_exec);
const isPm2 = process.env.pm_id !== undefined || process.env.NODE_APP_INSTANCE !== undefined;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 5000;

const localFilePrefix = 'local-file://';
const recentcmd = new LRUCache({ max: 1000, maxAge: 30000 });
const fspamm = new LRUCache({ max: 500, maxAge: 900000 });
const sban = new LRUCache({ max: 200, maxAge: 900000 });
let mygroup = [];
let chainingCommands = [];
let timeStart = Date.now() / 1000;
let counter = 0;
let ctype = "";
let _checkVIP = false;
let _checkPremium = false;
let _latestMessage = null;
let _latestMessages = null;
let helppremium = new Map();
let helpmaster = new Map();
let helpowner = new Map();
let helputil = new Map();
let helpvip = new Map();
let helpMap = {
    master: helpmaster,
    owner: helpowner,
    vip: helpvip,
    premium: helppremium,
    util: helputil,
};

// ─── Info ────────────────────────────────
/*
  * Created with ❤️ and 💦 By FN
  * Follow https://github.com/Terror-Machine
  * Feel Free To Use
*/
// ─── Info Premium ────────────────────────

async function expiredCheck(fn, ownerNumber) {
    if (_checkPremium) return;
    _checkPremium = true;
    setInterval(async () => {
        const expiredUsers = await User.getExpiredPremiumUsers();
        for (const user of expiredUsers) {
            if (_latestMessages) {
                await fn.sendPesan(ownerNumber[0], `Premium expired: @${user.userId.split('@')[0]}`, _latestMessages);
                await User.removePremium(user.userId);
            }
        }
    }, 60000);
};
async function expiredVIPcheck(fn, ownerNumber) {
    if (_checkVIP) return;
    _checkVIP = true;
    setInterval(async () => {
        const expiredUsers = await User.getExpiredVIPUsers();
        for (const user of expiredUsers) {
            if (_latestMessage) {
                await fn.sendPesan(ownerNumber[0], `VIP expired: @${user.userId.split('@')[0]}`, _latestMessage);
                await User.removeVIP(user.userId);
            }
        }
    }, 60000);
};

// ─── Info ────────────────────────────────
/*
  * Created with ❤️ and 💦 By FN
  * Follow https://github.com/Terror-Machine
  * Feel Free To Use
*/
// ─── Info ────────────────────────────────

async function warmingUpCacheCommands() {
    try {
        const commandMatches = [];
        const fileStream = fs.createReadStream(path.resolve(__filename), {
            encoding: 'utf-8',
            highWaterMark: 1024
        });
        for await (const chunk of fileStream) {
            const commandRegex = /get(Coms|Prefix)\([^)]+, '([^']+)'\)/g;
            let match;
            while ((match = commandRegex.exec(chunk)) !== null) {
                commandMatches.push(match[2]);
            }
        }
        const uniqueCommands = [...new Set(commandMatches)];
        for (const command of uniqueCommands) {
            if (helpMap[ctype]) {
                helpMap[ctype].set(command, command);
            }
        }
    } catch (error) {
        log(`Error warmingUpCacheCommands:\n${error}`, true);
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
async function getSerial(m) {
    if (m?.key?.fromMe) return;
    const sender = m.sender;
    return sender;
};
async function getComs(txt, word) {
    try {
        const command = await Command.findOrCreate(word, ctype);
        if (helpMap[ctype]) {
            helpMap[ctype].set(word, word);
        }
        const validNames = [command.name, ...command.aliases];
        if (validNames.includes(txt)) {
            await Settings.incrementTotalHitCount();
            return true;
        }
        return false;
    } catch (error) {
        await log(`Error in getComs: ${error}`, true);
        return false;
    }
};
async function getPrefix(txt, word) {
    try {
        txt = txt.trim();
        const firstWord = txt.split(/\s+/)[0];
        const command = await Command.findOrCreate(word, ctype);
        if (helpMap[ctype]) {
            helpMap[ctype].set(word, word);
        }
        const validNames = [command.name, ...command.aliases];
        if (validNames.some(name => firstWord === name)) {
            await Settings.incrementTotalHitCount();
            return true;
        }
        return false;
    } catch (error) {
        await log(`Error in getPrefix: ${error}`, true);
        return false;
    }
};
async function getTxt(txt, dbSettings) {
    if (txt.startsWith(dbSettings.rname)) {
        txt = txt.replace(dbSettings.rname, "");
    } else if (txt.startsWith(dbSettings.sname)) {
        txt = txt.replace(dbSettings.sname, "");
    }
    txt = txt.trim();
    return txt;
};
async function sendAndCleanupFile(fn, toId, localPath, m, dbSettings) {
    try {
        const ext = path.extname(localPath).toLowerCase();
        const stickerExtensions = new Set(['.gif', '.webp']);
        const mediaExtensions = new Set(['.png', '.jpg', '.jpeg', '.mp4']);
        if (stickerExtensions.has(ext)) {
            await fn.sendRawWebpAsSticker(toId, localPath, m, {
                packname: dbSettings.packName,
                author: dbSettings.packAuthor
            });
        } else if (mediaExtensions.has(ext)) {
            await fn.sendFilePath(toId, dbSettings.autocommand, localPath, { quoted: m });
        } else {
            await fn.sendReply(toId, `File generated at: ${localPath}`, { quoted: m });
        }
    } catch (error) {
        await log(`Error saat mengirim file hasil eval:\n${error}`, true);
        await fn.sendReply(toId, `Gagal mengirim file: ${error.message}`, { quoted: m });
    } finally {
        await deleteFile(localPath);
    }
};

await warmingUpCacheCommands();

export default async function arfine(fn, m, { dbSettings, ownerNumber, version }) {
    _latestMessage = m;
    _latestMessages = m;
    await expiredCheck(fn, ownerNumber);
    await expiredVIPcheck(fn, ownerNumber);

    // ─── Basic info ─────────────────────
    const serial = await getSerial(m);
    const id = m.key.id;
    const t = m.timestamp;
    const pushname = m.pushName || 'Unknown';
    const fromBot = m.fromMe;
    let toId = m.from;

    // ─── Quoted info ────────────────────
    const quotedMsg = m.quoted ? m.quoted : false;
    const quotedParticipant = m.quoted?.sender || '';
    const mentionedJidList = Array.isArray(m.mentionedJid) ? m.mentionedJid : [];

    // ─── Validator Info ─────────────────
    const masterUser = await User.findOne({ 
        userId: serial, 
        isMaster: true 
    });
    const vipUser = await User.findOne({
        userId: serial,
        isVIP: true,
        vipExpired: { $gt: new Date() }
    });
    const premiumUser = await User.findOne({
        userId: serial,
        isPremium: true,
        premiumExpired: { $gt: new Date() }
    });

    const botNumber = m.botnumber;
    const isSadmin = ownerNumber.includes(serial);
    const isMaster = !!masterUser;
    const isVIP = !!vipUser;
    const isPremium = !!premiumUser;
    const isWhiteList = await Whitelist.isWhitelisted(toId, 'group');
    const hakIstimewa = [isSadmin, isMaster, isVIP, isPremium].some(Boolean);
    const isBotGroupAdmins = m.isBotAdmin || false;

    // ─── Parsing info ───────────────────
    const body = m?.body;

    const reactDone = async () => { await delay(1000); await fn.sendMessage(toId, { react: { text: '✅', key: m.key } }) };
    const reactFail = async () => { await delay(1000); await fn.sendMessage(toId, { react: { text: '❎', key: m.key } }) };
    const sReply = (content, options = {}) => fn.sendReply(toId, content, { quoted: m, ...options });
    const sPesan = (content) => fn.sendPesan(toId, content, m);

    async function handleAddPremiumUser(userId, duration) {
        try {
            const durationParsed = formatDuration(duration);
            const msToAdd = durationParsed.asMilliseconds();
            await User.addPremium(userId, msToAdd);
            const durationMessage = formatDurationMessage(durationParsed);
            await sReply(`*「 PREMIUM ADDED 」*\n\n➸ *ID*: @${userId.split('@')[0]}\n${durationMessage}`);
        } catch (error) {
            await sReply(`Error: ${error.message}`);
        }
    }
    async function handleDeletePremiumUser(input) {
        try {
            if (mentionedJidList.length > 0) {
                for (const userId of mentionedJidList) {
                    await User.removePremium(userId);
                }
                await reactDone();
            } else {
                const targets = input.split(",").map(s => s.trim()).filter(Boolean);
                for (const target of targets) {
                    if (target.includes('@')) {
                        await User.removePremium(target);
                    } else {
                        // Handle numeric index if needed
                        const allPremium = await User.findActivePremiums();
                        if (target >= 1 && target <= allPremium.length) {
                            await User.removePremium(allPremium[target - 1].userId);
                        }
                    }
                }
                await reactDone();
            }
        } catch (error) {
            await sReply(`Error: ${error.message}`);
        }
    }
    async function handleListPremiumUsers() {
        try {
            const premiumUsers = await User.findActivePremiums();
            let ts = "*## " + dbSettings.botName + " Premium ##*\n";
            let no = 1;
            const sortedUsers = premiumUsers.sort((a, b) => b.premiumExpired - a.premiumExpired);
            for (let user of sortedUsers) {
                const expiredDate = dayjs(user.premiumExpired);
                const now = dayjs();
                const durationLeft = dayjs.duration(expiredDate.diff(now));
                const durationMessage = formatDurationMessage(durationLeft);
                ts += `\n${no}. @${user.userId.split('@')[0]}\n   ${durationMessage}\n`;
                no += 1;
            }
            ts += "\nRegards: *" + dbSettings.botName + "*";
            await sReply(ts);
        } catch (error) {
            await sReply(`Error: ${error.message}`);
        }
    }
    async function handleAddVIPUser(userId, duration) {
        try {
            const durationParsed = formatDuration(duration);
            const msToAdd = durationParsed.asMilliseconds();
            await User.addVIP(userId, msToAdd);
            const durationMessage = formatDurationMessage(durationParsed);
            await sReply(`*「 VIP ADDED 」*\n\n➸ *ID*: @${userId.split('@')[0]}\n${durationMessage}`);
        } catch (error) {
            await sReply(`Error: ${error.message}`);
        }
    }
    async function handleDeleteVIPUser(input) {
        try {
            if (mentionedJidList.length > 0) {
                for (const userId of mentionedJidList) {
                    await User.removeVIP(userId);
                }
                await reactDone();
            } else {
                const targets = input.split(",").map(s => s.trim()).filter(Boolean);
                for (const target of targets) {
                    if (target.includes('@')) {
                        await User.removeVIP(target);
                    } else {
                        const allVIP = await User.findActiveVIPs();
                        if (target >= 1 && target <= allVIP.length) {
                            await User.removeVIP(allVIP[target - 1].userId);
                        }
                    }
                }
                await reactDone();
            }
        } catch (error) {
            await sReply(`Error: ${error.message}`);
        }
    }
    async function handleListVIPUsers() {
        try {
            const vipUsers = await User.findActiveVIPs();
            let ts = "*## " + dbSettings.botName + " VIP ##*\n";
            let no = 1;
            const sortedUsers = vipUsers.sort((a, b) => b.vipExpired - a.vipExpired);
            for (let user of sortedUsers) {
                const expiredDate = dayjs(user.vipExpired);
                const now = dayjs();
                const durationLeft = dayjs.duration(expiredDate.diff(now));
                const durationMessage = formatDurationMessage(durationLeft);
                ts += `\n${no}. @${user.userId.split('@')[0]}\n   ${durationMessage}\n`;
                no += 1;
            }
            ts += "\nRegards: *" + dbSettings.botName + "*";
            await sReply(ts);
        } catch (error) {
            await sReply(`Error: ${error.message}`);
        }
    }
    async function restartSelf(a, b) {
        try {
            dbSettings.restartState = true;
            dbSettings.restartId = a;
            dbSettings.dataM = b;
            await Settings.updateSettings(dbSettings);
            await delay(1000);
            await fn.sendMessage(a, { react: { text: '✅', key: b.key } });
            await handleRestart("Restarting...");
        } catch (error) {
            await log(`Error in restart: ${error}`, true);
        }
    }
    async function commandMenu({
        isSadmin, master, vip, premium,
        helpmaster, helpowner, helpvip, helppremium, helputil
    }) {
        let ts = `*── ${dbSettings.botName} ──*`;
        const menuSections = [
            { title: 'MASTER COMMANDS', data: helpmaster, required: isSadmin },
            { title: 'OWNER COMMANDS', data: helpowner, required: isSadmin || master },
            { title: 'VIP COMMANDS', data: helpvip, required: isSadmin || master || vip },
            { title: 'PREMIUM COMMANDS', data: helppremium, required: isSadmin || master || vip || premium },
            { title: 'UTIL COMMANDS', data: helputil, required: true },
        ];

        for (const section of menuSections) {
            if (section.required) {
                const commandListString = await formatCommandList(section.data);
                if (commandListString) {
                    ts += `\n\n*${section.title}*${commandListString}`;
                }
            }
        }
        ts += `\n\nRegards: *FNBOTS*`;
        return ts;
    }

    if (body?.toLowerCase().trim() == "restart") {
        if (isSadmin || isMaster) {
            await restartSelf(toId, m);
        }
    }

    let mentiones = mentionedJidList;
    let args = (body && body?.trim() !== "") ? (body?.slice(dbSettings.rname.length).trim().split(/ +/).slice(1) || body?.slice(dbSettings.sname.length).trim().split(/ +/).slice(1)) : [];
    let arg = body?.includes(' ') ? body?.trim().substring(body?.indexOf(' ') + 1) : '';
    let ar = args.map((v) => v.toLowerCase());
    let txt = body?.toLowerCase();
    let isCmd = txt?.startsWith(dbSettings.rname) || txt?.startsWith(dbSettings.sname);

    try {
        if (fromBot || (serial === botNumber)) return;
        if (isCmd) {
            if (txt.includes("r:")) {
                const [, fa] = txt.split("r:");
                const [numStr, ...rest] = fa.trim().split(" ");
                const index = parseInt(numStr) - 1;
                toId = mygroup[index];
                txt = rest.join(" ").trim();
            };
            chainingCommands = await mycmd(await getTxt(txt, dbSettings));
            async function executeCommandChain(commandList) {
                const failedCommands = [];
                for (const aa of commandList) {
                    let commandFound = false;
                    txt = aa;
                    if (isSadmin) {
                        ctype = "master";
                        if (!commandFound && await getPrefix(txt, 'debug')) {
                            try {
                                const mode = (args[0] || '').toLowerCase();
                                if (!['on', 'off'].includes(mode)) throw new Error(`gunakan perintah dengan benar, contoh: ${dbSettings.rname}debug on/off`);
                                global.debugs = mode === 'on';
                                await reactDone();
                                commandFound = true;
                            } catch (error) {
                                await sReply(`Error: ${error.message}`);
                            }
                        } else if (!commandFound && await getPrefix(txt, 'logger')) {
                            try {
                                const mode = (args[0] || '').toLowerCase();
                                if (!['silent', 'trace', 'debug', 'info', 'warn', 'error', 'fatal'].includes(mode)) throw new Error(`gunakan perintah dengan benar, contoh: ${dbSettings.rname}logger silent/trace/debug/info/warn/error/fatal`);
                                dbSettings.pinoLogger = mode;
                                await Settings.updateSettings(dbSettings);
                                await sReply(`pinoLogger sudah dirubah menjadi: \n\n- level: ${dbSettings.pinoLogger}`);
                                commandFound = true;
                            } catch (error) {
                                await sReply(`Error: ${error.message}`);
                            }
                        } else if (!commandFound && await getPrefix(txt, 'maintenance')) {
                            try {
                                const mode = (args[0] || '').toLowerCase();
                                if (!['on', 'off'].includes(mode)) throw new Error(`gunakan perintah dengan benar, contoh: ${dbSettings.rname}maintenance on/off`);
                                dbSettings.maintenance = mode === 'on';
                                await Settings.updateSettings(dbSettings);
                                await reactDone();
                                commandFound = true;
                            } catch (error) {
                                await sReply(`Error: ${error.message}`);
                            }
                        } else if (!commandFound && await getPrefix(txt, 'addowner')) {
                            try {
                                if (!arg && !quotedMsg) throw new Error(`gunakan perintah dengan benar, contoh: ${dbSettings.rname}addowner @user atau reply pesan user`);
                                if (mentiones.length != 0) {
                                    for (let men of mentiones) {
                                        const existingUser = await User.findOne({ userId: men });
                                        if (existingUser) {
                                            existingUser.isMaster = true;
                                            await existingUser.save();
                                        } else {
                                            await User.create({ userId: men, isMaster: true });
                                        }
                                        await reactDone();
                                    }
                                } else if (quotedMsg) {
                                    const existingUser = await User.findOne({ userId: quotedParticipant });
                                    if (existingUser) {
                                        existingUser.isMaster = true;
                                        await existingUser.save();
                                    } else {
                                        await User.create({ userId: quotedParticipant, isMaster: true });
                                    }
                                    await reactDone();
                                }
                                commandFound = true;
                            } catch (error) {
                                await sReply(`Error: ${error.message}`);
                            }
                        } else if (!commandFound && await getPrefix(txt, 'delowner')) {
                            try {
                                if (!args.length) throw new Error(`gunakan perintah dengan benar, contoh: ${dbSettings.rname}delowner @user1,@user2`);
                                if (mentiones.length > 0) {
                                    for (const userId of mentiones) {
                                        const user = await User.findOne({ userId });
                                        if (user) {
                                            user.isMaster = false;
                                            await user.save();
                                        }
                                    }
                                    await reactDone();
                                } else {
                                    const targets = arg.split(",").map(s => s.trim()).filter(Boolean);
                                    for (const target of targets) {
                                        if (target.includes('@')) {
                                            const user = await User.findOne({ userId: target });
                                            if (user) {
                                                user.isMaster = false;
                                                await user.save();
                                            }
                                        }
                                    }
                                    await reactDone();
                                }
                                commandFound = true;
                            } catch (error) {
                                await sReply(`Error: ${error.message}`);
                            }
                        } else if (!commandFound && await getComs(txt, 'listowner')) {
                            try {
                                const owners = await User.find({ isMaster: true });
                                let list = `This is list of owner number\nTotal: ${owners.length}\n`;
                                owners.forEach((owner, i) => {
                                    list += `\n${i + 1}. @${owner.userId.split('@')[0]}`;
                                });
                                await sReply(list);
                                commandFound = true;
                            } catch (error) {
                                await sReply(`Error: ${error.message}`);
                            }
                        } else if (!commandFound && await getPrefix(txt, 'addalias')) {
                            try {
                                if (args.length !== 2) {
                                    throw new Error(`Gunakan format: ${dbSettings.rname}addalias <perintah_utama> <alias_baru>`);
                                }
                                const commandName = args[0].toLowerCase();
                                const newAlias = args[1].toLowerCase();
                                await Command.addAlias(commandName, newAlias);
                                await sReply(`Berhasil menambahkan alias '${newAlias}' untuk perintah '${commandName}'.`);
                                commandFound = true;
                            } catch (error) {
                                await sReply(`Error: ${error.message}`);
                            }
                        } else if (!commandFound && await getPrefix(txt, 'delalias')) {
                            try {
                                if (args.length !== 2) {
                                    throw new Error(`Gunakan format: ${dbSettings.rname}delalias <perintah_utama> <alias_yang_dihapus>`);
                                }
                                const commandName = args[0].toLowerCase();
                                const aliasToRemove = args[1].toLowerCase();
                                await Command.removeAlias(commandName, aliasToRemove);
                                await sReply(`Berhasil menghapus alias '${aliasToRemove}' dari perintah '${commandName}'.`);
                                commandFound = true;
                            } catch (error) {
                                await sReply(`Error: ${error.message}`);
                            }
                        } else if (!commandFound && await getComs(txt, 'resetcommands')) {
                            try {
                                const result = await Command.resetAll();
                                await sReply(`Berhasil! Sebanyak ${result.deletedCount} data perintah telah dihapus dari database. Silakan restart bot untuk menyegarkan cache menu.`);
                                commandFound = true;
                            } catch (error) {
                                await sReply(`Error: ${error.message}`);
                            }
                        }
                    }
                    if (isSadmin || isMaster) {
                        ctype = "owner"
                        if (!commandFound && await getPrefix(txt, 'premium')) {
                            try {
                                if (arg) {
                                    if (ar[0] === 'add') {
                                        if (mentionedJidList.length !== 0) {
                                            for (let benet of mentionedJidList) {
                                                await handleAddPremiumUser(benet, args[2]);
                                            }
                                        } else {
                                            await handleAddPremiumUser(args[1] + '@s.whatsapp.net', args[2]);
                                        }
                                    } else if (ar[0] === 'del') {
                                        const input = body.split("premium del ")[1]?.trim();
                                        if (!input) throw new Error(`Gunakan format yang benar, contoh: ${dbSettings.rname}premium del @user`);
                                        await handleDeletePremiumUser(input);
                                    } else if (ar[0] === 'list') {
                                        await handleListPremiumUsers();
                                    } else {
                                        throw new Error(`Sub-perintah '${ar[0]}' tidak valid. Gunakan 'add', 'del', atau 'list'.`);
                                    }
                                } else {
                                    const guideMessage = `*❏ PANDUAN PERINTAH PREMIUM ❏*

Berikut adalah cara menggunakan perintah premium:

*1. Menambah Premium:*
\`\`\`${dbSettings.rname}premium add <@user/nomor> <durasi>\`\`\`
Contoh: \`${dbSettings.rname}premium add @user 30d\` atau \`${dbSettings.rname}premium add 62812... 1M\`

*2. Menghapus Premium:*
\`\`\`${dbSettings.rname}premium del <@user/nomor_list>\`\`\`
Contoh: \`${dbSettings.rname}premium del @user1,@user2\`

*3. Melihat Daftar Premium:*
\`\`\`${dbSettings.rname}premium list\`\`\``;
                                    await sReply(guideMessage);
                                }
                                commandFound = true;
                            } catch (error) {
                                await sReply(`Error: ${error.message}`);
                            }
                        } else if (!commandFound && await getPrefix(txt, 'vip')) {
                            try {
                                if (arg) {
                                    if (ar[0] === 'add') {
                                        if (mentionedJidList.length !== 0) {
                                            for (let benet of mentionedJidList) {
                                                await handleAddVIPUser(benet, args[2]);
                                            }
                                        } else {
                                            await handleAddVIPUser(args[1] + '@s.whatsapp.net', args[2]);
                                        }
                                    } else if (ar[0] === 'del') {
                                        const input = body.split("vip del ")[1]?.trim();
                                        if (!input) throw new Error(`Gunakan format yang benar, contoh: ${dbSettings.rname}vip del @user`);
                                        await handleDeleteVIPUser(input);
                                    } else if (ar[0] === 'list') {
                                        await handleListVIPUsers();
                                    } else {
                                        throw new Error(`Sub-perintah '${ar[0]}' tidak valid. Gunakan 'add', 'del', atau 'list'.`);
                                    }
                                } else {
                                    const guideMessage = `*❏ PANDUAN PERINTAH VIP ❏*

Berikut adalah cara menggunakan perintah VIP:

*1. Menambah VIP:*
\`\`\`${dbSettings.rname}vip add <@user/nomor> <durasi>\`\`\`
Contoh: \`${dbSettings.rname}vip add @user 7d\`

*2. Menghapus VIP:*
\`\`\`${dbSettings.rname}vip del <@user/nomor_list>\`\`\`
Contoh: \`${dbSettings.rname}vip del @user\`

*3. Melihat Daftar VIP:*
\`\`\`${dbSettings.rname}vip list\`\`\``;
                                    await sReply(guideMessage);
                                }
                                commandFound = true;
                            } catch (error) {
                                await sReply(`Error: ${error.message}`);
                            }
                        } else if (!commandFound && await getPrefix(txt, 'akses')) {
                            try {
                                const subcmd = ar[0];
                                const target = args.slice(1).join(" ");
                                if (subcmd === "reset") {
                                    await Whitelist.clearAll();
                                    await reactDone();
                                } else if (subcmd === "add") {
                                    if (target.match(/(chat.whatsapp.com)/gi)) {
                                        const inviteCode = target.split("https://chat.whatsapp.com/")[1];
                                        try {
                                            const { restrict, joinApprovalMode, subject, id } = await fn.groupGetInviteInfo(inviteCode);
                                            if (joinApprovalMode) throw new Error(`Bot tidak bisa masuk ke grup yang membutuhkan approval.`);
                                            await fn.groupAcceptInvite(inviteCode);
                                            await Whitelist.addToWhitelist(id, serial, 'Added via group invite', 'group');
                                            if (!restrict) {
                                                await fn.sendPesan(id, `Halo warga grup *${subject}*!\nTerima kasih sudah mengundang ${dbSettings.botName}. Ketik *.rules* untuk melihat peraturan.`, m);
                                            }
                                        } catch (error) {
                                            await log(`Error command akses add\n${error}`, true);
                                            await sReply(`Error: ${error.message}`);
                                        }
                                    } else if (target.includes("@g.us")) {
                                        await Whitelist.addToWhitelist(target, serial, 'Added manually', 'group');
                                        await reactDone();
                                    } else {
                                        if (m.isGroup) {
                                            await Whitelist.addToWhitelist(m.key.remoteJid, serial, 'Added via command', 'group');
                                            await reactDone();
                                        } else {
                                            throw new Error("Perintah `akses add` tanpa target hanya bisa digunakan di dalam grup.");
                                        }
                                    }
                                } else if (subcmd === "del") {
                                    if (target.includes("@g.us")) {
                                        await Whitelist.removeFromWhitelist(target, 'group');
                                        await reactDone();
                                    } else {
                                        if (m.isGroup) {
                                            await Whitelist.removeFromWhitelist(m.key.remoteJid, 'group');
                                            await reactDone();
                                        } else {
                                            throw new Error("Perintah `akses del` tanpa target hanya bisa digunakan di dalam grup.");
                                        }
                                    }
                                } else if (subcmd === "list") {
                                    const whitelistedGroups = await Whitelist.getWhitelistedGroups();
                                    let list = "📜 *Daftar Whitelist Grup:*\n\n";
                                    if (whitelistedGroups.length > 0) {
                                        let i = 1;
                                        for (const whitelist of whitelistedGroups) {
                                            try {
                                                const groupMeta = await fn.groupMetadata(whitelist.targetId);
                                                list += `${i++}. ${groupMeta.subject}\n   ↳ \`${whitelist.targetId}\`\n`;
                                            } catch {
                                                list += `${i++}. ❎ Tidak dapat membaca metadata\n   ↳ \`${whitelist.targetId}\`\n`;
                                            }
                                        }
                                    } else {
                                        list += "_Tidak ada grup yang di-whitelist._";
                                    }
                                    await sReply(list);
                                } else {
                                    const guideMessage = `*❏ PANDUAN PERINTAH AKSES (WHITELIST) ❏*

Gunakan perintah ini untuk mengelola grup mana saja yang bisa menggunakan bot.

*1. Menambah Akses:*
   ↳ \`${dbSettings.rname}akses add\` (di dalam grup target)
   ↳ \`${dbSettings.rname}akses add <link_grup>\`
   ↳ \`${dbSettings.rname}akses add <id_grup@g.us>\`

*2. Menghapus Akses:*
   ↳ \`${dbSettings.rname}akses del\` (di dalam grup target)
   ↳ \`${dbSettings.rname}akses del <id_grup@g.us>\`

*3. Melihat Daftar Akses:*
   ↳ \`${dbSettings.rname}akses list\`

*4. Mereset Semua Akses:*
   ↳ \`${dbSettings.rname}akses reset\` (Hati-hati!)`;
                                    await sReply(guideMessage);
                                }
                                commandFound = true;
                            } catch (error) {
                                await sReply(`Error: ${error.message}`);
                            }
                        } else if (!commandFound && await getComs(txt, 'stats')) {
                            try {
                                const currentSettings = await Settings.getSettings();
                                const [npmVersionData, diskData, virtData, ipInfo, packageJson] = await Promise.all([
                                    exec('npm -v').catch(() => ({ stdout: 'N/A' })),
                                    exec('df -h /').catch(() => ({ stdout: '' })),
                                    exec('systemd-detect-virt').catch(() => ({ stdout: 'N/A' })),
                                    axios.get('https://ipinfo.io/json').catch(() => ({ data: {} })),
                                    fs.readFile('./package.json', 'utf8').then(JSON.parse).catch(() => ({}))
                                ]);
                                const used = process.memoryUsage();
                                const cpus = os.cpus();
                                const cpuModel = cpus[0].model.trim();
                                const cpuCores = cpus.length;
                                const totalMem = os.totalmem();
                                const freeMem = os.freemem();
                                const usedMem = totalMem - freeMem;
                                const nodeVersion = process.version;
                                const hostname = os.hostname();
                                const platform = os.platform();
                                const release = os.release();
                                const arch = os.arch();
                                const load = os.loadavg().map(n => n.toFixed(2)).join(', ');
                                const networkInterfaces = os.networkInterfaces();
                                let ipv4Active = 'No', ipv6Active = 'No';
                                for (const iface in networkInterfaces) {
                                    for (const details of networkInterfaces[iface]) {
                                        if (!details.internal) {
                                            if (details.family === 'IPv4') ipv4Active = 'Yes';
                                            if (details.family === 'IPv6') ipv6Active = 'Yes';
                                        }
                                    }
                                }
                                const npmVersion = npmVersionData.stdout.trim();
                                let diskUsed = 'N/A', diskTotal = 'N/A', diskPercent = 'N/A';
                                const dfOutput = diskData.stdout.toString().split('\n')[1];
                                if (dfOutput) {
                                    const df = dfOutput.trim().split(/\s+/);
                                    diskTotal = df[1] || 'N/A';
                                    diskUsed = df[2] || 'N/A';
                                    diskPercent = df[4] || 'N/A';
                                }
                                let virtualization = virtData.stdout.toString().trim();
                                virtualization = virtualization.toLowerCase() === 'none' ? 'Dedicated' : virtualization;
                                const ip = (ipInfo.data.ip || 'N/A').replace(/^(\d+)\.\d+\.\d+\.\d+$/, '$1.x.x.x');
                                const region = ipInfo.data.country || 'N/A';
                                const isp = ipInfo.data.org || 'N/A';
                                const dependencies = packageJson.dependencies || {};
                                const devDependencies = packageJson.devDependencies || {};
                                const totalModules = Object.keys(dependencies).length + Object.keys(devDependencies).length;
                                let a = '';
                                a += `*❏ BOT STATISTICS*\n`;
                                a += `> WhatsApp Version: ${version?.join('.') || 'Unknown'}\n`;
                                a += `> Node.js: ${nodeVersion}\n`;
                                a += `> NPM: ${npmVersion}\n`;
                                a += `> Installed Modules: ${totalModules}\n`;
                                a += `> Total Perintah Dijalankan: ${currentSettings?.totalHitCount || 0}\n`;
                                a += `> Bot Version: ${packageJson.version || 'Unknown'}\n`;
                                a += `> Bot Uptime: ${waktu(process.uptime())}\n`;
                                a += `> System Uptime: ${waktu(os.uptime())}\n`;
                                a += `> Load Average (1m,5m,15m): ${load}\n\n`;
                                a += `*❏ Node.js Memory Usage*\n`;
                                a += Object.keys(used).map(key => `> ${key}: ${bytesToSize(used[key])}`).join('\n') + '\n\n';
                                a += `*❏ INFO SERVER*\n`;
                                a += `> Hostname: ${hostname}\n`;
                                a += `> CPU Model: ${cpuModel}\n`;
                                a += `> CPU Core/Threads: ${cpuCores}\n`;
                                a += `> Platform: ${platform}\n`;
                                a += `> OS: ${release}\n`;
                                a += `> Kernel Arch: ${arch}\n`;
                                a += `> Virtualization: ${virtualization}\n`;
                                a += `> IPv4 Active: ${ipv4Active}\n`;
                                a += `> IPv6 Active: ${ipv6Active}\n`;
                                const ramPercentage = totalMem > 0 ? ((usedMem / totalMem) * 100).toFixed(2) + '%' : 'N/A';
                                a += `> Ram: ${bytesToSize(usedMem)} / ${bytesToSize(totalMem)} (${ramPercentage})\n`;
                                a += `> Disk: ${diskUsed} / ${diskTotal} (${diskPercent})\n\n`;
                                a += `*❏ PROVIDER INFO*\n`;
                                a += `> IP: ${ip}\n`;
                                a += `> Region: ${region}\n`;
                                a += `> ISP: ${isp}`;
                                await sReply(a.trim());
                                commandFound = true;
                            } catch (error) {
                                await log(`Error saat mengambil stats:\n${error}`, true);
                                await sReply(`Terjadi kesalahan saat mengambil data statistik:\n${error.message}`);
                            }
                        } else if (!commandFound && await getComs(txt, 'runtime')) {
                            let tms = (Date.now() / 1000) - (timeStart);
                            let cts = waktu(tms);
                            await sReply(cts);
                            commandFound = true;
                        }
                    }
                    if (isSadmin || isMaster || (isWhiteList && hakIstimewa)) {
                        if (isSadmin || isMaster || isVIP) {
                            ctype = "vip"
                            if (!commandFound && await getPrefix(txt, 'checkvip')) {
                                try {
                                    let targetId = mentionedJidList[0] || serial;
                                    const vipUser = await User.findOne({
                                        userId: targetId,
                                        isVIP: true,
                                        vipExpired: { $gt: new Date() }
                                    });
                                    if (!vipUser) {
                                        await sReply(`@${targetId.split('@')[0]} tidak memiliki status VIP aktif.`);
                                        return;
                                    }
                                    const remainingMs = vipUser.vipExpired - Date.now();
                                    const durationLeft = dayjs.duration(remainingMs);
                                    const durationMessage = formatDurationMessage(durationLeft);
                                    await sReply(`「 *VIP EXPIRE* 」\n\n➸ *ID*: @${targetId.split('@')[0]}\n➸ ${durationMessage}`);
                                    commandFound = true;
                                } catch (error) {
                                    await sReply(`Error: ${error.message}`);
                                }
                            }
                        }
                        if (hakIstimewa) {
                            ctype = "premium"
                            if (!commandFound && await getPrefix(txt, 'checkpremium')) {
                                try {
                                    let targetId = mentionedJidList[0] || serial;
                                    const premiumUser = await User.findOne({
                                        userId: targetId,
                                        isPremium: true,
                                        premiumExpired: { $gt: new Date() }
                                    });
                                    if (!premiumUser) {
                                        await sReply(`@${targetId.split('@')[0]} tidak memiliki status Premium aktif.`);
                                        return;
                                    }
                                    const remainingMs = premiumUser.premiumExpired - Date.now();
                                    const durationLeft = dayjs.duration(remainingMs);
                                    const durationMessage = formatDurationMessage(durationLeft);
                                    await sReply(`「 *PREMIUM EXPIRE* 」\n\n➸ *ID*: @${targetId.split('@')[0]}\n➸ ${durationMessage}`);
                                    commandFound = true;
                                } catch (error) {
                                    await sReply(`Error: ${error.message}`);
                                }
                            }
                            ctype = "manage"
                            if (!commandFound && await getComs(txt, 'settings')) {
                                try {
                                    const messageParts = [];
                                    const globalFlags = [
                                        { label: "Maintenance", value: dbSettings.maintenance }
                                    ];
                                    let globalSettingsText = "*- Bot Config -*\n";
                                    for (const { label, value } of globalFlags) {
                                        const icon = value ? "⚙" : "⚔";
                                        const valueText = (typeof value === 'string' || typeof value === 'number') ? ` : ${value}` : '';
                                        globalSettingsText += `\n${icon} ${label}${valueText}`;
                                    }
                                    if (m.isGroup) {
                                        let groupSettingsText = "*- Group Config -*\n";
                                        const group = await Group.findOne({ groupId: toId });
                                        if (group) {
                                            const groupFeatures = [
                                                { label: "Anti Tag Story", value: group.antiTagStory },
                                                { label: "Anti Link", value: group.antilink },
                                                { label: "Anti Hidetag", value: group.antiHidetag }
                                            ];
                                            for (const feature of groupFeatures) {
                                                const icon = feature.value ? "⚙" : "⚔";
                                                groupSettingsText += `\n${icon} ${feature.label}`;
                                            }
                                        }
                                        messageParts.push(groupSettingsText);
                                    }
                                    globalSettingsText += "\n\n" + dbSettings.autocommand;
                                    messageParts.push(globalSettingsText);
                                    const finalReply = messageParts.join('\n\n');
                                    await sReply(finalReply);
                                    commandFound = true;
                                } catch (error) {
                                    await sReply(error.message);
                                }
                            } else if (!commandFound && await getPrefix(txt, 'antitagsw')) {
                                try {
                                    if (!m.isGroup) throw new Error(`Perintah ini hanya bisa digunakan di grup.`);
                                    let command = ar[0];
                                    if (!['on', 'off'].includes(command)) throw new Error(`Format salah. Gunakan:\n${dbSettings.rname}antitagsw on\n${dbSettings.rname}antitagsw off`);
                                    let group = await Group.findOne({ groupId: toId });
                                    if (!group) {
                                        group = new Group({ groupId: toId });
                                    }
                                    group.antiTagStory = command === 'on';
                                    await group.save();
                                    await reactDone();
                                    commandFound = true;
                                } catch (error) {
                                    await sReply(error.message);
                                }
                            } else if (!commandFound && await getPrefix(txt, 'antilink')) {
                                try {
                                    if (!m.isGroup) throw new Error(`Perintah ini hanya bisa digunakan di grup.`);
                                    let command = ar[0];
                                    if (!['on', 'off'].includes(command)) throw new Error(`Format salah. Gunakan:\n${dbSettings.rname}antilink on\n${dbSettings.rname}antilink off`);
                                    let group = await Group.findOne({ groupId: toId });
                                    if (!group) {
                                        group = new Group({ groupId: toId });
                                    }
                                    group.antilink = command === 'on';
                                    await group.save();
                                    await reactDone();
                                    commandFound = true;
                                } catch (error) {
                                    await sReply(error.message);
                                }
                            } else if (!commandFound && await getPrefix(txt, 'antihidetag')) {
                                try {
                                    if (!m.isGroup) throw new Error(`Perintah ini hanya bisa digunakan di grup.`);
                                    let command = ar[0];
                                    if (!['on', 'off'].includes(command)) throw new Error(`Format salah. Gunakan:\n${dbSettings.rname}antihidetag on\n${dbSettings.rname}antihidetag off`);
                                    let group = await Group.findOne({ groupId: toId });
                                    if (!group) {
                                        group = new Group({ groupId: toId });
                                    }
                                    group.antiHidetag = command === 'on';
                                    await group.save();
                                    await reactDone();
                                    commandFound = true;
                                } catch (error) {
                                    await sReply(error.message);
                                }
                            } else if (!commandFound && await getComs(txt, 'groupclose')) {
                                try {
                                    if (!isBotGroupAdmins) throw new Error(`Perintah ini hanya bisa digunakan jika bot menjadi admin grup.`);
                                    await fn.groupSettingUpdate(toId, 'announcement');
                                    await reactDone();
                                    commandFound = true;
                                } catch (error) {
                                    await sReply(error.message);
                                }
                            } else if (!commandFound && await getComs(txt, 'groupopen')) {
                                try {
                                    if (!isBotGroupAdmins) throw new Error(`Perintah ini hanya bisa digunakan jika bot menjadi admin grup.`);
                                    await fn.groupSettingUpdate(toId, 'not_announcement');
                                    await reactDone();
                                    commandFound = true;
                                } catch (error) {
                                    await sReply(error.message);
                                }
                            } else if (!commandFound && await getPrefix(txt, 'invite')) {
                                try {
                                    if (!isBotGroupAdmins) throw new Error("Saya harus menjadi admin di grup ini untuk bisa mengundang orang lain.");
                                    let numbersOnly;
                                    if (quotedMsg) {
                                        numbersOnly = quotedParticipant;
                                    } else if (arg) {
                                        const sanitizedNumber = arg.replace(/\D/g, '');
                                        if (!sanitizedNumber) throw new Error("Nomor yang Kamu masukkan tidak valid.");
                                        numbersOnly = sanitizedNumber + '@s.whatsapp.net';
                                    } else {
                                        throw new Error(`Cara penggunaan: Balas (reply) pesan target atau ketik nomornya.\nContoh: ${dbSettings.rname}invite 6281234567890`);
                                    }
                                    const results = await fn.groupParticipantsUpdate(toId, [numbersOnly], 'add');
                                    if (!results || results.length === 0) throw new Error("Gagal mendapatkan status penambahan dari WhatsApp");
                                    const result = results[0];
                                    const targetUserMention = `@${numbersOnly.split('@')[0]}`;
                                    switch (result.status.toString()) {
                                        case '200':
                                            await sReply(`Berhasil menambahkan ${targetUserMention} ke dalam grup!`);
                                            break;
                                        case '409':
                                            await sReply(`Info: ${targetUserMention} sudah menjadi anggota grup ini.`);
                                            break;
                                        case '403': {
                                            await sReply(`Info: ${targetUserMention} tidak dapat ditambahkan karena pengaturan privasi.\n\nUndangan akan dikirimkan secara pribadi.`);
                                            const inviteData = result.content.content[0].attrs;
                                            await fn.sendGroupInvite(toId, numbersOnly, inviteData.code, inviteData.expiration, m.metadata.subject, `Admin: @${serial.split('@')[0]} mengundang Kamu untuk bergabung.`, null, { mentions: [serial] });
                                            break;
                                        }
                                        case '408': {
                                            await sReply(`Info: ${targetUserMention} baru saja keluar dari grup.\n\nKarena privasi, undangan akan dikirimkan secara pribadi.`);
                                            const inviteCode = await fn.groupInviteCode(toId);
                                            await fn.sendPesan(numbersOnly, `Kamu diundang kembali ke grup, silahkan klik link berikut untuk bergabung: https://chat.whatsapp.com/${inviteCode}`, m);
                                            break;
                                        }
                                        case '401':
                                            throw new Error(`Gagal: ${targetUserMention} telah memblokir bot ini.`);
                                        case '500':
                                            throw new Error("Gagal: Grup sudah penuh.");
                                        default:
                                            throw new Error(`Gagal menambahkan user dengan status kode tidak dikenal: ${result.status}`);
                                    }
                                    commandFound = true;
                                } catch (error) {
                                    await sReply(`Error:\n\n${error.message}`);
                                }
                            } else if (!commandFound && await getPrefix(txt, 'kick')) {
                                try {
                                    if (!m.isGroup || !isBotGroupAdmins) throw new Error(`Perintah ini hanya bisa digunakan di grup dan bot harus menjadi admin grup.`);
                                    if (quotedMsg) {
                                        await fn.removeParticipant(toId, quotedParticipant);
                                        await reactDone();
                                    } else {
                                        if (mentionedJidList.length === 0) throw new Error(`Gunakan perintah ini dengan membalas pesan atau tag @user yang ingin di-kick.`);
                                        let failedUsers = [];
                                        const metadata = await fn.groupMetadata(toId);
                                        const groupAdmins = metadata?.participants?.reduce((a, b) => {
                                            if (b.admin) a.push({ id: b.id, admin: b.admin });
                                            return a;
                                        }, []) || [];
                                        for (const jid of mentionedJidList) {
                                            if (groupAdmins.some(admin => admin.id === jid) || isSadmin) {
                                                failedUsers.push(jid);
                                                continue;
                                            }
                                            await fn.removeParticipant(toId, jid);
                                        }
                                        if (failedUsers.length > 0) {
                                            await sReply(`❎ Gagal kick beberapa user karena mereka privilege: ${failedUsers.join(', ')}`);
                                        }
                                        await reactDone();
                                    }
                                    commandFound = true;
                                } catch (error) {
                                    await sReply(error.message);
                                }
                            } else if (!commandFound && await getPrefix(txt, 'promote')) {
                                try {
                                    if (!m.isGroup || !isBotGroupAdmins) throw new Error(`Perintah ini hanya bisa digunakan di grup dan bot harus menjadi admin grup.`);
                                    let targetId = null;
                                    if (quotedMsg) {
                                        targetId = quotedParticipant;
                                    } else if (mentionedJidList.length === 1) {
                                        targetId = mentionedJidList[0];
                                    } else if (mentionedJidList.length > 1) {
                                        throw new Error(`Gunakan perintah ini dengan membalas pesan atau tag @user yang ingin dijadikan admin.`);
                                    } else {
                                        throw new Error(`Gunakan perintah ini dengan membalas pesan atau tag @user yang ingin dijadikan admin.`);
                                    };
                                    const metadata = await fn.groupMetadata(toId);
                                    const groupAdmins = metadata?.participants?.reduce((a, b) => {
                                        if (b.admin) a.push({ id: b.id, admin: b.admin });
                                        return a;
                                    }, []) || [];
                                    if (groupAdmins.some(admin => admin.id === targetId)) throw new Error(`@${targetId.split('@')[0]} sudah menjadi admin.`);
                                    await fn.promoteParticipant(toId, targetId);
                                    await sReply(`✅ Sukses menambahkan @${targetId.split('@')[0]} sebagai admin.`);
                                    commandFound = true;
                                } catch (error) {
                                    await sReply(error.message);
                                }
                            } else if (!commandFound && await getPrefix(txt, 'demote')) {
                                try {
                                    if (!m.isGroup || !isBotGroupAdmins) throw new Error(`Perintah ini hanya bisa digunakan di grup dan bot harus menjadi admin grup.`);
                                    let targetId = null;
                                    if (quotedMsg) {
                                        targetId = quotedParticipant;
                                    } else if (mentionedJidList.length === 1) {
                                        targetId = mentionedJidList[0];
                                    } else if (mentionedJidList.length > 1) {
                                        throw new Error(`Gunakan perintah ini dengan membalas pesan atau tag @user yang ingin dihapus dari admin.`);
                                    } else {
                                        throw new Error(`Gunakan perintah ini dengan membalas pesan atau tag @user yang ingin dihapus dari admin.`);
                                    };
                                    const metadata = await fn.groupMetadata(toId);
                                    const groupAdmins = metadata?.participants?.reduce((a, b) => {
                                        if (b.admin) a.push({ id: b.id, admin: b.admin });
                                        return a;
                                    }, []) || [];
                                    if (!groupAdmins.some(admin => admin.id === targetId)) throw new Error(`@${targetId.split('@')[0]} bukan admin grup.`);
                                    await fn.demoteParticipant(toId, targetId);
                                    await sReply(`✅ Sukses menghapus @${targetId.split('@')[0]} dari admin.`);
                                    commandFound = true;
                                } catch (error) {
                                    await sReply(error.message);
                                }
                            }
                            ctype = "util"
                            if (!commandFound && await getPrefix(txt, 'hidetag')) {
                                try {
                                    if (m.isGroup && arg) {
                                        const groupMetadata = await fn.groupMetadata(toId);
                                        const mentions = groupMetadata.participants.map(member => member.id);
                                        await fn.sendMessage(toId, { text: arg, mentions: mentions }, { ephemeralExpiration: m?.expiration ?? 0, messageId: randomByte(32) });
                                        commandFound = true;
                                    }
                                } catch {
                                    await reactFail();
                                }
                            } else if (!commandFound && await getComs(txt, 'totag')) {
                                try {
                                    if (m.isGroup && quotedMsg) {
                                        await fn.sendMessage(toId,
                                            {
                                                forward: proto.WebMessageInfo.create({
                                                    key: m.quoted.key,
                                                    message: m.quoted,
                                                    ...(m.isGroup ? { participant: m.quoted.sender } : {})
                                                }),
                                                mentions: m.metadata.participants.map(a => a.id)
                                            },
                                            {
                                                ephemeralExpiration: m?.expiration ?? 0,
                                                messageId: randomByte(32)
                                            }
                                        );
                                        commandFound = true;
                                    }
                                } catch {
                                    await reactFail();
                                }
                            } else if (!commandFound && await getComs(txt, 'ping')) {
                                const current = new Date().getTime();
                                const est = Math.floor(current - (t * 1000));
                                await sPesan(`Response time: ${est}ms`);
                                commandFound = true;
                            } else if (!commandFound && await getComs(txt, 'mentionall')) {
                                const groupMetadata = await fn.groupMetadata(toId);
                                const mentions = groupMetadata.participants.map(member => member.id);
                                let message = "📢 MENTIONALL MEMBER\n";
                                mentions.forEach((jid, idx) => {
                                    message += `\n${idx + 1}. @${jid.split('@')[0]}`;
                                });
                                await fn.sendPesan(toId, message, m);
                                commandFound = true;
                            } else if (!commandFound && await getComs(txt, 'commands')) {
                                const menuData = {
                                    isSadmin, master: isMaster, vip: isVIP, premium: isPremium,
                                    helpmaster, helpowner, helpvip, helppremium, helputil
                                };
                                await sReply(`${await commandMenu(menuData)}\n\n@${serial.split('@')[0]}`);
                                commandFound = true;
                            }
                        }
                    }
                    if (!commandFound) {
                        failedCommands.push(aa);
                    }
                    if (commandFound) {
                        const msgPreview = msgs(aa);
                        if (msgPreview === undefined) continue;
                        const parts = [color(msgPreview, "#32CD32"), color('from', "#a8dffb"), color(pushname, '#FFA500'), ...(m.isGroup ? [color('in', '#a8dffb'), color(m.metadata?.subject, "#00FFFF")] : [])];
                        const formatted = parts.join(' ');
                        log(formatted);
                    }
                    await delay(500);
                }
                return failedCommands;
            }
            if (counter <= 25) {
                counter++;
                if (botNumber === serial) return;
                const usr = serial;
                recentcmd.set(usr, Date.now());
                if ((recentcmd.has(usr) || sban.has(usr)) && !isSadmin) {
                    if (!fspamm.has(usr)) {
                        await sReply(`*Hei @${usr.split('@')[0]} you are on cooldown!*`);
                        fspamm.set(usr, Date.now());
                    } else if (!sban.has(usr)) {
                        await sReply(`*Hei @${usr.split('@')[0]}*\n*COMMAND SPAM DETECTED*\n*Command banned for 15 minutes*`);
                        sban.set(usr, Date.now());
                    }
                } else {
                    setTimeout(() => { counter--; }, 1500);
                    const failedCommands = await executeCommandChain(chainingCommands);
                    if (failedCommands.length > 0) {
                        return;
                    }
                }
            } else {
                await sReply("🏃💨 Bot sedang sibuk, coba lagi dalam beberapa saat...");
                setTimeout(() => { counter = 0; }, 6000);
            }
        } else {
            if (isSadmin || isMaster || (isWhiteList && hakIstimewa)) {
                if (m.isGroup) {
                    const isPrivileged = isBotGroupAdmins && [isSadmin, isMaster, isVIP, isPremium, isBotGroupAdmins].some(Boolean);
                    const groupSettings = await Group.findOne({ groupId: toId });
                    if (groupSettings?.antiHidetag) {
                        if (m.mentionedJid?.length === m.metadata.participants.length && !isPrivileged) {
                            await fn.sendMessage(toId, { delete: { remoteJid: toId, fromMe: false, id: id, participant: serial } });
                        }
                    }
                    if (groupSettings?.antiTagStory) {
                        if (m.type === 'groupStatusMentionMessage' || m.message?.groupStatusMentionMessage || m.message?.protocolMessage?.type === 25 || (Object.keys(m.message).length === 1 && Object.keys(m.message)[0] === 'messageContextInfo')) {
                            if (!isPrivileged && !fromBot) {
                                try {
                                    await fn.sendMessage(toId, { delete: { remoteJid: toId, fromMe: false, id: id, participant: serial } });
                                    await fn.removeParticipant(toId, [serial]);
                                } catch (error) {
                                    await log(`Error_kick_antitagSW:\n${error}`, true);
                                }
                            }
                        }
                    }
                    if (groupSettings?.antilink) {
                        if (body?.includes('chat.whatsapp.com') && !isPrivileged) {
                            await fn.sendMessage(toId, { delete: { remoteJid: toId, fromMe: false, id: id, participant: serial } });
                            await fn.removeParticipant(toId, [serial]);
                        }
                    }
                };
            };
        };
    } catch (error) {
        await log(`!!! ERROR DI DALAM ARFINE !!!\n${error}`, true);
    };
    if (body?.startsWith('>')) {
        if (!isSadmin) return;
        try {
            const evaled = /await/i.test(body?.slice(2)) ? await eval('(async () => { ' + body?.slice(2) + ' })()') : await eval(body?.slice(2));
            if (typeof evaled === 'string' && evaled.startsWith(localFilePrefix)) {
                const localPath = evaled.substring(localFilePrefix.length);
                await sendAndCleanupFile(fn, toId, localPath, m, dbSettings);
            } else {
                let outputText;
                if (typeof evaled === 'object' && evaled !== null) {
                    outputText = JSON.stringify(evaled, null, 2);
                } else {
                    outputText = util.format(evaled);
                }
                if (outputText === 'undefined') {
                    // await sReply('proses selesai.');
                } else {
                    await sReply(outputText);
                }
            }
        } catch (error) {
            const errorText = JSON.stringify(error, Object.getOwnPropertyNames(error), 2);
            await sReply(errorText);
        }
    } else if (body?.startsWith('$')) {
        if (!isSadmin) return;
        try {
            const { stdout, stderr } = await exec(body?.slice(2).trim());
            const combinedOutput = (stdout || stderr || "").trim();
            if (combinedOutput) {
                await sReply(util.format(combinedOutput));
            } else {
                await sReply("Perintah berhasil dieksekusi, namun tidak ada output yang dihasilkan.");
            }
        } catch (error) {
            await sReply(util.format(error));
        }
    }
};
setInterval(() => {
    const memUsage = process.memoryUsage();
    log(`Memory usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
}, 300000);
setInterval(() => {
    log(`Cache stats: recentcmd=${recentcmd.size}, fspamm=${fspamm.size}, sban=${sban.size}`);
}, 600000);