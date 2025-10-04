// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info config.js ──────────────────────

import 'dotenv/config.js';

const requiredVariables = ['MONGODB_URI', 'OWNER_NUMBER'];
for (const variable of requiredVariables) {
  if (!process.env[variable]) {
    throw new Error(`Error: Variabel lingkungan '${variable}' tidak ditemukan di .env.`);
  }
}

const config = {
  openWather: process.env.OPENWEATHER_API_KEY,
  huggigFace: process.env.HUGGINGFACE_API_KEY,
  geminiApikey: process.env.GEMINI_API_KEY,
  mongodbUri: process.env.MONGODB_URI,
  ownerNumber: JSON.parse(process.env.OWNER_NUMBER),
  botNumber: process.env.BOT_NUMBER || '',
  usePairingCode: false,
  commandCategories: [
    'master', 'owner', 'bot', 'vip', 'premium', 'manage', 'media',
    'convert', 'audio', 'text', 'image', 'ai', 'anime', 'fun',
    'ngaji', 'game', 'stateless', 'statefull', 'pvpgame', 'math',
    'util', 'list'
  ],
  localPrefix: 'local-file://',
  performance: {
    groupCooldownMS: 5 * 60 * 1000,
    axiosTimeout: 10000,
    maxContentLength: 5 * 1024 * 1024,
    fifteenDays: 15 * 24 * 60 * 60 * 1000,
    inviteExpiration: 3 * 86400000,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    defaultInterval: 60000,
    defaultTimeoutMs: 15000,
    maxStoreSaved: 10000,
    pollingInterval: 1000,
    maxReconnectAttemps: 5,
    reconnectDelay: 6000,
    maxAgeHours: 60 * 60 * 1000,
    maxFileSize: 100 * 1024 * 1024,
    checkMemoryUsageInterval: 300000,
    connectTimeoutMs: 60000,
    qrTimeout: 60000,
    keepAliveIntervals: 6000,
    aliveInterval: 6000,
    commandCooldown: 25,
    cooldownReset: 6000,
    spamDuration: 15000,
    banDuration: 900000,
    cacheTTL: 7 * 24 * 60 * 60 * 1000,
    cacheCleanup: 60 * 60 * 1000,
    acquireMutexInterval: 6000,
    maxCacheSize: {
      groups: 100,
      contacts: 5000
    }
  },
  paths: {
    stickerConvertPath:     'venv/bin/sticker-convert',
    ffmpeg:                 '/usr/bin/ffmpeg',
    ffprobe:                '/usr/bin/ffprobe',
    pythonPath:             'venv/bin/python3',
    ytDlpPath:              'venv/bin/yt-dlp',
    databaseMedia:          'media',
    logsDir:                'logs',
    pyScript:               'src/utils/chat_bot.py',
    g4f:                    'src/utils/py-g4f.py',
    rembege:                'src/utils/rembege.py',
    rank:                   'src/media/rank.png',
    avatar:                 'src/media/apatar.png',
    vanya:                  'src/media/hi.oga',
    basePath:               'src/games/images/map/',
    pionImagesPath:         'src/games/images/',
    stickerDir:             'src/sampah/sticker',
    dice:                   'src/games/images/dice',
    tempDir:                'src/sampah',
    board:                  'src/games/ludo/ludo_board.jpg',
    pawns: {
      RED:                  'src/games/ludo/pion_merah.png',
      GREEN:                'src/games/ludo/pion_hijau.png',
      YELLOW:               'src/games/ludo/pion_kuning.png',
      BLUE:                 'src/games/ludo/pion_biru.png'
    },
  },
  security: {
    networkFamily: 4,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
  },
  logger: {
    blockedKeywords: [
      "WARNING: Expected pubkey of length 33, please report the ST and client that generated the pubkey",
      "Unhandled bucket type (for naming):",
      "Closing stale open session for new outgoing prekey bundle",
      "Closing open session in favor of incoming prekey bundle",
      "Failed to decrypt message with any known session...",
      "Session error:",
      "Decrypted message with closed session.",
      "V1 session storage migration error: registrationId",
      "Migrating session to:",
      "Session already closed",
      "Session already open",
      "Removing old closed session:",
      "Closing session:"
    ]
  }
};

export default config;