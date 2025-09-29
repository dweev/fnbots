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
import { LRUCache } from 'lru-cache';
import { spawn } from 'child_process';
import log from '../src/lib/logger.js';
import dayjs from '../src/utils/dayjs.js';
import { exec as cp_exec } from 'child_process';
import { runJob } from '../src/worker/worker_manager.js';
import { cleanupPlugins, pluginCache } from '../src/lib/plugins.js';
import { performanceManager } from '../src/lib/performanceManager.js';
import { User, Group, Settings, Command, StoreGroupMetadata, OTPSession, Media, DatabaseBot } from '../database/index.js';
import { handleAntiDeleted, handleAutoJoin, handleAudioChanger, handleAutoSticker, handleChatbot } from '../src/handler/index.js';
import { color, msgs, mycmd, safeStringify, sendAndCleanupFile, waktu, shutdown, checkCommandAccess, isUserVerified, textMatch1, textMatch2, expiredVIPcheck, expiredCheck, getSerial, getTxt, initializeFuse } from '../src/function/function.js';

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

const groupAfkCooldowns = new LRUCache({
  max: 1000,
  ttl: config.performance.groupCooldownMS,
  updateAgeOnGet: false
});

let recentcmd           = new Set();
let fspamm              = new Set();
let sban                = new Set();
let stp                 = new Set();
let stickerspam         = new Set();
let mygroup             = [];
let mygroupMembers      = {};
let chainingCommands    = [];
let counter             = 0;
let suggested           = false;
let groupData           = null;

