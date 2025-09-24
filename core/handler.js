// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info handler.js ─────────────────────

import util from 'util';
import path from 'path';
import { delay } from 'baileys';
import config from '../config.js';
import { spawn } from 'child_process';
import log from '../src/lib/logger.js';
import dayjs from '../src/utils/dayjs.js';
import { exec as cp_exec } from 'child_process';
import { pluginCache } from '../src/lib/plugins.js';
import { User, Group, Whitelist, Settings, Command, StoreGroupMetadata, OTPSession } from '../database/index.js';
import { color, msgs, mycmd, safeStringify, sendAndCleanupFile, waktu, shutdown, checkCommandAccess, isUserVerified, textMatch1, textMatch2, expiredVIPcheck, expiredCheck, getSerial, getTxt } from '../src/lib/function.js';

const exec = util.promisify(cp_exec);
const isPm2 = process.env.pm_id !== undefined || process.env.NODE_APP_INSTANCE !== undefined;
const isSelfRestarted = process.env.RESTARTED_BY_SELF === '1';
const MAX_RECONNECT_ATTEMPTS = config.performance.maxReconnectAttemps;
const RECONNECT_DELAY_MS = config.performance.reconnectDelay;
const localFilePrefix = config.localPrefix;

function logRestartInfo() {
  log('Starting Engine...')
  log(`Running Mode: ${isPm2 ? 'PM2' : 'Node'} | RestartedBySelf: ${isSelfRestarted}`);
};
logRestartInfo();

let groupAfkCooldowns   = new Map();
let recentcmd           = new Set();
let fspamm              = new Set();
let sban                = new Set();
let mygroup             = [];
let chainingCommands    = [];
let counter             = 0;
let suggested           = false;
let groupData           = null;

