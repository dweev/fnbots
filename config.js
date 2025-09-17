// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info config.js ──────────────────────

import 'dotenv/config';

const getBoolean = (value) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

const requiredVariables = ['MONGODB_URI', 'OWNER_NUMBER', 'COMMAND_CATEGORIES'];
for (const variable of requiredVariables) {
  if (!process.env[variable]) {
    throw new Error(`Error: Variabel lingkungan '${variable}' tidak ditemukan di .env.`);
  }
}

const config = {
  mongodbUri: process.env.MONGODB_URI,
  ownerNumber: JSON.parse(process.env.OWNER_NUMBER),
  botNumber: process.env.BOT_NUMBER || '',
  usePairingCode: getBoolean(process.env.PAIRING_CODE) || false,
  commandCategories: process.env.COMMAND_CATEGORIES.split(','),
  restartAttempts: parseInt(process.env.RESTART_ATTEMPTS, 10) || 0,
};

export default config;