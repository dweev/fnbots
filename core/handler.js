// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info handler.js ─────────────────────

import util from 'util';
import path from 'path';
import Fuse from 'fuse.js';
import { delay } from 'baileys';
import config from '../config.js';
import { spawn } from 'child_process';
import log from '../src/utils/logger.js';
import { exec as cp_exec } from 'child_process';
import { pluginCache } from '../src/lib/plugins.js';
import { User, Group, Whitelist, Settings, Command } from '../database/index.js';
import { color, msgs, mycmd, safeStringify, sendAndCleanupFile } from '../src/lib/function.js';

const exec = util.promisify(cp_exec);
const isPm2 = process.env.pm_id !== undefined || process.env.NODE_APP_INSTANCE !== undefined;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 5000;
const localFilePrefix = 'local-file://';

let fuse;
let recentcmd         = new Set();
let fspamm            = new Set();
let sban              = new Set();
let allCmds           = [];
let mygroup           = [];
let chainingCommands  = [];
let counter           = 0;
let suggested         = false;
let _checkVIP         = false;
let _checkPremium     = false;
let _latestMessage    = null;
let _latestMessages   = null;

const fuseOptions = { includeScore: true, threshold: 0.25, minMatchCharLength: 2, distance: 25 };

async function textMatch1(fn, m, lt, toId) {
  const suggestions = [];
  const seenTypo = new Set();
  for (const typo of lt) {
    const firstWord = typo.trim().split(/\s+/)[0].toLowerCase();
    if (allCmds.includes(firstWord) || seenTypo.has(firstWord)) continue;
    seenTypo.add(firstWord);
    const results = fuse.search(firstWord);
    if (results.length > 0) {
      const bestMatch = results[0].item;
      if (bestMatch !== firstWord) {
        suggestions.push({ from: firstWord, to: bestMatch });
      }
    }
  }
  if (suggestions.length > 0) {
    const suggestionText = [
      "*Mungkinkah yang kamu maksud:*",
      ...suggestions.map(s => `• ${s.from} → ${s.to}`)
    ].join("\n");
    await fn.sendPesan(toId, suggestionText, m);
  }
};
async function textMatch2(lt) {
  if (Array.isArray(lt)) {
    lt = lt.join(' ; ');
  }
  const commands = lt.split(';').map(cmd => cmd.trim()).filter(cmd => cmd.length > 0);
  const correctedCommands = [];
  let hasCorrections = false;
  for (const command of commands) {
    const parts = command.trim().split(/\s+/);
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');
    const results = fuse.search(commandName);
    if (results.length > 0 && results[0].score <= fuseOptions.threshold) {
      const bestMatch = results[0].item;
      let correctedCommand = bestMatch;
      if (args) {
        correctedCommand += ' ' + args;
      }
      correctedCommands.push(correctedCommand);
      if (commandName !== bestMatch) {
        hasCorrections = true;
      }
    } else {
      correctedCommands.push(command);
    }
  }
  return hasCorrections ? correctedCommands : null;
};
async function expiredCheck(fn, ownerNumber) {
  if (_checkPremium) return;
  _checkPremium = true;
  const premiumCheckInterval = setInterval(async () => {
    const expiredUsers = await User.getExpiredPremiumUsers();
    for (const user of expiredUsers) {
      if (_latestMessages) {
        await fn.sendPesan(ownerNumber[0], `Premium expired: @${user.userId.split('@')[0]}`, _latestMessages);
        await User.removePremium(user.userId);
      }
    }
  }, 60000);
  global.activeIntervals.push(premiumCheckInterval);
};
async function expiredVIPcheck(fn, ownerNumber) {
  if (_checkVIP) return;
  _checkVIP = true;
  const vipCheckInterval = setInterval(async () => {
    const expiredUsers = await User.getExpiredVIPUsers();
    for (const user of expiredUsers) {
      if (_latestMessage) {
        await fn.sendPesan(ownerNumber[0], `VIP expired: @${user.userId.split('@')[0]}`, _latestMessage);
        await User.removeVIP(user.userId);
      }
    }
  }, 60000);
  global.activeIntervals.push(vipCheckInterval);
};
async function getSerial(m) {
  if (m?.key?.fromMe) return;
  const sender = m.sender;
  return sender;
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
async function shutdown() {
  if (isPm2) {
    try {
      await exec(`pm2 stop ${process.env.pm_id}`);
    } catch {
      process.exit(1);
    }
  } else {
    process.exit(0);
  }
};
async function checkCommandAccess(command, userData, user, maintenance) {
  const {
    isSadmin,
    isMaster,
    isVIP,
    isPremium,
    isGroupAdmins,
    isWhiteList,
    hakIstimewa,
    isMuted
  } = userData;
  let hasAccess = false;
  const isGameLimited = await user.isGameLimit();
  const isLimited = await user.isLimit();
  const hasBasicAccess = !(isGameLimited && isLimited) && ((maintenance && (isWhiteList || hakIstimewa)) || (!maintenance && (hakIstimewa || !isMuted)));
  if (!hasBasicAccess) return false;
  if (isSadmin) return true;
  const accessLevels = {
    'master':     ['sadmin'],
    'owner':      ['sadmin', 'master'],
    'bot':        ['sadmin', 'master'],
    'vip':        ['sadmin', 'master', 'vip'],
    'premium':    ['sadmin', 'master', 'vip', 'premium'],
    'manage':     ['sadmin', 'master', 'vip', 'premium', 'groupAdmin'],
    'media':      ['all'],
    'convert':    ['all'],
    'audio':      ['all'],
    'text':       ['all'],
    'image':      ['all'],
    'ai':         ['all'],
    'anime':      ['all'],
    'fun':        ['all'],
    'ngaji':      ['all'],
    'game':       ['all'],
    'stateless':  ['all'],
    'statefull':  ['all'],
    'pvpgame':    ['all'],
    'math':       ['all'],
    'util':       ['all'],
    'list':       ['all'],
  };
  const requiredLevels = accessLevels[command.category] || [];
  if (requiredLevels.includes('all')) {
    hasAccess = true;
  } else if (requiredLevels.includes('sadmin') && isSadmin) {
    hasAccess = true;
  } else if (requiredLevels.includes('master') && isMaster) {
    hasAccess = true;
  } else if (requiredLevels.includes('vip') && isVIP) {
    hasAccess = true;
  } else if (requiredLevels.includes('premium') && isPremium) {
    hasAccess = true;
  } else if (requiredLevels.includes('groupAdmin') && isGroupAdmins) {
    hasAccess = true;
  }
  return hasAccess;
};

export const updateMyGroup = (newGroupList) => {
  mygroup = newGroupList;
};
export async function initializeFuse() {
  allCmds = Array.from(pluginCache.commands.keys());
  fuse = new Fuse(allCmds, fuseOptions);
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
  _latestMessage = m;
  _latestMessages = m;
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
  const isSadmin = ownerNumber.includes(serial);
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
    isGroupAdmins: false,
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
    await Promise.all([reactDone(), shutdown()]);
  } else if (body?.toLowerCase().trim().startsWith("mode")) {
    if (!isSadmin && !isMaster) return;
    const args = body.toLowerCase().trim().split(/\s+/);
    const mode = args[1];
    const validModes = ['true', 'false', 'auto'];
    if (!mode) {
      const currentMode = dbSettings.self;
      return sReply(`📋 Mode self saat ini: *${currentMode}*\n\nGunakan: mode <mode>\n• Mode available: true, false, auto`);
    }
    if (!validModes.includes(mode)) return sReply(`Mode tidak valid!\n\nGunakan: mode <mode>\n• Mode available: true, false, auto`);
    await Settings.setSelfMode(mode);
    dbSettings.self = mode;
    await sReply(`✅ Mode self berhasil diubah ke: *${mode}*`);
  }

  const selfMode = dbSettings.self;
  if (selfMode === 'true' && !fromBot && !isSadmin && !isMaster) return;
  if (selfMode === 'false' && fromBot) return;

  if (m.isGroup) {
    const groupData = await Group.ensureGroup(toId);
    await groupData.incrementMessageCount();
    await groupData.incrementCommandCount();
    if (!groupData.isActive) return;
  }
  try {
    if (m.isGroup && !isCmd) {
      const isPrivileged = isBotGroupAdmins && [isSadmin, isMaster, isVIP, isPremium].some(Boolean);
      const groupSettings = await Group.findOne({ groupId: toId }).lean();
      if (groupSettings) {
        if (groupSettings.antiHidetag) {
          if (m.mentionedJid?.length === m.metadata.participants.length && !isPrivileged) {
            await fn.sendMessage(toId, { delete: { remoteJid: toId, fromMe: false, id: id, participant: serial } });
          }
        }
        if (groupSettings.antiTagStory) {
          if (m.type === 'groupStatusMentionMessage' || m.message?.groupStatusMentionMessage || m.message?.protocolMessage?.type === 25 || (Object.keys(m.message).length === 1 && Object.keys(m.message)[0] === 'messageContextInfo')) {
            if (!isPrivileged && !fromBot) {
              try {
                await fn.sendMessage(toId, { delete: { remoteJid: toId, fromMe: false, id: id, participant: serial } });
                await fn.removeParticipant(toId, serial);
              } catch (error) {
                await log(`Error_kick_antitagSW:\n${error}`, true);
              }
            }
          }
        }
        if (groupSettings.antilink) {
          if (body?.includes('chat.whatsapp.com') && !isPrivileged) {
            await fn.sendMessage(toId, { delete: { remoteJid: toId, fromMe: false, id: id, participant: serial } });
            await fn.removeParticipant(toId, serial);
          }
        }
      }
    }
    if (isCmd) {
      let commandText = await getTxt(txt, dbSettings);
      const remoteMatch = commandText.match(/^r:(\d+)\s+(.*)/s);
      if (remoteMatch && (isSadmin || isMaster)) {
        const index = parseInt(remoteMatch[1]) - 1;
        const remainingText = remoteMatch[2];
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
              log(`Error executing command ${command.name}:\n${error}`, true);
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
      if (counter <= 25) {
        counter++;
        if (botNumber === serial) return;
        const usr = serial;
        if ((recentcmd.has(usr) || sban.has(usr)) && !isSadmin) {
          if (!(fspamm.has(usr) || sban.has(usr))) {
            await sReply(`*Hei @${usr.split('@')[0]} you are on cooldown!*`);
            fspamm.add(usr);
          } else if (!sban.has(usr)) {
            await sReply(`*Hei @${usr.split('@')[0]}*\n*COMMAND SPAM DETECTED*\n*Command banned for 15 minutes*`);
            sban.add(usr);
          }
        } else {
          setTimeout(() => { counter--; }, 1000);
          recentcmd.add(usr);
          setTimeout(() => { recentcmd.delete(usr); }, 1000);
          setTimeout(() => { fspamm.delete(usr); }, 10000);
          setTimeout(() => { sban.delete(usr); }, 900000);
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
        setTimeout(() => { counter = 0; }, 6000);
      }
    }
  } catch (error) {
    await log(`!!! ERROR DI DALAM ARFINE !!!\n${error}`, true);
  };
};