export const updateMyGroup = (newGroupList) => {
  mygroup = newGroupList;
};
export async function handleRestart(reason) {
  const currentRestarts = config.restartAttempts;
  const nextAttempt = currentRestarts + 1;
  if (currentRestarts >= MAX_RECONNECT_ATTEMPTS) {
    await log(`Gagal total setelah ${MAX_RECONNECT_ATTEMPTS} percobaan. Alasan: ${reason}`);
    process.exit(1);
  }
  await log(`Terjadi error: ${reason}`);
  await log(`Mencoba restart otomatis #${nextAttempt} dalam ${RECONNECT_DELAY_MS / 1000}s...`);
  await delay(RECONNECT_DELAY_MS);
  if (isPm2) {
    process.exit(1);
  } else {
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
export async function arfine(fn, m, { mongoStore, dbSettings, ownerNumber, version, isSuggestion = false }) {
  suggested = isSuggestion;
  await expiredCheck(fn, ownerNumber);
  await expiredVIPcheck(fn, ownerNumber);

  const serial = await getSerial(m);
  const botNumber = m.botnumber;
  const id = m.key.id;
  const pushname = m.pushName || 'Unknown';
  const fromBot = m.fromMe;
  let toId = m.from;
  let user = await User.ensureUser(serial);

  const quotedMsg = m.quoted ? m.quoted : false;
  const quotedParticipant = m.quoted?.sender || '';
  const mentionedJidList = Array.isArray(m.mentionedJid) ? m.mentionedJid : [];
  const isSadmin = ownerNumber.includes(serial) || (dbSettings.self === 'true' && fromBot);
  const isMaster = user.isMaster;
  const isVIP = user.isVIPActive;
  const isPremium = user.isPremiumActive;
  const maintenance = dbSettings.maintenance;
  const isWhiteList = await Whitelist.isWhitelisted(toId, 'group');
  const hakIstimewa = [isSadmin, isMaster, isVIP, isPremium].some(Boolean);
  const isBotGroupAdmins = m.isBotAdmin || false;
  const body = m?.body;
  const userData = {
    isSadmin: isSadmin,
    isMaster: isMaster,
    isVIP: isVIP,
    isPremium: isPremium,
    isGroupAdmins: m.isGroup ? m.isAdmin : false,
    isWhiteList: isWhiteList,
    hakIstimewa: hakIstimewa,
    isMuted: false
  };

  const reactDone = async () => { await delay(1000); await fn.sendMessage(toId, { react: { text: '✅', key: m.key } }) };
  const reactFail = async () => { await delay(1000); await fn.sendMessage(toId, { react: { text: '❎', key: m.key } }) };
  const sReply = (content, options = {}) => fn.sendReply(toId, content, { quoted: m, ...options });
  const sPesan = (content) => fn.sendPesan(toId, content, m);
  let txt = body;
  const isCmd = txt?.startsWith(dbSettings.rname) || txt?.startsWith(dbSettings.sname);

  if (body?.startsWith('>')) {
    if (!isSadmin && !isMaster) return;
    try {
      const code = body.slice(2);
      const evaled = /await/i.test(code) ? await eval(`(async () => { ${code} })()`) : await eval(code);
      if (typeof evaled === 'string' && evaled.startsWith(localFilePrefix)) {
        const relativePath = evaled.substring(localFilePrefix.length);
        const absolutePath = path.join(process.cwd(), relativePath);
        await sendAndCleanupFile(fn, toId, absolutePath, m, dbSettings);
        return;
      }
      let outputText;
      if (typeof evaled === 'object' && evaled !== null) {
        try {
          outputText = safeStringify(evaled, 2);
        } catch {
          outputText = util.inspect(evaled, { depth: 2 });
        }
      } else {
        outputText = util.format(evaled);
      }

      if (outputText === 'undefined') {
        // do nothing
      } else {
        await sReply(outputText);
      }
    } catch (error) {
      const prettyError = (() => {
        try {
          const errObj = {
            name: error?.name,
            message: error?.message,
            stack: error?.stack,
          };
          for (const k of Object.getOwnPropertyNames(error || {})) {
            if (!['name', 'message', 'stack'].includes(k)) {
              try { errObj[k] = error[k]; } catch { errObj[k] = `[unserializable:${k}]`; }
            }
          }
          return safeStringify(errObj, 2);
        } catch {
          return util.inspect(error, { depth: 2 });
        }
      })();
      await sReply(prettyError);
    }
  } else if (body?.startsWith('$')) {
    if (!isSadmin && !isMaster) return;
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
  } else if (body?.toLowerCase().trim() == "res") {
    if (!isSadmin && !isMaster) return;
    dbSettings.restartState = true;
    dbSettings.restartId = m.from;
    dbSettings.dataM = m;
    await Promise.all([Settings.updateSettings(dbSettings), reactDone(), handleRestart("Restarting...")]);
  } else if (body?.toLowerCase().trim() == "shutdown") {
    if (!isSadmin && !isMaster) return;
    await Promise.all([reactDone(), shutdown(isPm2)]);
  } else if (body?.toLowerCase().trim().startsWith("mode")) {
    if (!isSadmin && !isMaster) return;
    const args = body.toLowerCase().trim().split(/\s+/);
    const modeInput = args[1];
    const modeMap = {
      'publik': 'false',
      'selfbot': 'true',
      'auto': 'auto'
    };
    const getDisplayMode = (internalMode) => {
      const displayMap = {
        'false': 'publik',
        'true': 'selfbot',
        'auto': 'auto'
      };
      return displayMap[internalMode] || internalMode;
    };
    if (modeInput) {
      const internalMode = modeMap[modeInput];
      await Settings.setSelfMode(internalMode);
      dbSettings.self = internalMode;
      await sReply(`Mode berhasil diubah ke: *${modeInput}*`);
    } else {
      const currentMode = dbSettings.self;
      const displayMode = getDisplayMode(currentMode);
      return sReply(`Mode saat ini: *${displayMode}*\nGunakan: mode <mode>\n • publik\n • selfbot\n • auto`);
    }
  }

  const selfMode = dbSettings.self;
  if (selfMode === 'true') {
    if (!(fromBot || isSadmin || isMaster)) {
      return;
    }
  }
  if (selfMode === 'false' && fromBot) return;

  if (m.isGroup) {
    groupData = await Group.ensureGroup(toId);
    await groupData.incrementMessageCount();
    await groupData.incrementCommandCount();
    if (!groupData.isActive) return;
    const userAfkGroups = await Group.findUserAfkStatus(serial);
    if (userAfkGroups.length > 0) {
      const currentTime = new Date();
      for (const afkGroup of userAfkGroups) {
        const handleResult = await Group.findOneAndUpdate(
          { groupId: afkGroup.groupId },
          {},
          { new: true }
        );
        if (handleResult) {
          const returnResult = await handleResult.handleUserReturn(serial, currentTime);
          if (returnResult.success) {
            let durationMessage = '';
            if (returnResult.duration) {
              const seconds = Math.floor(returnResult.duration / 1000);
              const timeAgo = waktu(seconds);
              durationMessage = `setelah *${returnResult.afkData.reason}* selama *${timeAgo}*`;
            }
            await sPesan(`*${pushname}* telah kembali ${durationMessage}!`);
          }
        }
      }
    }
  }
  if (!m.isGroup) {
    const otpSession = await OTPSession.getSession(serial);
    if (otpSession) {
      const verificationResult = await OTPSession.verifyOTP(serial, body);
      switch (verificationResult.reason) {
        case 'OTP_VERIFIED': {
          await sPesan('Verifikasi berhasil!\n\nPermintaan Anda telah diteruskan ke Admin untuk persetujuan akhir. Mohon tunggu.');
          const adminNotification =
            `*Permintaan Bergabung Baru*\n\n` +
            `Pengguna: @${serial.split('@')[0]}\n` +
            `Status: Berhasil verifikasi OTP\n\n` +
            `Untuk menyetujui, kirim perintah:\n` +
            `\`${dbSettings.rname}requestjoin\``;
          await fn.sendPesan(verificationResult.groupId, adminNotification, m);
          break;
        }
        case 'WRONG_OTP': {
          const remaining = 4 - verificationResult.attempts;
          await sPesan(`Kode OTP salah!\n\nPercobaan: ${verificationResult.attempts}/4\nSisa kesempatan: ${remaining}`);
          break;
        }
        case 'MAX_ATTEMPTS_EXCEEDED':
          await sPesan(`*Akses Ditolak*\n\nAnda telah gagal verifikasi OTP sebanyak 4 kali.\nAkun Anda diBanned dari group untuk mencegah hal hal yang tidak diinginkan!`);
          await Group.banMember(serial);
          await log(`User ${serial} diBanned dari group karena gagal verifikasi OTP lebih dari 4x`, true);
          break;
        case 'SESSION_NOT_FOUND':
          break;
      }
      return;
    }
  }
  try {
    if (m.isGroup && !isCmd && groupData) {
      const isPrivileged = isBotGroupAdmins && [isSadmin, isMaster, isVIP, isPremium].some(Boolean);
      const currentTime = Date.now();
      const lastResponseTimeInGroup = groupAfkCooldowns.get(toId);
      if (groupData.antiHidetag) {
        if (m.mentionedJid?.length === m.metadata.participants.length && !isPrivileged) {
          await fn.sendMessage(toId, { delete: { remoteJid: toId, fromMe: false, id: id, participant: serial } });
        }
      }
      if (groupData.antiTagStory) {
        if (m.type === 'groupStatusMentionMessage' || m.message?.groupStatusMentionMessage || m.message?.protocolMessage?.type === 25 || (Object.keys(m.message).length === 1 && Object.keys(m.message)[0] === 'messageContextInfo')) {
          if (!isPrivileged && !fromBot) {
            try {
              await fn.sendMessage(toId, { delete: { remoteJid: toId, fromMe: false, id: id, participant: serial } });
              await fn.removeParticipant(toId, serial);
            } catch (error) { await log(error, true); }
          }
        }
      }
      if (groupData.antilink) {
        if (body?.includes('chat.whatsapp.com') && !isPrivileged) {
          await fn.sendMessage(toId, { delete: { remoteJid: toId, fromMe: false, id: id, participant: serial } });
          await fn.removeParticipant(toId, serial);
        }
      }
      if (!lastResponseTimeInGroup || (currentTime - lastResponseTimeInGroup >= config.performance.groupCooldownMS)) {
        const afkUsersToSend = [];
        const uniqueMentionedJidList = [...new Set(mentionedJidList)];
        for (const ment of uniqueMentionedJidList) {
          if (groupData.checkAfkUser(ment)) {
            const afkData = groupData.getAfkData(ment);
            if (afkData) {
              const userTag = await fn.getName(ment) || ment.split('@')[0];
              const waktuAfk = dayjs(afkData.time).tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm:ss');
              afkUsersToSend.push({
                userTag,
                waktu: waktuAfk,
                reason: afkData.reason || 'Tidak ada alasan',
                jid: ment
              });
            }
          }
        }
        if (afkUsersToSend.length > 0) {
          groupAfkCooldowns.set(toId, Date.now());
          let groupMessage = '┌ ❏ *PENGGUNA SEDANG AFK*\n│\n';
          afkUsersToSend.forEach(user => {
            groupMessage += `│ • Pengguna: ${user.userTag}\n`;
            groupMessage += `│   └ Sejak: ${user.waktu}\n`;
            groupMessage += `│   └ Alasan: ${user.reason}\n│\n`;
          });
          groupMessage += '└─ Mohon untuk tidak mengganggu.';
          await sReply(groupMessage);
          for (const user of afkUsersToSend) {
            try {
              const groupName = fn.getName(toId) || 'sebuah grup';
              const currentTime = dayjs().tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm:ss');
              const notificationMsg = `*Notifikasi AFK*\n\n` +
                `Seseorang men-tag kamu di grup *${groupName}*:\n` +
                `• Pengirim: @${serial.split('@')[0]}\n` +
                `• Waktu: ${currentTime}\n` +
                `• Pesan: "${m.body}"\n\n` +
                `_Kamu sedang AFK dengan alasan: ${user.reason}_\n` +
                `AFK sejak: ${user.waktu}`;
              await fn.sendMessage(
                user.jid,
                {
                  text: notificationMsg,
                  contextInfo: {
                    mentionedJid: [serial, user.jid]
                  }
                }
              );
            } catch (error) {
              await log(`Gagal mengirim notifikasi ke ${user.jid}: ${error}`);
            }
          }
        }
      }
    }
    if (isCmd) {
      if (dbSettings.verify === true) {
        const isVerified = await isUserVerified(m, dbSettings, StoreGroupMetadata, fn, sReply, hakIstimewa);
        if (!isVerified) return;
      }
      let commandText = await getTxt(txt, dbSettings);
      const remoteCommandMatch = commandText.match(/^r:(\d+)\s+(.*)/s);
      if (remoteCommandMatch && (isSadmin || isMaster)) {
        const index = parseInt(remoteCommandMatch[1]) - 1;
        const remainingText = remoteCommandMatch[2];
        if (mygroup[index]) {
          toId = mygroup[index];
          chainingCommands = await mycmd(remainingText);
        } else {
          return sReply(`Grup dengan nomor urut ${index + 1} tidak ditemukan.`);
        }
      } else {
        chainingCommands = await mycmd(commandText);
      }
      async function executeCommandChain(commandList) {
        const failedCommands = [];
        for (const currentCommand of commandList) {
          let commandFound = false;
          const commandName = currentCommand.split(' ')[0].toLowerCase();
          const command = pluginCache.commands.get(commandName);
          if (command) {
            try {
              const hasAccess = await checkCommandAccess(command, userData, user, maintenance);
              if (hasAccess) {
                const args = currentCommand.split(' ').slice(1);
                const fullArgs = args.join(' ');
                const commandArgs = {
                  fn, m, dbSettings, ownerNumber, version,
                  isSadmin, isMaster, isVIP, isPremium,
                  isWhiteList, hakIstimewa, isBotGroupAdmins,
                  sPesan, sReply, reactDone, reactFail, toId,
                  quotedMsg, quotedParticipant, mentionedJidList,
                  body, args, arg: fullArgs, ar: args, serial, user,
                };
                await command.execute(commandArgs);
                commandFound = true;
                const userUpdates = {
                  $inc: {
                    userCount: 1,
                    [`commandStats.${commandName}`]: 1
                  }
                };
                if (!isSadmin && !isMaster && !isVIP) {
                  userUpdates.$inc['limit.current'] = -1;
                  userUpdates.$inc['limitgame.current'] = -1;
                }
                await User.updateOne({ userId: user.userId }, userUpdates);
                await Command.updateCount(command.name, 1);
                await Settings.incrementTotalHitCount();
              }
            } catch (error) {
              await sReply(`Terjadi kesalahan saat menjalankan perintah "${command.name}": ${error.message}`);
              log(error, true);
              failedCommands.push(currentCommand);
            }
          } else {
            failedCommands.push(currentCommand);
          }
          if (commandFound) {
            const msgPreview = msgs(currentCommand);
            if (msgPreview === undefined) continue;
            const parts = [color(msgPreview, "#32CD32"), color('from', "#a8dffb"), color(pushname, '#FFA500'), ...(m.isGroup ? [color('in', '#a8dffb'), color(m.metadata?.subject, "#00FFFF")] : [])];
            const formatted = parts.join(' ');
            log(formatted);
          }
        }
        return failedCommands;
      }
      if (counter <= config.performance.commandCooldown) {
        counter++;
        if (botNumber === serial) return;
        const usr = serial;
        if ((recentcmd.has(usr) || sban.has(usr)) && !isSadmin) {
          if (!(fspamm.has(usr) || sban.has(usr))) {
            await sReply(`*Hei @${usr.split('@')[0]} you are on cooldown!*`);
            fspamm.add(usr);
          } else if (!sban.has(usr)) {
            const durationText = waktu(config.performance.banDuration / 1000);
            await sReply(`*Hei @${usr.split('@')[0]}*\n*COMMAND SPAM DETECTED*\n*Command banned for ${durationText}*`);
            sban.add(usr);
          }
        } else {
          setTimeout(() => { counter--; }, 1000);
          recentcmd.add(usr);
          setTimeout(() => { recentcmd.delete(usr); }, 1000);
          setTimeout(() => { fspamm.delete(usr); }, config.performance.spamDuration);
          setTimeout(() => { sban.delete(usr); }, config.performance.banDuration);
          const failedCommands = await executeCommandChain(chainingCommands);
          if (failedCommands.length > 0 && dbSettings.autocorrect === 2 && !suggested) {
            const correctedCommands = [];
            let hasCorrections = false;
            for (const failedCommand of failedCommands) {
              const corrected = await textMatch2(failedCommand);
              if (corrected && Array.isArray(corrected)) {
                correctedCommands.push(...corrected);
                hasCorrections = true;
              } else {
                correctedCommands.push(failedCommand);
              }
            }
            if (hasCorrections) {
              await executeCommandChain(correctedCommands);
            }
          } else if (failedCommands.length > 0 && dbSettings.autocorrect === 1 && !m._textmatch_done) {
            await textMatch1(fn, m, failedCommands, toId);
            m._textmatch_done = true;
          }
        }
      } else {
        await sReply("🏃💨 Bot sedang sibuk, coba lagi dalam beberapa saat...");
        setTimeout(() => { counter = 0; }, config.performance.cooldownReset);
      }
    } else {
      if (dbSettings.antideleted === true) {
        if (m.type === 'protocolMessage' && m.protocolMessage.type === 0) {
          const deletedMsgId = m.protocolMessage.key.id;
          const remoteJid = toId;
          const originalMessage = await mongoStore.loadMessage(remoteJid, deletedMsgId);
          if (originalMessage && !originalMessage.fromMe) {
            if (originalMessage.type === 'imageMessage') {
              try {
                const buffer = await fn.getMediaBuffer(originalMessage.message);
                await fn.sendMessage(toId, { image: buffer, caption: originalMessage.body });
              } catch (error) { await log(error, true); }
            } else if (originalMessage.type === 'videoMessage') {
              try {
                const buffer = await fn.getMediaBuffer(originalMessage.message);
                await fn.sendMessage(toId, { video: buffer, caption: originalMessage.body });
              } catch (error) { await log(error, true); }
            } else if (originalMessage.type === 'stickerMessage') {
              try {
                const buffer = await fn.getMediaBuffer(originalMessage.message);
                await fn.sendMessage(toId, { sticker: buffer });
              } catch (error) { await log(error, true); }
            } else if (originalMessage.type === 'audioMessage') {
              try {
                const buffer = await fn.getMediaBuffer(originalMessage.message);
                await fn.sendMessage(toId, { audio: buffer, mimetype: 'audio/mp4', ptt: originalMessage.message.ptt });
              } catch (error) { await log(error, true); }
            } else if (originalMessage.type === 'documentMessage') {
              try {
                const buffer = await fn.getMediaBuffer(originalMessage.message);
                await fn.sendMessage(toId, { document: buffer, mimetype: originalMessage.mime, fileName: originalMessage.message.fileName });
              } catch (error) { await log(error, true); }
            } else if (originalMessage.type === 'locationMessage') {
              await fn.sendMessage(toId, {
                location: {
                  degreesLatitude: originalMessage.message.degreesLatitude,
                  degreesLongitude: originalMessage.message.degreesLongitude,
                  name: originalMessage.message.name,
                  address: originalMessage.message.address
                }
              });
            } else if (originalMessage.type === 'contactMessage') {
              await fn.sendMessage(toId, { contacts: { displayName: originalMessage.message.contactMessage.displayName, contacts: [{ vcard: originalMessage.message.contactMessage.vcard }] } });
            } else if (originalMessage.type === 'extendedTextMessage' || originalMessage.type === 'conversation') {
              if (originalMessage.body) {
                await fn.forwardMessage(toId, originalMessage);
              }
            }
          }
        }
      };
    }
  } catch (error) { await log(error, true); }
};