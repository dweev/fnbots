// ─── Info ────────────────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info src/handler/gameBot.js ─────────────────────

import { delay } from 'baileys';
import { User } from '../../database/index.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { performanceManager } from '../lib/performanceManager.js';
import { rollDice, generateUlarTanggaImage, runBotUlarTanggaTurnV2, runBotUlarTanggaTurn, generateBoardImage, PLAYER_BLACK, PLAYER_WHITE, fileLabels, rankLabels, parseOthelloMove, makeOthelloMove, getValidOthelloMoves, calculateOthelloScore, generateOthelloBoardImage, runBotLudoTurns, calculateNewPosition, HOME_POSITIONS, checkForCapture, generateLudoBoard, startLudoTimeout, formatKartu, runBotTurn41, calculateScore, calculateSamgongValue, runBotSamgongTurn, emoji_role, checkWinner, formatTicTacToeBoard, formatMinesweeperBoard, revealCell, checkWinCondition, generateSudokuBoardImage, parseSudokuCoord, SESSION_TIMEOUT, getSession, safetySettings } from '../function/index.js';

export async function handleGameBotResponse(params) {
  const { m, toId, body, user, sReply, sPesan, fn, serial, isCmd, reactFail, dbSettings, config, gameStates } = params;
  const { hangman, family100, tebaklirik, tekateki, tebakkata, susunkata, tebakkimia, tebaknegara, tebakgambar, caklontong, tebakbendera, sudokuGame, chatBots, sessions, chessGame, othelloGame, ludoSessions, game41Sessions, gamematematika, werewolfSessions, minesweeperSessions, ularTanggaSessions, tictactoeSessions, samgongSessions, tebakkalimat, siapakahaku, ulartangga, tebakgame } = gameStates;

  const quotedMsg = m.quoted ? m.quoted : false;
  const txt = body;

  if (quotedMsg) {
    // prettier-ignore
    const gameDefinitions = [
      { name: 'Tebak Lirik',          regex: /^Tebak Lirik:/i,          store: tebaklirik     },
      { name: 'Tebak Kalimat',        regex: /^Tebak Kalimat:/i,        store: tebakkalimat   },
      { name: 'Siapakah Aku',         regex: /^Siapakah Aku:/i,         store: siapakahaku    },
      { name: 'Teka Teki',            regex: /^Teka Teki:/i,            store: tekateki       },
      { name: 'Tebak Kata',           regex: /^Tebak Kata:/i,           store: tebakkata      },
      { name: 'Susun Kata',           regex: /^Susun Kata:/i,           store: susunkata      },
      { name: 'Tebak Kimia',          regex: /^Tebak Kimia:/i,          store: tebakkimia     },
      { name: 'Tebak Negara',         regex: /^Tebak Negara:/i,         store: tebaknegara    },
      { name: 'Tebak Bendera',        regex: /^Tebak Bendera:/i,        store: tebakbendera   },
      { name: 'Tebak Gambar Berikut', regex: /^Tebak Gambar Berikut:/i, store: tebakgambar    },
      { name: 'Tebak Game Berikut',   regex: /^Tebak Game Berikut:/i,   store: tebakgame      },
      { name: 'Kuis Caklontong',      regex: /^Kuis Caklontong:/i,      store: caklontong     }
    ];
    for (const { regex, store } of gameDefinitions) {
      if (store && quotedMsg.body && regex.test(quotedMsg.body)) {
        const game = store[toId];
        const counthits = { $inc: { userCount: 1 } };
        const addStat = async () => {
          await user.addXp();
          await performanceManager.cache.updateUserStats(user.userId, counthits);
        };
        if (!game || quotedMsg?.id !== game[0]?.id) {
          sReply(`Soal itu sudah berakhir`);
          await addStat();
          return true;
        }
        const gameData = game[1];
        let chances = game[2];
        if (body.toLowerCase() === gameData.jawaban) {
          await sReply(`*Jawaban Benar!*\nSelamat kamu mendapatkan ${gameData.bonus} saldo`);
          await user.addBalance(gameData.bonus);
          clearTimeout(game[3]);
          delete store[toId];
        } else {
          if (--chances <= 0) {
            await sReply(`*Kesempatan habis!*\nJawaban: *${gameData.jawaban}*`);
            clearTimeout(game[3]);
            delete store[toId];
          } else {
            game[2] = chances;
            await sReply(`*Jawaban Salah!*\nMasih ada ${chances} kesempatan`);
          }
        }
        await addStat();
        return true;
      }
    }
  }
  if (hangman[toId] && !isCmd) {
    const counthits = { $inc: { userCount: 1 } };
    const huruf = m.body?.toLowerCase()?.trim();
    const isValidHangmanInput = (huruf && huruf.length === 1 && /^[a-z]$/i.test(huruf)) || huruf === 'menyerah';
    if (isValidHangmanInput) {
      const dataGame = hangman[toId];
      const [jawaban, display, clue, data, mode, timeout] = dataGame;
      const rewardNormal = 500;
      const rewardExpert = 2000;
      if (huruf === 'menyerah') {
        if (data.menyerah[serial]) return true;
        data.menyerah[serial] = true;
        await sPesan(`@${serial.split('@')[0]} telah menyerah.`);
        return true;
      }
      if (data.menyerah[serial]) return true;
      if (data.benar[serial]?.includes(huruf) || data.salah[serial]?.includes(huruf)) {
        await sPesan(`Huruf '${huruf.toUpperCase()}' sudah pernah kamu tebak sebelumnya.`);
        return true;
      }
      const salahUser = data.salah[serial] || [];
      if (mode === 'expert' && salahUser.length >= 13) {
        await sPesan(`Nyawa tebakanmu sudah habis!`);
        return true;
      }
      let found = false;
      for (let i = 0; i < jawaban.length; i++) {
        if (jawaban[i].toLowerCase() === huruf) {
          display[i] = huruf.toUpperCase();
          found = true;
        }
      }
      if (found) {
        data.benar[serial] = [...(data.benar[serial] || []), huruf];
        await sPesan(display.join(''));
        const selesai = !display.includes('•');
        if (selesai) {
          clearTimeout(timeout);
          const totalReward = mode === 'normal' ? rewardNormal : rewardExpert;
          const pemainAktif = Object.keys(data.benar).filter((u) => !data.menyerah[u]);
          const kontribusi = {};
          pemainAktif.forEach((u) => {
            kontribusi[u] = data.benar[u].length || 0;
          });
          const totalKontribusi = Object.values(kontribusi).reduce((a, b) => a + b, 0) || 1;
          const rewardPerPlayer = {};
          if (mode === 'normal') {
            pemainAktif.forEach((u) => (rewardPerPlayer[u] = Math.floor(totalReward / pemainAktif.length)));
          } else {
            pemainAktif.forEach((u) => {
              rewardPerPlayer[u] = Math.floor(totalReward * (kontribusi[u] / totalKontribusi));
            });
          }
          const playerDocs = await User.find({ userId: { $in: pemainAktif } });
          for (const playerDoc of playerDocs) {
            const point = rewardPerPlayer[playerDoc.userId];
            if (point > 0) {
              await playerDoc.addBalance(point);
            }
          }
          let pesanAkhir = `🎉 *Permainan selesai!*\n\n`;
          pesanAkhir += `🧩 Kata: ${jawaban.toUpperCase()}\n`;
          pesanAkhir += `📌 Deskripsi: ${clue}\n\n`;
          pesanAkhir += `💰 *Reward dibagikan sebagai berikut:*`;
          const mentions = [];
          pemainAktif.forEach((u) => {
            pesanAkhir += `\n- @${u.split('@')[0]}: ${rewardPerPlayer[u]} Saldo`;
            mentions.push(u);
          });
          const pemainMenyerah = Object.keys(data.menyerah);
          if (pemainMenyerah.length) {
            pesanAkhir += `\nPemain yang menyerah tidak mendapat reward:`;
            for (const u of pemainMenyerah) {
              pesanAkhir += `\n- @${u.split('@')[0]}`;
              mentions.push(u);
            }
          }
          delete hangman[toId];
          await sReply(pesanAkhir, { mentions });
          await user.addXp();
          await performanceManager.cache.updateUserStats(user.userId, counthits);
          return true;
        }
      } else {
        data.salah[serial] = [...salahUser, huruf];
        await reactFail();
        if (mode === 'expert' && data.salah[serial].length >= 13) {
          const penalti = 100;
          await user.addXp();
          await user.minBalance(penalti);
          await sReply(`😵 @${serial.split('@')[0]} kehabisan nyawa!\n💸 Penalti: -${penalti} saldo`, { mentions: [serial] });
          await performanceManager.cache.updateUserStats(user.userId, counthits);
        }
      }
      return true;
    }
  }
  if (chessGame[toId] && !isCmd) {
    const counthits = { $inc: { userCount: 1 } };
    const gameState = chessGame[toId];
    const messageText = m.body?.toLowerCase().trim();
    if (serial !== gameState.players.white) return true;
    const stopKeywords = ['menyerah', 'stop', 'surrender', 'endgame'];
    if (stopKeywords.includes(messageText)) {
      clearTimeout(gameState.timeoutId);
      await sReply(`Kamu telah menyerah. Bot memenangkan permainan. 🤖`);
      delete chessGame[toId];
      return true;
    }
    const moveRegex = /^[a-h][1-8]\s[a-h][1-8]$/;
    if (moveRegex.test(messageText)) {
      if (gameState.game.turn() !== 'w') return true;
      const [from, to] = messageText.split(' ');
      try {
        const playerMove = gameState.game.move({ from, to, promotion: 'q' });
        if (playerMove === null) {
          await sReply('Gerakan tidak valid!');
          return true;
        }
      } catch {
        await sReply('Gerakan tidak valid!');
        return true;
      }
      if (gameState.game.isCheckmate()) {
        clearTimeout(gameState.timeoutId);
        const boardBuffer = await generateBoardImage(gameState.game.fen(), 'w');
        const caption = `🎉 *SKAKMAT!* 🎉\n\nSelamat, Kamu memenangkan permainan melawan Bot!`;
        await fn.sendMediaFromBuffer(toId, 'image/jpeg', boardBuffer, caption, m);
        delete chessGame[toId];
        await user.addXp();
        await performanceManager.cache.updateUserStats(user.userId, counthits);
        return true;
      }
      await delay(1000);
      const possibleMoves = gameState.game.moves({ verbose: true });
      const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9 };
      let bestMove = null;
      let maxCaptureValue = -1;
      for (const move of possibleMoves) {
        if (move.flags.includes('c')) {
          const capturedPiece = move.captured;
          const value = pieceValues[capturedPiece.toLowerCase()] || 0;
          if (value > maxCaptureValue) {
            maxCaptureValue = value;
            bestMove = move;
          }
        }
      }
      const botMove = bestMove ? bestMove : possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
      gameState.game.move(botMove);
      const finalFen = gameState.game.fen();
      const boardBuffer = await generateBoardImage(finalFen, 'w');
      let caption = `Langkah Kamu: *${from.toUpperCase()} → ${to.toUpperCase()}*\n`;
      caption += `Langkah Bot: *${botMove.from.toUpperCase()} → ${botMove.to.toUpperCase()}*\n\n`;
      if (gameState.game.isCheckmate()) {
        clearTimeout(gameState.timeoutId);
        caption += `🤖 *SKAKMAT!* 🤖\n\nBot memenangkan permainan.`;
        await fn.sendMediaFromBuffer(toId, 'image/jpeg', boardBuffer, caption, m);
        delete chessGame[toId];
        await user.addXp();
        await performanceManager.cache.updateUserStats(user.userId, counthits);
        return true;
      }
      if (gameState.game.isDraw()) {
        clearTimeout(gameState.timeoutId);
        caption += `🤝 *REMIS!* Permainan berakhir seri.`;
        await fn.sendMediaFromBuffer(toId, 'image/jpeg', boardBuffer, caption, m);
        delete chessGame[toId];
        await user.addXp();
        await performanceManager.cache.updateUserStats(user.userId, counthits);
        return true;
      }
      caption += `Giliran Kamu selanjutnya.`;
      if (gameState.game.isCheck()) {
        caption += `\n\n*ANDA SEDANG DI-SKAK!*`;
      }
      await fn.sendMediaFromBuffer(toId, 'image/jpeg', boardBuffer, caption, m);
      await user.addXp();
      await performanceManager.cache.updateUserStats(user.userId, counthits);
      return true;
    }
  }
  if (ulartangga[toId] && !isCmd) {
    const counthits = { $inc: { userCount: 1 } };
    const gameState = ulartangga[toId];
    const messageText = m.body?.toLowerCase()?.trim();
    if (serial !== gameState.playerJid) return true;
    if (['stop', 'menyerah', 'end', 'leave'].includes(messageText)) {
      clearTimeout(gameState.timeoutId);
      delete ulartangga[toId];
      await user.addXp();
      await performanceManager.cache.updateUserStats(user.userId, counthits);
      await sReply('Permainan Ular Tangga telah dihentikan.');
      return true;
    }
    if (['roll', 'kocok'].includes(messageText)) {
      if (gameState.turn !== 'player') {
        await sReply('Bukan giliranmu!');
        return true;
      }
      clearTimeout(gameState.timeoutId);
      const roll = rollDice();
      const oldPos = gameState.playerPos;
      gameState.playerPos += roll;
      if (gameState.playerPos > 100) gameState.playerPos = 100 - (gameState.playerPos - 100);
      // prettier-ignore
      let moveText = `Kamu melempar dadu dan mendapat angka *${roll}*.\n` +
        `Maju dari kotak *${oldPos}* ke *${gameState.playerPos}*.\n`;
      const moveEffect = gameState.map.move[gameState.playerPos];
      if (moveEffect) {
        moveText += gameState.playerPos > moveEffect ? `Kamu Termakan Ular! 🐍 Turun ke *${moveEffect}*.\n` : `Kamu Naik Tangga! 🪜 Naik ke *${moveEffect}*.\n`;
        gameState.playerPos = moveEffect;
      }
      if (gameState.playerPos === 100) {
        const finalBoard = await generateUlarTanggaImage(gameState);
        if (finalBoard) await sReply({ image: finalBoard, caption: moveText + `\n🎉 Selamat, Kamu MENANG!`, mentions: [serial] });
        delete ulartangga[toId];
        await user.addXp();
        await performanceManager.cache.updateUserStats(user.userId, counthits);
        return true;
      }
      gameState.turn = 'bot';
      await sReply(moveText + `\nSekarang giliran Bot...`);
      await user.addXp();
      await performanceManager.cache.updateUserStats(user.userId, counthits);
      setTimeout(() => runBotUlarTanggaTurnV2(toId, m, fn, ulartangga), 1000);
    }
    return true;
  }
  if (othelloGame[toId] && !isCmd) {
    const counthits = { $inc: { userCount: 1 } };
    const gameState = othelloGame[toId];
    const messageText = m.body?.toLowerCase().trim();
    if (serial !== gameState.players.black) return true;
    if (gameState.turn !== PLAYER_BLACK) return true;
    const stopKeywords = ['menyerah', 'stop', 'surrender'];
    if (stopKeywords.includes(messageText)) {
      await performanceManager.cache.updateUserStats(user.userId, counthits);
      await sReply(`Kamu telah menyerah. Bot memenangkan permainan Othello. 🤖`);
      clearTimeout(gameState.timeoutId);
      delete othelloGame[toId];
      return true;
    }
    const moveCoords = parseOthelloMove(messageText);
    if (!moveCoords) return true;
    const isValid = gameState.validMoves.some((valid) => valid.move[0] === moveCoords[0] && valid.move[1] === moveCoords[1]);
    if (!isValid) {
      await sReply('Gerakan tidak valid! Pilih salah satu kotak yang ditandai.');
      return true;
    }
    clearTimeout(gameState.timeoutId);
    const gameDuration = 5 * 60 * 1000;
    const newTimeoutCallback = async () => {
      if (othelloGame[toId]) {
        delete othelloGame[toId];
        await sReply(`Sesi game Othello di grup ini telah berakhir karena tidak ada aktivitas selama ${gameDuration / 60000} menit.`);
      }
    };
    gameState.timeoutId = setTimeout(newTimeoutCallback, gameDuration);
    let currentBoard = makeOthelloMove(gameState.board, PLAYER_BLACK, moveCoords);
    let gameCaption = '';
    let botValidMoves = getValidOthelloMoves(currentBoard, PLAYER_WHITE);
    if (botValidMoves.length > 0) {
      botValidMoves.sort((a, b) => b.flips - a.flips);
      const botMove = botValidMoves[0].move;
      currentBoard = makeOthelloMove(currentBoard, PLAYER_WHITE, botMove);
      const botMoveStr = `${fileLabels[botMove[1]]}${rankLabels[botMove[0]]}`;
      gameCaption += `Langkah Kamu: *${messageText.toUpperCase()}*\nLangkah Bot: *${botMoveStr.toUpperCase()}*\n\n`;
    } else {
      gameCaption += `Langkah Kamu: *${messageText.toUpperCase()}*\nBot tidak bisa bergerak dan melewati gilirannya!\n\n`;
    }
    const playerNextMoves = getValidOthelloMoves(currentBoard, PLAYER_BLACK);
    botValidMoves = getValidOthelloMoves(currentBoard, PLAYER_WHITE);
    gameState.board = currentBoard;
    gameState.validMoves = playerNextMoves;
    const finalScore = calculateOthelloScore(currentBoard);
    gameCaption += `Skor: Hitam ${finalScore.black} - ${finalScore.white} Putih\n\n`;
    if (playerNextMoves.length === 0 && botValidMoves.length === 0) {
      gameCaption += `*PERMAINAN SELESAI!*\n\n`;
      if (finalScore.black > finalScore.white) {
        gameCaption += `🎉 Selamat, Kamu (Hitam) memenangkan permainan!`;
      } else if (finalScore.white > finalScore.black) {
        gameCaption += `🤖 Bot (Putih) memenangkan permainan!`;
      } else {
        gameCaption += `🤝 Permainan berakhir seri!`;
      }
      const boardBuffer = await generateOthelloBoardImage(currentBoard);
      await sReply({ image: boardBuffer, caption: gameCaption, mentions: [serial] });
      clearTimeout(gameState.timeoutId);
      delete othelloGame[toId];
      await user.addXp();
      await performanceManager.cache.updateUserStats(user.userId, counthits);
      return true;
    }
    if (playerNextMoves.length > 0) {
      gameState.turn = PLAYER_BLACK;
      gameCaption += `Giliranmu`;
    } else {
      gameState.turn = PLAYER_WHITE;
      gameCaption += `Kamu tidak memiliki langkah valid! Giliran dilewati.`;
    }
    const boardBuffer = await generateOthelloBoardImage(currentBoard, playerNextMoves);
    await sReply({ image: boardBuffer, caption: gameCaption, mentions: [serial] });
    return true;
  }
  if (ludoSessions[toId] && !isCmd) {
    const gameState = ludoSessions[toId];
    const messageText = m.body?.toLowerCase()?.trim();
    if (serial !== gameState.playerJid) return true;
    const stopKeywords = ['stop', 'menyerah', 'end', 'stop ludo'];
    if (stopKeywords.includes(messageText)) {
      clearTimeout(gameState.timeoutId);
      delete ludoSessions[toId];
      await sReply('Permainan Ludo telah dihentikan.');
      return true;
    }
    if (gameState.players[gameState.turn] !== 'RED') return true;
    if (['roll', 'kocok'].includes(messageText)) {
      if (gameState.status !== 'WAITING_FOR_ROLL') {
        await sReply('Bukan giliran Kamu atau Kamu harus menunggu bot selesai.');
        return true;
      }
      clearTimeout(gameState.timeoutId);
      const roll = rollDice();
      const playerColor = 'RED';
      const currentPos = gameState.pawnPositions[playerColor];
      let moveText = `Kamu melempar dadu dan mendapat angka *${roll}*.\n`;
      if (currentPos >= 500 && roll !== 6) {
        await sReply(`Kamu perlu angka 6 untuk keluar dari kandang. Giliran dilewatkan.`);
        gameState.turn = (gameState.turn + 1) % gameState.players.length;
        gameState.status = 'BOTS_TURN';
        setTimeout(() => runBotLudoTurns(toId, m, fn, ludoSessions), 2000);
        return true;
      }
      const newPos = calculateNewPosition(currentPos, roll, playerColor);
      gameState.pawnPositions[playerColor] = newPos;
      if (currentPos >= 500) {
        moveText += `Kamu keluar dari kandang!\n`;
      } else {
        moveText += `Pion Kamu maju *${roll}* langkah...\n`;
      }
      const captureText = checkForCapture(gameState, playerColor, newPos);
      if (captureText) moveText += captureText;
      if (newPos === HOME_POSITIONS[playerColor]) {
        const finalBoard = await generateLudoBoard(gameState);
        await sReply({ image: finalBoard, caption: moveText + `\n🎉 Selamat, Kamu MENANG!`, mentions: [serial] });
        delete ludoSessions[toId];
        return true;
      }
      const newBoard = await generateLudoBoard(gameState);
      if (roll === 6) {
        gameState.status = 'WAITING_FOR_ROLL';
        await sReply({ image: newBoard, caption: moveText + `\nAnda dapat angka 6! Silakan *roll* lagi.` });
        startLudoTimeout(toId);
      } else {
        gameState.status = 'BOTS_TURN';
        await sReply({ image: newBoard, caption: moveText + `\nSekarang giliran Bot...` });
        gameState.turn = (gameState.turn + 1) % gameState.players.length;
        setTimeout(() => runBotLudoTurns(toId, m, fn, ludoSessions), 2000);
      }
    }
    return true;
  }
  if (game41Sessions[toId] && !isCmd) {
    const counthits = { $inc: { userCount: 1 } };
    const gameState = game41Sessions[toId];
    const messageText = m.body?.toLowerCase()?.trim();
    if (serial !== gameState.playerJid || gameState.turn !== 'player') return true;
    const stopKeywords = ['menyerah', 'stop', 'surrender'];
    if (stopKeywords.includes(messageText)) {
      clearTimeout(gameState.timeoutId);
      await sReply(`Kamu telah menyerah. Bot memenangkan permainan. 🤖`);
      delete game41Sessions[toId];
      await user.addXp();
      await performanceManager.cache.updateUserStats(user.userId, counthits);
      return true;
    }
    if (['ambil dek', 'ambil buangan'].includes(messageText) && gameState.playerHand.length === 4) {
      const takenCard = messageText === 'ambil dek' ? gameState.deck.shift() : gameState.discardPile.pop();
      if (!takenCard) {
        await sReply('Tumpukan tersebut kosong!');
        return true;
      }
      gameState.playerHand.push(takenCard);
      // prettier-ignore
      const privateMessage = `Kamu mengambil [ ${takenCard.display} ].\n\n` +
        `Kartu Kamu sekarang:\n${formatKartu(gameState.playerHand)}\n\n` +
        `Ketik *buang <nomor kartu>* (1-5) di grup untuk membuang kartu.`;
      const expiration = await fn.getEphemeralExpiration(gameState.playerJid);
      await fn.sendPesan(gameState.playerJid, privateMessage, { ephemeralExpiration: expiration });
      await user.addXp();
      await performanceManager.cache.updateUserStats(user.userId, counthits);
      return true;
    }
    if (messageText.startsWith('buang ') && gameState.playerHand.length === 5) {
      const cardIndex = parseInt(messageText.split(' ')[1]) - 1;
      if (isNaN(cardIndex) || cardIndex < 0 || cardIndex >= 5) {
        await sReply('Nomor kartu tidak valid. Pilih dari 1 sampai 5.');
        return true;
      }
      const discardedCard = gameState.playerHand.splice(cardIndex, 1)[0];
      gameState.discardPile.push(discardedCard);
      gameState.turn = 'bot';
      await sReply(`Kamu membuang kartu [ ${discardedCard.display} ]. Giliran Bot...`);
      await user.addXp();
      await performanceManager.cache.updateUserStats(user.userId, counthits);
      setTimeout(() => runBotTurn41(toId, m, fn, game41Sessions), 2000);
      return true;
    }
    if (['ketuk', 'tutup'].includes(messageText)) {
      clearTimeout(gameState.timeoutId);
      const playerScore = calculateScore(gameState.playerHand);
      const botScore = calculateScore(gameState.botHand);
      // prettier-ignore
      let resultText = `*RONDE SELESAI!*\n\n` +
        `Tangan Kamu (Skor: *${playerScore}*):\n${formatKartu(gameState.playerHand)}\n\n` +
        `Tangan Bot (Skor: *${botScore}*):\n${formatKartu(gameState.botHand)}\n\n`;
      if (playerScore > botScore) resultText += `🎉 Selamat, Kamu menang!`;
      else if (botScore > playerScore) resultText += `🤖 Bot menang!`;
      else resultText += `🤝 Hasilnya seri!`;
      await sReply(resultText);
      delete game41Sessions[toId];
      await user.addXp();
      await performanceManager.cache.updateUserStats(user.userId, counthits);
      return true;
    }
  }
  if (samgongSessions[toId] && !isCmd) {
    const counthits = { $inc: { userCount: 1 } };
    const gameState = samgongSessions[toId];
    const messageText = m.body?.toLowerCase()?.trim();
    if (serial !== gameState.playerJid) return true;
    const stopKeywords = ['stop', 'berhenti', 'menyerah', 'stopsamgong'];
    const startTimeout = (idGroup) => {
      const gameDuration = 5 * 60 * 1000;
      const timeoutCallback = () => {
        if (samgongSessions[idGroup]) {
          delete samgongSessions[idGroup];
        }
      };
      samgongSessions[idGroup].timeoutId = setTimeout(timeoutCallback, gameDuration);
    };
    if (stopKeywords.includes(messageText)) {
      clearTimeout(gameState.timeoutId);
      delete samgongSessions[toId];
      await sReply('Kamu telah berdiri dari meja Samgong. Sesi dihentikan.');
      await user.addXp();
      await performanceManager.cache.updateUserStats(user.userId, counthits);
      return true;
    }
    if (gameState.status !== 'player_turn') return true;
    if (messageText === 'hit') {
      clearTimeout(gameState.timeoutId);
      const newCard = gameState.deck.shift();
      if (!newCard) {
        await sReply('Dek sudah habis!');
        return true;
      }
      gameState.playerHand.push(newCard);
      const playerScore = calculateSamgongValue(gameState.playerHand);
      // prettier-ignore
      let privateMessage = `Kamu mengambil [ ${newCard.display} ].\n\n` +
        `Tangan Kamu sekarang (Total: *${playerScore}*):\n${formatKartu(gameState.playerHand)}`;
      if (playerScore > 30) {
        const expiration = await fn.getEphemeralExpiration(gameState.playerJid);
        await fn.sendPesan(gameState.playerJid, privateMessage, { ephemeralExpiration: expiration });
        await sReply(`💥 *HANGUS!* Nilai kartu Kamu (*${playerScore}*) melebihi 30. Bot menang!`);
        delete samgongSessions[toId];
        await user.addXp();
        await performanceManager.cache.updateUserStats(user.userId, counthits);
        return true;
      } else {
        privateMessage += `\n\nKetik *hit* lagi atau *stand*.`;
        const expiration = await fn.getEphemeralExpiration(gameState.playerJid);
        await fn.sendPesan(gameState.playerJid, privateMessage, { ephemeralExpiration: expiration });
        startTimeout(toId);
        await user.addXp();
        await performanceManager.cache.updateUserStats(user.userId, counthits);
        return true;
      }
    }
    if (messageText === 'stand') {
      clearTimeout(gameState.timeoutId);
      gameState.status = 'bot_turn';
      const playerScore = calculateSamgongValue(gameState.playerHand);
      await sReply(`Kamu *STAND* dengan nilai akhir *${playerScore}*.\nBandar akan membuka kartu...`);
      setTimeout(() => runBotSamgongTurn(toId, m, fn, samgongSessions), 2000);
      return true;
    }
  }
  if (werewolfSessions[toId] && !isCmd) {
    const counthits = { $inc: { userCount: 1 } };
    const gameState = werewolfSessions[toId];
    const playerState = gameState.pemain[serial];
    const text = m.body?.toLowerCase()?.trim();
    if (!playerState || !playerState.isAlive) return true;
    if (gameState.status === 'NIGHT' && m.isBaileys && text.startsWith('.w ')) {
      try {
        const [, action, targetIndexStr] = text.split(' ');
        const targetIndex = parseInt(targetIndexStr) - 1;
        const livingPlayers = Object.values(gameState.pemain).filter((p) => p.isAlive);
        if (isNaN(targetIndex) || targetIndex < 0 || targetIndex >= livingPlayers.length) throw new Error('Nomor target tidak valid.');
        const targetPlayer = livingPlayers[targetIndex];
        if (action === 'kill' && playerState.role === 'werewolf') {
          gameState.aksiMalam.pilihanWerewolf = targetPlayer.id;
          await sReply(`Kamu memilih untuk membunuh @${targetPlayer.id.split('@')[0]}.`);
        } else if (action === 'see' && playerState.role === 'seer') {
          gameState.aksiMalam.pilihanSeer = targetPlayer.id;
          await sReply(`Kamu melihat peran @${targetPlayer.id.split('@')[0]}. Dia adalah seorang *${targetPlayer.role}* ${emoji_role(targetPlayer.role)}.`);
        } else if (action === 'protect' && playerState.role === 'guardian') {
          gameState.aksiMalam.pilihanGuardian = targetPlayer.id;
          await sReply(`Kamu melindungi @${targetPlayer.id.split('@')[0]} malam ini.`);
        } else if (action === 'check' && playerState.role === 'sorcerer') {
          gameState.aksiMalam.pilihanSorcerer = targetPlayer.id;
          await sReply(`Kamu memeriksa @${targetPlayer.id.split('@')[0]}. Dia adalah seorang *${targetPlayer.role}* ${emoji_role(targetPlayer.role)}.`);
        }
        await user.addXp();
        await performanceManager.cache.updateUserStats(user.userId, counthits);
      } catch (error) {
        await sReply(error.message);
      }
      return true;
    }
    if (gameState.status === 'VOTING' && text.startsWith('.vote ')) {
      try {
        const targetIndexStr = text.split(' ')[1];
        const targetIndex = parseInt(targetIndexStr) - 1;
        const livingPlayers = Object.values(gameState.pemain).filter((p) => p.isAlive);
        if (isNaN(targetIndex) || targetIndex < 0 || targetIndex >= livingPlayers.length) throw new Error('Nomor target tidak valid.');
        const targetPlayer = livingPlayers[targetIndex];
        if (targetPlayer.id === serial) throw new Error('Kamu tidak bisa vote diri sendiri.');
        gameState.votes[serial] = targetPlayer.id;
        await user.addXp();
        await performanceManager.cache.updateUserStats(user.userId, counthits);
      } catch (error) {
        await sReply(error.message);
      }
      return true;
    }
  }
  if (tictactoeSessions[toId] && !isCmd) {
    const counthits = { $inc: { userCount: 1 } };
    const gameState = tictactoeSessions[toId];
    const playerMove = parseInt(m.body?.toLowerCase()?.trim());
    if (serial !== gameState.playerJid) return true;
    const stopKeywords = ['stop', 'berhenti', 'menyerah', 'stoptictactoe'];
    const startTTTTimeout = (idGroup) => {
      const gameDuration = 3 * 60 * 1000;
      const timeoutCallback = () => {
        if (tictactoeSessions[idGroup]) {
          delete tictactoeSessions[idGroup];
        }
      };
      tictactoeSessions[idGroup].timeoutId = setTimeout(timeoutCallback, gameDuration);
    };
    if (stopKeywords.includes(m.body?.toLowerCase()?.trim())) {
      clearTimeout(gameState.timeoutId);
      delete tictactoeSessions[toId];
      await sReply('Permainan Tic-Tac-Toe dihentikan.');
      await user.addXp();
      await performanceManager.cache.updateUserStats(user.userId, counthits);
      return true;
    }
    if (gameState.turn !== 'player') return true;
    if (isNaN(playerMove) || playerMove < 1 || playerMove > 9) return true;
    const row = Math.floor((playerMove - 1) / 3);
    const col = (playerMove - 1) % 3;
    if (gameState.board[row][col]) {
      await sReply('Kotak itu sudah terisi! Pilih kotak lain.');
      return true;
    }
    clearTimeout(gameState.timeoutId);
    gameState.board[row][col] = gameState.playerSymbol;
    gameState.turn = 'bot';
    let winner = checkWinner(gameState.board);
    if (winner) {
      let endText = winner === 'draw' ? 'Permainan berakhir SERI!\n' : `Selamat, Kamu MENANG!\n`;
      endText += formatTicTacToeBoard(gameState.board);
      await sReply(endText);
      delete tictactoeSessions[toId];
      await user.addXp();
      await performanceManager.cache.updateUserStats(user.userId, counthits);
      return true;
    }
    await sReply('Langkah Kamu diterima. Bot sedang berpikir...');
    await delay(1000);
    let botMove = null;
    for (const symbol of [gameState.botSymbol, gameState.playerSymbol]) {
      if (botMove) break;
      for (let i = 0; i < 3; i++) {
        if (botMove) break;
        for (let j = 0; j < 3; j++) {
          if (!gameState.board[i][j]) {
            gameState.board[i][j] = symbol;
            if (checkWinner(gameState.board) === symbol) botMove = { row: i, col: j };
            gameState.board[i][j] = '';
            if (botMove) break;
          }
        }
      }
    }
    if (!botMove) {
      if (!gameState.board[1][1]) botMove = { row: 1, col: 1 };
      else {
        const corners = [
          { row: 0, col: 0 },
          { row: 0, col: 2 },
          { row: 2, col: 0 },
          { row: 2, col: 2 }
        ];
        const emptyCorners = corners.filter((c) => !gameState.board[c.row][c.col]);
        if (emptyCorners.length > 0) botMove = emptyCorners[Math.floor(Math.random() * emptyCorners.length)];
        else {
          const sides = [
            { row: 0, col: 1 },
            { row: 1, col: 0 },
            { row: 1, col: 2 },
            { row: 2, col: 1 }
          ];
          const emptySides = sides.filter((s) => !gameState.board[s.row][s.col]);
          if (emptySides.length > 0) botMove = emptySides[Math.floor(Math.random() * emptySides.length)];
        }
      }
    }
    if (botMove) {
      gameState.board[botMove.row][botMove.col] = gameState.botSymbol;
    }
    let updateText = `Bot menempatkan 'O' di kotak ${botMove.row * 3 + botMove.col + 1}.\n\nGiliran Kamu!\n`;
    updateText += formatTicTacToeBoard(gameState.board);
    await sReply(updateText);
    winner = checkWinner(gameState.board);
    if (winner) {
      let endText = winner === 'draw' ? 'Permainan berakhir SERI!\n' : `Maaf, Bot MENANG!\n`;
      endText += formatTicTacToeBoard(gameState.board);
      await sReply(endText);
      delete tictactoeSessions[toId];
      await user.addXp();
      await performanceManager.cache.updateUserStats(user.userId, counthits);
      return true;
    }
    gameState.turn = 'player';
    startTTTTimeout(toId);
    return true;
  }
  if (ularTanggaSessions[toId] && !isCmd) {
    const counthits = { $inc: { userCount: 1 } };
    const startUlarTanggaTimeout = (idGroup) => {
      const gameDuration = 3 * 60 * 1000;
      const timeoutCallback = () => {
        if (ularTanggaSessions[idGroup]) {
          delete ularTanggaSessions[idGroup];
        }
      };
      if (ularTanggaSessions[idGroup]) {
        ularTanggaSessions[idGroup].timeoutId = setTimeout(timeoutCallback, gameDuration);
      }
    };
    const gameState = ularTanggaSessions[toId];
    const messageText = m.body?.toLowerCase()?.trim();
    if (serial !== gameState.playerJid) return true;
    const stopKeywords = ['stop', 'berhenti', 'menyerah', 'stopular'];
    if (stopKeywords.includes(messageText)) {
      clearTimeout(gameState.timeoutId);
      delete ularTanggaSessions[toId];
      await sReply('Sesi Ular Tangga berhasil dihentikan.');
      await user.addXp();
      await performanceManager.cache.updateUserStats(user.userId, counthits);
      return true;
    }
    if (gameState.turn !== 'player') return true;
    if (messageText === 'lempar' || messageText === 'roll') {
      clearTimeout(gameState.timeoutId);
      const dice1 = Math.floor(Math.random() * 6) + 1;
      const dice2 = Math.floor(Math.random() * 6) + 1;
      const totalMove = dice1 + dice2;
      const isDouble = dice1 === dice2;
      let playerText = `Kamu melempar dadu dan mendapat 🎲(${dice1}) + 🎲(${dice2}) = *${totalMove}*.\n`;
      const oldPos = gameState.playerPos;
      gameState.playerPos += totalMove;
      playerText += `Kamu maju dari kotak *${oldPos}* ke *${gameState.playerPos}*.\n`;
      const board = gameState.board;
      if (board.ladders[gameState.playerPos]) {
        const targetPos = board.ladders[gameState.playerPos];
        playerText += `Kamu mendarat di tangga! 🪜 Kamu naik ke kotak *${targetPos}*.\n`;
        gameState.playerPos = targetPos;
      } else if (board.snakes[gameState.playerPos]) {
        const targetPos = board.snakes[gameState.playerPos];
        playerText += `Kamu mendarat di ular! 🐍 Kamu turun ke kotak *${targetPos}*.\n`;
        gameState.playerPos = targetPos;
      }
      if (gameState.playerPos >= board.size) {
        playerText += `\n🎉 Selamat, Kamu mencapai garis finis dan MENANG!`;
        await sReply(playerText);
        delete ularTanggaSessions[toId];
        await user.addXp();
        await performanceManager.cache.updateUserStats(user.userId, counthits);
        return true;
      }
      if (isDouble) {
        playerText += `\nAnda mendapat angka kembar! Lempar dadu lagi.`;
        startUlarTanggaTimeout(toId);
      } else {
        playerText += `\nSekarang giliran Bot...`;
        gameState.turn = 'bot';
        setTimeout(() => runBotUlarTanggaTurn(toId, m, fn, ularTanggaSessions), 2000);
      }
      await sReply(playerText);
      await user.addXp();
      await performanceManager.cache.updateUserStats(user.userId, counthits);
    }
    return true;
  }
  if (minesweeperSessions[toId] && !isCmd) {
    const counthits = { $inc: { userCount: 1 } };
    const gameState = minesweeperSessions[toId];
    const messageText = m.body?.toLowerCase()?.trim();
    const parts = messageText.split(' ');
    const action = parts[0];
    const coord = parts[1];
    const startMinesweeperTimeout = (idGroup) => {
      const gameDuration = 10 * 60 * 1000;
      const timeoutCallback = () => {
        if (minesweeperSessions[idGroup]) {
          delete minesweeperSessions[idGroup];
        }
      };
      minesweeperSessions[idGroup].timeoutId = setTimeout(timeoutCallback, gameDuration);
    };
    if (serial !== gameState.playerJid || gameState.gameStatus !== 'playing') return true;
    if (!['buka', 'tandai', 'batal', 'stop', 'menyerah'].includes(action) || (action !== 'stop' && action !== 'menyerah' && !coord)) return true;
    clearTimeout(gameState.timeoutId);
    if (action === 'stop' || action === 'menyerah') {
      delete minesweeperSessions[toId];
      await user.addXp();
      await performanceManager.cache.updateUserStats(user.userId, counthits);
      await sReply('Permainan Minesweeper dihentikan.');
      return true;
    }
    const col = coord.charCodeAt(0) - 97;
    const row = parseInt(coord.slice(1)) - 1;
    if (row < 0 || row >= gameState.playerBoard.length || col < 0 || col >= gameState.playerBoard[0].length) {
      startMinesweeperTimeout(toId);
      await sReply('Koordinat tidak valid.');
      return true;
    }
    if (action === 'buka') {
      if (gameState.playerBoard[row][col].status === 'terbuka') {
        startMinesweeperTimeout(toId);
        await user.addXp();
        await performanceManager.cache.updateUserStats(user.userId, counthits);
        await sReply('Kotak itu sudah terbuka.');
        return true;
      }
      if (gameState.playerBoard[row][col].status === 'ditandai') {
        startMinesweeperTimeout(toId);
        await user.addXp();
        await performanceManager.cache.updateUserStats(user.userId, counthits);
        await sReply("Kotak ini ditandai dengan bendera. Gunakan 'batal' terlebih dahulu jika ingin membukanya.");
        return true;
      }
      if (gameState.solutionBoard[row][col] === '*') {
        gameState.gameStatus = 'lost';
        const finalBoard = formatMinesweeperBoard(gameState.playerBoard, true, gameState.solutionBoard);
        await sReply('💣 BOOM! Kamu menginjak bom. Game Selesai.\n' + finalBoard);
        delete minesweeperSessions[toId];
        await user.addXp();
        await performanceManager.cache.updateUserStats(user.userId, counthits);
        return true;
      }
      revealCell(row, col, gameState);
      if (checkWinCondition(gameState)) {
        gameState.gameStatus = 'won';
        const finalBoard = formatMinesweeperBoard(gameState.playerBoard, true, gameState.solutionBoard);
        await sReply('🎉 Selamat! Kamu menemukan semua bom dan MEMENANGKAN permainan!\n' + finalBoard);
        delete minesweeperSessions[toId];
        await user.addXp();
        await performanceManager.cache.updateUserStats(user.userId, counthits);
        return true;
      }
    } else if (action === 'tandai') {
      if (gameState.playerBoard[row][col].status === 'tertutup') {
        gameState.playerBoard[row][col] = { status: 'ditandai', value: '' };
      }
    } else if (action === 'batal') {
      if (gameState.playerBoard[row][col].status === 'ditandai') {
        gameState.playerBoard[row][col] = { status: 'tertutup', value: '' };
      }
    }
    await sReply('Langkah diterima:\n' + formatMinesweeperBoard(gameState.playerBoard));
    startMinesweeperTimeout(toId);
    await user.addXp();
    await performanceManager.cache.updateUserStats(user.userId, counthits);
    return true;
  }
  if (quotedMsg && /^Berapa hasil dari/i.test(quotedMsg.body)) {
    const counthits = { $inc: { userCount: 1 } };
    if (toId in gamematematika && quotedMsg?.id === gamematematika[toId]?.[0]?.key?.id) {
      const userAnswer = parseInt(body.trim());
      if (isNaN(userAnswer)) {
        await user.addXp();
        await performanceManager.cache.updateUserStats(user.userId, counthits);
        return true;
      }
      const math = gamematematika[toId][1];
      if (userAnswer === math.result) {
        await sReply(`*Jawaban Benar!*\nSelamat kamu mendapatkan ${math.bonus} saldo`);
        await user.addBalance(math.bonus);
        clearTimeout(gamematematika[toId][3]);
        delete gamematematika[toId];
        await user.addXp();
        await performanceManager.cache.updateUserStats(user.userId, counthits);
        return true;
      } else {
        if (--gamematematika[toId][2] === 0) {
          await sReply(`*Kesempatan habis!*\nJawaban: *${math.result}*`);
          clearTimeout(gamematematika[toId][3]);
          delete gamematematika[toId];
          await user.addXp();
          await performanceManager.cache.updateUserStats(user.userId, counthits);
          return true;
        } else {
          await user.addXp();
          await performanceManager.cache.updateUserStats(user.userId, counthits);
          await sReply(`*Jawaban Salah!*\nMasih ada ${gamematematika[toId][2]} kesempatan`);
          return true;
        }
      }
    } else {
      await sReply(`Soal itu sudah berakhir`);
      await user.addXp();
      await performanceManager.cache.updateUserStats(user.userId, counthits);
      return true;
    }
  }
  if (quotedMsg && /^Tebak kuis berikut ini/i.test(quotedMsg.body)) {
    const counthits = { $inc: { userCount: 1 } };
    const addStat = async () => {
      await user.addXp();
      await performanceManager.cache.updateUserStats(user.userId, counthits);
    };
    if (toId in family100 && quotedMsg?.id === family100[toId]?.[6]?.key?.id) {
      const [, jawaban, status, contribs, timeout] = family100[toId];
      const userAnswer = txt.toLowerCase().trim();
      const total = 600;
      const scorePerJawaban = Math.floor(total / jawaban.length);
      const bagiSaldo = async () => {
        let teks = '';
        let hadiahFinal = 0;
        const allPlayerJIDs = Array.from(new Set([...Object.keys(contribs.benar), ...Object.keys(contribs.salah)]));
        if (allPlayerJIDs.length === 0) {
          return '\nTidak ada pemain yang berpartisipasi.\n';
        }
        const playerDocs = await User.find({ userId: { $in: allPlayerJIDs } });
        for (const playerDoc of playerDocs) {
          const userId = playerDoc.userId;
          const benar = contribs.benar[userId] || 0;
          const salah = contribs.salah[userId] || 0;
          const net = Math.max(benar * scorePerJawaban - salah * scorePerJawaban, 0);
          if (net > 0) {
            await playerDoc.addBalance(net);
          }
          teks += `• @${userId.split('@')[0]} ➜ +${net} saldo (✅${benar} ❎${salah})\n`;
          hadiahFinal += net;
        }
        const sisa = total - hadiahFinal;
        teks += `\n💰 *Total Hadiah Dibagikan:* ${hadiahFinal}\n`;
        if (sisa > 0) teks += `🎁 *Sisa Tidak Terbagi:* ${sisa}\n`;
        return teks;
      };
      if (/^(menyerah|giveup)$/i.test(userAnswer)) {
        clearTimeout(timeout);
        const benarCount = status.filter(Boolean).length;
        let teks = `📢 Game *Family100* dihentikan oleh pemain.\n\n`;
        if (benarCount > 0) teks += await bagiSaldo();
        const belum = jawaban.map((j, i) => (status[i] ? null : `❎ ${j}`)).filter(Boolean);
        if (belum.length) {
          teks += `\n❗ *Jawaban yang belum tertebak:*\n${belum.join('\n')}`;
        }
        delete family100[toId];
        await fn.sendPesan(toId, teks, { ephemeralExpiration: m.expiration ?? 0 });
        addStat();
        return true;
      }
      const idx = jawaban.findIndex((j, i) => j.toLowerCase() === userAnswer && !status[i]);
      if (idx >= 0) {
        status[idx] = true;
        contribs.benar[serial] = (contribs.benar[serial] || 0) + 1;
        await sReply(`✅ Jawaban *${jawaban[idx]}* benar!\n📊 Progress: ${status.filter(Boolean).length}/${jawaban.length}`);
        if (status.every(Boolean)) {
          clearTimeout(timeout);
          let teks = `🎉 Semua jawaban ditemukan!\n\n🏆 *Total Hadiah Awal:* ${total}\n`;
          teks += await bagiSaldo();
          delete family100[toId];
          await fn.sendPesan(toId, teks, { ephemeralExpiration: m.expiration ?? 0 });
          addStat();
          return true;
        }
      } else if (jawaban.findIndex((j) => j.toLowerCase() === userAnswer) >= 0) {
        await sReply(`⚠️ Jawaban *${txt}* sudah ditebak oleh pemain lain.\n📊 Progress: ${status.filter(Boolean).length}/${jawaban.length}`, m);
      } else {
        contribs.salah[serial] = (contribs.salah[serial] || 0) + 1;
        await sReply(`❎ Jawaban *${txt}* tidak ada.\n📊 Progress: ${status.filter(Boolean).length}/${jawaban.length}\n\nBalas *menyerah* jika ingin menyerah.`);
      }
      addStat();
      return true;
    } else {
      await sReply('Soal itu sudah berakhir atau tidak valid.');
      addStat();
      return true;
    }
  }
  if (sudokuGame[toId] && sudokuGame[toId].player === serial && !isCmd) {
    const counthits = { $inc: { userCount: 1 } };
    const gameState = sudokuGame[toId];
    const messageText = m.body?.toLowerCase().trim();
    try {
      if (messageText === 'menyerah') {
        const solutionBoardBuffer = await generateSudokuBoardImage(gameState.puzzle, gameState.solution);
        await sReply({ image: solutionBoardBuffer, caption: 'Baiklah, game telah dihentikan. Ini adalah jawaban yang benar.' });
        await performanceManager.cache.updateUserStats(user.userId, counthits);
        clearTimeout(gameState.timeoutId);
        delete sudokuGame[toId];
        return true;
      }
      if (messageText === 'cek') {
        const errorIndices = [];
        let isFull = true;
        for (let i = 0; i < 81; i++) {
          if (gameState.puzzle[i] === null) {
            if (gameState.board[i] === null) {
              isFull = false;
            } else if (gameState.board[i] !== gameState.solution[i]) {
              errorIndices.push(i);
            }
          }
        }
        if (errorIndices.length > 0) {
          const boardBuffer = await generateSudokuBoardImage(gameState.puzzle, gameState.board, errorIndices);
          await sReply({ image: boardBuffer, caption: `🤔 Ditemukan ${errorIndices.length} angka yang salah dan ditandai dengan warna merah. Coba perbaiki!` });
        } else if (isFull) {
          await sReply('🎉 *Luar Biasa!* 🎉\n\nSemua jawabanmu benar dan papan telah terisi penuh. Anda menang!');
          clearTimeout(gameState.timeoutId);
          delete sudokuGame[toId];
        } else {
          await sReply('✅ Sejauh ini semua angkamu benar. Lanjutkan mengisi!');
        }
        return true;
      }
      if (messageText === 'hint') {
        if (gameState.hintsUsed >= 3) {
          await sReply('Maaf, kamu sudah menggunakan semua jatah bantuan (3/3).');
          return true;
        }
        const emptyCells = [];
        gameState.board.forEach((cell, index) => {
          if (cell === null) emptyCells.push(index);
        });
        if (emptyCells.length === 0) {
          await sReply('Papan sudah terisi penuh, tidak ada bantuan yang bisa diberikan.');
          return true;
        }
        gameState.hintsUsed++;
        const hintsLeft = 3 - gameState.hintsUsed;
        const randomIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const solutionValue = gameState.solution[randomIndex];
        gameState.board[randomIndex] = solutionValue;
        const colLabels = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
        const rowLabels = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
        const row = Math.floor(randomIndex / 9);
        const col = randomIndex % 9;
        const coordStr = `${colLabels[col].toUpperCase()}${rowLabels[row]}`;
        const boardBuffer = await generateSudokuBoardImage(gameState.puzzle, gameState.board);
        await sReply({ image: boardBuffer, caption: `💡 *Bantuan:* Angka *${solutionValue + 1}* telah ditempatkan di *${coordStr}*.\n\nSisa bantuan: *${hintsLeft}/3*` });
        return true;
      }
      const moveRegex = /^([a-i][1-9])\s+([0-9])$/i;
      const match = messageText.match(moveRegex);
      if (match) {
        clearTimeout(gameState.timeoutId);
        const gameDuration = 5 * 60 * 1000;
        const newTimeoutCallback = () => {
          if (sudokuGame[toId]) delete sudokuGame[toId];
        };
        gameState.timeoutId = setTimeout(newTimeoutCallback, gameDuration);
        const coord = match[1];
        const value = parseInt(match[2], 10);
        const index = parseSudokuCoord(coord);
        if (index === null) throw new Error('Koordinat tidak valid. Gunakan a1 - i9.');
        if (gameState.puzzle[index] !== null) throw new Error('Kotak ini adalah bagian dari puzzle dan tidak bisa diubah.');
        let replyCaption = '';
        if (value === 0) {
          gameState.board[index] = null;
          replyCaption = `🗑️ Angka di *${coord.toUpperCase()}* berhasil dihapus.`;
        } else {
          gameState.board[index] = value - 1;
          replyCaption = `✅ Angka *${value}* berhasil diletakkan di *${coord.toUpperCase()}*.`;
        }
        const boardBuffer = await generateSudokuBoardImage(gameState.puzzle, gameState.board);
        await sReply({ image: boardBuffer, caption: replyCaption });
        if (value !== 0 && !gameState.board.includes(null)) {
          const isSolved = JSON.stringify(gameState.board) === JSON.stringify(gameState.solution);
          if (isSolved) {
            await sReply('🎉 *Luar Biasa!* 🎉\n\nPapan sudah terisi penuh dan semua jawabanmu BENAR! Anda berhasil menyelesaikan puzzle ini!');
          } else {
            const errorIndices = [];
            for (let i = 0; i < 81; i++) {
              if (gameState.puzzle[i] === null && gameState.board[i] !== gameState.solution[i]) {
                errorIndices.push(i);
              }
            }
            const errorBoardBuffer = await generateSudokuBoardImage(gameState.puzzle, gameState.board, errorIndices);
            await sReply({ image: errorBoardBuffer, caption: 'Papan sudah penuh, namun masih ada jawaban yang salah (ditandai merah).' });
          }
          await user.addXp();
          await performanceManager.cache.updateUserStats(user.userId, counthits);
          clearTimeout(gameState.timeoutId);
          delete sudokuGame[toId];
        }
        return true;
      }
    } catch (error) {
      await sReply(error.message);
      return true;
    }
  }
  if (chatBots[serial] && !isCmd) {
    clearTimeout(chatBots[serial]);
    chatBots[serial] = setTimeout(() => {
      delete chatBots[serial];
    }, SESSION_TIMEOUT);

    const userMessage = body.trim();
    const imageRequestRegex = /\b(gambar|lukiskan)\b/i;

    if (imageRequestRegex.test(userMessage)) {
      const promptForImage = userMessage.replace(imageRequestRegex, '').trim();
      const genAI = new GoogleGenerativeAI(config.geminiApikey);
      const model = genAI.getGenerativeModel({
        generationConfig: { responseModalities: ['Text', 'Image'] },
        model: 'gemini-2.0-flash-exp-image-generation',
        safetySettings
      });

      const result = await model.generateContent(promptForImage);
      const response = result.response;
      const parts = response.candidates?.[0]?.content?.parts;

      if (!parts) {
        const feedback = response.text();
        await sReply(`AI tidak menghasilkan output yang valid. Feedback: ${feedback || 'Tidak ada feedback.'}`);
        return true;
      }

      let imageGenerated = false;
      for (const part of parts) {
        if (part.inlineData) {
          await fn.sendMediaFromBuffer(toId, 'image/jpeg', Buffer.from(part.inlineData.data, 'base64'), dbSettings.autocommand, m);
          imageGenerated = true;
          break;
        }
      }

      if (!imageGenerated) {
        await sReply('Gagal membuat gambar. Respons dari AI tidak mengandung data gambar.');
      }
      return true;
    } else {
      const session = getSession(serial, sessions);
      if (!session) {
        await sReply('Maaf, sesi chatbot sedang bermasalah. Coba `.chatbot off` lalu `.chatbot on` lagi.');
        return true;
      }
      const cleanupListeners = () => {
        session.emitter.removeListener('message', messageListener);
        session.emitter.removeListener('error_message', errorListener);
        clearTimeout(timeoutHandler);
      };

      const messageListener = async (reply) => {
        cleanupListeners();
        try {
          const obj = JSON.parse(reply);
          await sReply(obj.assistant);
        } catch {
          await sReply(reply);
        }
      };

      const errorListener = async (errorMsg) => {
        cleanupListeners();
        await sReply(`[AI ERROR]\n${errorMsg}`);
      };

      const timeoutHandler = setTimeout(async () => {
        cleanupListeners();
        await sReply('Maaf, AI tidak merespons dalam waktu yang ditentukan. Coba lagi.');
      }, 90000);

      session.emitter.on('message', messageListener);
      session.emitter.on('error_message', errorListener);
      session.py.stdin.write(userMessage + '\n');
      return true;
    }
  }
  return false;
}