export const updateMyGroup = (newGroupList, newMemberlist) => {
  mygroup = newGroupList;
  mygroupMembers = newMemberlist;
};
export async function handleRestart(reason) {
  const currentRestarts = config.restartAttempts;
  const nextAttempt = currentRestarts + 1;
  if (currentRestarts >= MAX_RECONNECT_ATTEMPTS) {
    await log(`Gagal total setelah ${MAX_RECONNECT_ATTEMPTS} percobaan. Alasan: ${reason}`);
    await performanceManager.cache.forceSync();
    process.exit(1);
  }
  await log(`Terjadi error: ${reason}`);
  await log(`Mencoba restart otomatis #${nextAttempt} dalam ${RECONNECT_DELAY_MS / 1000}s...`);
  await performanceManager.cache.forceSync();
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
  if (user.isUserMuted(serial)) return;

  const quotedMsg = m.quoted ? m.quoted : false;
  const quotedParticipant = m.quoted?.sender || '';
  const mentionedJidList = Array.isArray(m.mentionedJid) ? m.mentionedJid : [];
  const isBotGroupAdmins = m.isBotAdmin || false;
  const isGroupAdmins = m.isAdmin || false;
  const isSadmin = ownerNumber.includes(serial) || (dbSettings.self === 'true' && fromBot) || (dbSettings.self === 'auto' && fromBot)
  const isMaster = user.isMaster;
  const isVIP = user.isVIPActive;
  const isPremium = user.isPremiumActive;
  const maintenance = dbSettings.maintenance;
  const isWhiteList = await performanceManager.cache.warmWhitelistCache(toId);
  const hakIstimewa = [isSadmin, isMaster, isVIP, isPremium].some(Boolean);
  const isPrivileged = isBotGroupAdmins && [isSadmin, isMaster, isVIP, isPremium, isGroupAdmins, fromBot].some(Boolean);
  const body = m?.body;
  const type = m?.type;
  const userData = {
    isSadmin: isSadmin,
    isMaster: isMaster,
    isVIP: isVIP,
    isPremium: isPremium,
    isGroupAdmins: m.isGroup ? m.isAdmin : false,
    isWhiteList: isWhiteList,
    hakIstimewa: hakIstimewa,
    isMuted: groupData ? groupData.isMuted : false
  };

  const reactDone = async () => { await delay(1000); await fn.sendMessage(toId, { react: { text: '✅', key: m.key } }) };
  const reactFail = async () => { await delay(1000); await fn.sendMessage(toId, { react: { text: '❎', key: m.key } }) };
  const sReply = (content, options = {}) => fn.sendReply(toId, content, { quoted: m, ...options });
  const sPesan = (content) => fn.sendPesan(toId, content, m);
  const sendRawWebpAsSticker = async (_data, options = {}) => { await fn.sendRawWebpAsSticker(toId, _data, m, { ...options }) };
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
  } else if (body?.toLowerCase().trim() == "resetcommands") {
    if (!isSadmin && !isMaster) return;
    const result = await Command.resetAll();
    await sReply(`Berhasil! Sebanyak ${result.deletedCount} data perintah telah dihapus dari database. Silakan restart bot untuk menyegarkan cache menu.`);
  } else if (body?.toLowerCase().trim() == "reloadplugins") {
    if (!isSadmin && !isMaster) return;
    try {
      const { loadPlugins, getPluginStats } = await import('../src/lib/plugins.js');
      const pluginPath = path.join(process.cwd(), 'src', 'plugins');
      cleanupPlugins();
      await loadPlugins(pluginPath);
      await initializeFuse();
      const stats = getPluginStats();
      let statsText = `Plugin Cache Reloaded Successfully!\n\n`;
      statsText += `Statistics:\n`;
      statsText += `• Total commands: ${stats.totalCommands}\n`;
      statsText += `• Categories: ${stats.categories}\n\n`;
      statsText += `Commands by Category:\n`;
      for (const [category, count] of Object.entries(stats.commandsByCategory)) {
        statsText += `• ${category}: ${count} commands\n`;
      }
      await sReply(statsText);
      await reactDone();
    } catch (error) {
      await sReply(`Failed to reload plugins: ${error.message}`);
      await reactFail();
      log(`Plugin reload error: ${error}`, true);
    }
  } else if (body?.toLowerCase().trim() == "cachestats") {
    if (!isSadmin && !isMaster) return;
    try {
      const stats = performanceManager.getFullStatus();
      let statsText = `*Performance Statistics*\n\n`;

      statsText += `*Cache Statistics:*\n`;
      statsText += `• User Stats: ${stats.cache.userStats.size} pending\n`;
      statsText += `• Group Stats: ${stats.cache.groupStats.size} pending\n`;
      statsText += `• Command Stats: ${stats.cache.commandStats.size} pending\n`;
      statsText += `• Global Hits: ${stats.cache.globalStats.pendingHits} pending\n`;
      statsText += `• Whitelist Cache: ${stats.cache.whitelist.size} entries\n`;
      statsText += `• Group Data Cache: ${stats.cache.groupData.size} entries\n\n`;

      statsText += `*Performance:*\n`;
      statsText += `• Last Sync: ${stats.cache.performance.lastSync}\n`;
      statsText += `• Sync In Progress: ${stats.cache.performance.syncInProgress ? 'Yes' : 'No'}\n`;
      statsText += `• Uptime: ${Math.floor(stats.performance.uptime / 3600)}h ${Math.floor((stats.performance.uptime % 3600) / 60)}m\n\n`;

      statsText += `*Job Scheduler:*\n`;
      statsText += `• Active Intervals: ${stats.scheduler.intervals.join(', ')}\n`;
      statsText += `• Cron Jobs: ${stats.scheduler.cronJobs.join(', ')}\n`;

      await sReply(statsText);
    } catch (error) {
      await sReply(`Error getting cache stats: ${error.message}`);
    }
  } else if (body?.toLowerCase().trim() == "synccache") {
    if (!isSadmin && !isMaster) return;
    try {
      await performanceManager.cache.forceSync();
      await sReply("Cache sync completed successfully!");
      await reactDone();
    } catch (error) {
      await sReply(`Cache sync failed: ${error.message}`);
      await reactFail();
    }
  } else if (body?.toLowerCase().trim() == "clearcache") {
    if (!isSadmin && !isMaster) return;
    try {
      await performanceManager.cache.clearAllCaches();
      await sReply("All caches cleared successfully!");
      await reactDone();
    } catch (error) {
      await sReply(`Cache clear failed: ${error.message}`);
      await reactFail();
    }
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
    performanceManager.cache.updateGroupStats(toId, {
      $inc: {
        messageCount: 1,
        commandCount: isCmd ? 1 : 0
      }
    });
    groupData = await performanceManager.cache.warmGroupDataCache(toId);
    if (!groupData || !groupData.isActive) return;
    if (groupData.isMemberBanned(serial)) return;
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
      if (groupData.filter) {
        if (isBotGroupAdmins && body && groupData.filterWords && groupData.filterWords.length > 0) {
          if (!isPrivileged) {
            const filteredWord = groupData.filterWords.find(word => {
              const regex = new RegExp(`\\b${word}\\b`, 'i');
              return regex.test(body);
            });
            if (filteredWord) {
              await fn.sendMessage(toId, { delete: { remoteJid: toId, fromMe: false, id: id, participant: serial } });
              const warningMessage = `Pesan mengandung kata terlarang: *${filteredWord}*`;
              const isAutoKickActive = groupData.isWarningEnabled();
              const kickThreshold = groupData.getWarningLimit();
              await groupData.addWarning(serial);
              const newCount = groupData.getWarnings(serial);
              await sReply(warningMessage);
              if (isAutoKickActive && newCount >= kickThreshold) {
                await sReply(`Peringatan Terakhir!\n\n@${serial.split('@')[0]} telah mencapai batas ${kickThreshold} peringatan dan akan dikeluarkan.`, [serial]);
                await fn.removeParticipant(toId, serial);
                await groupData.resetWarnings(serial);
              }
            }
          }
        }
        const mediaTypes = new Set(['stickerMessage', 'imageMessage', 'videoMessage', 'audioMessage']);
        if (mediaTypes.has(type)) {
          if (stickerspam.has(serial) && !stp.has(serial) && m.isGroup && isBotGroupAdmins) {
            stp.add(serial);
            const mention = '@' + serial.split('@')[0];
            if (isSadmin) {
              await fn.sendPesan(toId, `creatorku yang ganteng ${mention}\ngaboleh spam ya...`, m);
            } else if (isMaster) {
              await fn.sendPesan(toId, `wah ini nih! ${mention}\nHei Owner, jangan ngajarin membernya buat spam! 🤦‍♂️🤦‍♂️😤🧐`, m);
            } else if (isVIP) {
              await fn.sendPesan(toId, `hmmmmm gitu ya ${mention}\nvip bebas spam. 😒🙃😏`, m);
            } else if (isPremium) {
              await fn.sendPesan(toId, `wadooooh si ${mention}\nasik nih premium bisa spam. 😒🙃😏`, m);
            } else if (isGroupAdmins) {
              await fn.sendPesan(toId, `yaela ${mention}\njangan mentang-mentang jadi admin spam terus terusan ya!`, m);
            } else {
              await fn.sendPesan(toId, `member bangsat ya ${mention}\nspam anjeng! 😡😡😡😡`, m);
              setTimeout(async () => {
                fn.removeParticipant(toId, serial);
              }, 1000);
            }
          }
        }
        stickerspam.add(serial);
        setTimeout(() => {
          stickerspam.delete(serial);
          stp.delete(serial);
        }, 1000);
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
              const groupName = await fn.getName(toId) || 'sebuah grup';
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
                  groupData, botNumber, mygroupMembers, mygroup,
                  isPrivileged, pushname
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
                  if (command.isLimitGameCommand) {
                    userUpdates.$inc['limitgame.current'] = -1;
                  } else if (command.isLimitCommand) {
                    if (!isPremium) {
                      userUpdates.$inc['limit.current'] = -20;
                    } else {
                      userUpdates.$inc['limit.current'] = -1;
                    }
                  }
                }
                performanceManager.cache.updateUserStats(user.userId, userUpdates);
                performanceManager.cache.updateCommandStats(command.name, 1);
                performanceManager.cache.incrementGlobalStats();
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
        await handleAntiDeleted({ fn, m, toId, mongoStore });
      };
      if (dbSettings.autojoin === true) {
        await handleAutoJoin({ m, fn, dbSettings, body, isSadmin, isMaster, isVIP, user, sReply, User });
      };
      if (dbSettings.changer === true) {
        await handleAudioChanger({ m, toId, fn, selfMode, fromBot, runJob, sReply });
      };
      if (dbSettings.autosticker === true) {
        await handleAutoSticker({ m, toId, fn, runJob, sendRawWebpAsSticker, reactDone });
      };
      if (dbSettings.chatbot === true) {
        await handleChatbot({ m, toId, fn, dbSettings, body, Media, DatabaseBot, sReply });
      };
    }
  } catch (error) { await log(error, true); }
};

export {
  performanceManager
};