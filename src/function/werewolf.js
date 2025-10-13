// ─── Info ────────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── info src/function/werewolf.js ───────────────────

export function emoji_role(role) {
  const roles = {
    warga: "👱‍♂️",
    seer: "👳",
    guardian: "👼",
    sorcerer: "🔮",
    werewolf: "🐺"
  };
  return roles[role] || "";
};
function roleAmount(playerCount) {
  if (playerCount <=  4) return { werewolf: 1, seer: 1, guardian: 1, warga: playerCount - 3, sorcerer: 0 };
  if (playerCount === 5) return { werewolf: 1, seer: 1, guardian: 1, warga: 2, sorcerer: 0 };
  if (playerCount === 6) return { werewolf: 2, seer: 1, guardian: 1, warga: 2, sorcerer: 0 };
  if (playerCount === 7) return { werewolf: 2, seer: 1, guardian: 1, warga: 3, sorcerer: 0 };
  if (playerCount === 8) return { werewolf: 2, seer: 1, guardian: 1, warga: 3, sorcerer: 1 };
  if (playerCount >=  9) return { werewolf: 3, seer: 1, guardian: 1, warga: playerCount - 6, sorcerer: 1 };
  return {};
};
function assignRoles(gameState) {
  const players = Object.keys(gameState.pemain);
  for (let i = players.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [players[i], players[j]] = [players[j], players[i]];
  }
  const roles = roleAmount(players.length);
  let playerIndex = 0;
  const assign = (role, count) => {
    for (let i = 0; i < count; i++) {
      if (players[playerIndex]) {
        gameState.pemain[players[playerIndex]].role = role;
        playerIndex++;
      }
    }
  };
  assign('werewolf', roles.werewolf);
  assign('seer', roles.seer);
  assign('guardian', roles.guardian);
  assign('sorcerer', roles.sorcerer);
  assign('warga', roles.warga);
};
function checkPemenang(gameState) {
  const livingPlayers = Object.values(gameState.pemain).filter(p => p.isAlive);
  const livingWerewolves = livingPlayers.filter(p => ['werewolf', 'sorcerer'].includes(p.role)).length;
  const livingVillagers = livingPlayers.filter(p => ['warga', 'seer', 'guardian'].includes(p.role)).length;
  if (livingWerewolves === 0) return 'WARGA';
  if (livingWerewolves >= livingVillagers) return 'WEREWOLF';
  return null;
};
export function initializeGameWW(toId, fn, m, werewolfSessions) {
  const gameState = werewolfSessions[toId];
  assignRoles(gameState);
  let startMessage = "Permainan dimulai! Peran telah dibagikan melalui pesan pribadi.\n\nPemain:\n";
  Object.keys(gameState.pemain).forEach(jid => {
    startMessage += `- @${jid.split('@')[0]}\n`;
  });
  fn.sendPesan(toId, startMessage, { ephemeralExpiration: m.expiration ?? 0 });
  startNightPhase(toId, fn, m, werewolfSessions);
};
export async function endGame(toId, reason, fn, m, werewolfSessions) {
  const gameState = werewolfSessions[toId];
  if (!gameState) return;
  clearTimeout(gameState.timeoutId);
  let endMessage = `GAME SELESAI!\nAlasan: ${reason}\n\n`;
  const allPlayers = Object.values(gameState.pemain);
  const teamWarga = allPlayers.filter(p => ['warga', 'seer', 'guardian'].includes(p.role));
  const teamWerewolf = allPlayers.filter(p => ['werewolf', 'sorcerer'].includes(p.role));
  endMessage += "Tim Warga:\n";
  teamWarga.forEach(p => {
    endMessage += `- @${p.id.split('@')[0]} (${p.role} ${emoji_role(p.role)})\n`;
  });
  endMessage += "\nTim Werewolf:\n";
  teamWerewolf.forEach(p => {
    endMessage += `- @${p.id.split('@')[0]} (${p.role} ${emoji_role(p.role)})\n`;
  });
  await fn.sendPesan(toId, endMessage, { ephemeralExpiration: m.expiration ?? 0 });
  delete werewolfSessions[toId];
};
async function processVotingResult(toId, fn, m, werewolfSessions) {
  const gameState = werewolfSessions[toId];
  if (!gameState || gameState.status !== 'VOTING') return;
  const voteCounts = {};
  Object.values(gameState.votes).forEach(votedJid => {
    voteCounts[votedJid] = (voteCounts[votedJid] || 0) + 1;
  });
  let maxVotes = 0;
  let lynchedJid = null;
  let isTie = false;
  for (const jid in voteCounts) {
    if (voteCounts[jid] > maxVotes) {
      maxVotes = voteCounts[jid];
      lynchedJid = jid;
      isTie = false;
    } else if (voteCounts[jid] === maxVotes) {
      isTie = true;
    }
  }
  if (isTie || !lynchedJid) {
    await fn.sendPesan(toId, `Hasil voting seri atau tidak ada yang divote. Tidak ada yang dieksekusi malam ini.`, { ephemeralExpiration: m.expiration ?? 0 });
  } else {
    gameState.pemain[lynchedJid].isAlive = false;
    const lynchedPlayer = gameState.pemain[lynchedJid];
    await fn.sendPesan(toId, `Warga desa telah sepakat untuk menggantung @${lynchedJid.split('@')[0]}. Dia adalah seorang *${lynchedPlayer.role}* ${emoji_role(lynchedPlayer.role)}.`, { ephemeralExpiration: m.expiration ?? 0 });
  }
  const winner = checkPemenang(gameState);
  if (winner) {
    await endGame(toId, `Pemenangnya adalah Tim ${winner}!`, fn, m, werewolfSessions);
  } else {
    startNightPhase(toId, fn, m, werewolfSessions);
  }
};
async function startVotingPhase(toId, fn, m, werewolfSessions) {
  const gameState = werewolfSessions[toId];
  if (!gameState) return;
  gameState.status = 'VOTING';
  gameState.votes = {};
  let votingMessage = `Waktu voting telah tiba! Silakan pilih siapa yang akan dieksekusi.\nWaktu 90 detik.\n\nKetik .vote <nomor>\n\nPemain Hidup:\n`;
  Object.values(gameState.pemain).forEach((p, index) => {
    if (p.isAlive) {
      votingMessage += `${index + 1}. @${p.id.split('@')[0]}\n`;
    }
  });
  await fn.sendPesan(toId, votingMessage, { ephemeralExpiration: m.expiration ?? 0 });
  gameState.phaseTimeout = setTimeout(() => processVotingResult(toId, fn, m, werewolfSessions), 90 * 1000);
};
async function startDayDiscussionPhase(toId, nightEvents, fn, m, werewolfSessions) {
  const gameState = werewolfSessions[toId];
  if (!gameState) return;
  gameState.status = 'DISCUSSION';
  gameState.day++;
  const dayMessage = `☀️ Hari ke-${gameState.day} telah tiba.\n\n${nightEvents}\n\nWarga desa punya waktu 90 detik untuk berdiskusi sebelum voting dimulai.`;
  await fn.sendPesan(toId, dayMessage, { ephemeralExpiration: m.expiration ?? 0 });
  gameState.phaseTimeout = setTimeout(() => startVotingPhase(toId, fn, m, werewolfSessions), 90 * 1000);
};
async function processNightActions(toId, fn, m, werewolfSessions) {
  const gameState = werewolfSessions[toId];
  if (!gameState || gameState.status !== 'NIGHT') return;
  const { pilihanWerewolf, pilihanGuardian } = gameState.aksiMalam;
  let nightEvents = "Suasana pagi ini tenang, tidak ada yang terbunuh.";
  if (pilihanWerewolf && pilihanWerewolf !== pilihanGuardian) {
    gameState.pemain[pilihanWerewolf].isAlive = false;
    nightEvents = `Warga desa menemukan mayat @${pilihanWerewolf.split('@')[0]}! Dia telah dibunuh oleh werewolf.`;
  } else if (pilihanWerewolf && pilihanWerewolf === pilihanGuardian) {
    nightEvents = `Werewolf mencoba membunuh @${pilihanWerewolf.split('@')[0]}, tetapi seorang Guardian berhasil melindunginya!`;
  }
  const winner = checkPemenang(gameState);
  if (winner) {
    await endGame(toId, `Pemenangnya adalah Tim ${winner}!`, fn, m, werewolfSessions);
  } else {
    startDayDiscussionPhase(toId, nightEvents, fn, m, werewolfSessions);
  }
};
async function startNightPhase(toId, fn, m, werewolfSessions) {
  const gameState = werewolfSessions[toId];
  if (!gameState) return;
  gameState.status = 'NIGHT';
  gameState.aksiMalam = {};
  await fn.sendPesan(toId, `🌙 Malam telah tiba. Semua warga tertidur. Para peran khusus, silakan cek pesan pribadi untuk beraksi. Waktu 90 detik.`, { ephemeralExpiration: m.expiration ?? 0 });
  const livingPlayersForDm = Object.values(gameState.pemain)
    .filter(p => p.isAlive)
    .map((p, i) => `${i + 1}. @${p.id.split('@')[0]}`)
    .join('\n');
  for (const playerJid in gameState.pemain) {
    const player = gameState.pemain[playerJid];
    if (player.isAlive) {
      let dmMessage = `Malam ke-${gameState.day}. Peranmu: *${player.role}* ${emoji_role(player.role)}.\n\n`;
      let commandInstruction = "";
      switch (player.role) {
        case 'werewolf':
          commandInstruction = "Ketik `.w kill <nomor>` untuk membunuh target.";
          break;
        case 'seer':
          commandInstruction = "Ketik `.w see <nomor>` untuk melihat peran target.";
          break;
        case 'guardian':
          commandInstruction = "Ketik `.w protect <nomor>` untuk melindungi target.";
          break;
        case 'sorcerer':
          commandInstruction = "Ketik `.w check <nomor>` untuk memeriksa peran target.";
          break;
        default:
          commandInstruction = "Berdoalah agar kamu selamat sampai pagi.";
          break;
      }
      if (['werewolf', 'seer', 'guardian', 'sorcerer'].includes(player.role)) {
        dmMessage += `Pilih targetmu:\n${livingPlayersForDm}\n\n${commandInstruction}`;
      } else {
        dmMessage += commandInstruction;
      }
      const expiration = await fn.getEphemeralExpiration(player.id);
      await fn.sendPesan(player.id, dmMessage, { ephemeralExpiration: expiration });
    }
  }
  gameState.phaseTimeout = setTimeout(() => processNightActions(toId, fn, m, werewolfSessions), 90 * 1000);
};