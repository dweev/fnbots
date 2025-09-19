// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info Logger.js ──────────────────────

import pino from 'pino';
import path from 'path';
import process from 'process';
import util from 'util';

const logFilePath = path.join(process.cwd(), 'logs');
const blockedKeywords = [
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
];

export const appLogger = pino(pino.transport({
  targets: [
    {
      level: 'info',
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:dd-mm-yyyy HH:MM:ss',
        ignore: 'pid,hostname',
      }
    },
    {
      level: 'info',
      target: 'pino-roll',
      options: {
        file: path.join(logFilePath, 'app_activity.log'),
        frequency: 'daily',
        size: '10M',
        mkdir: true,
      },
    },
  ],
}));
export const pinoLogger = pino(pino.transport({
  targets: [
    {
      level: 'info',
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:dd-mm-yyyy HH:MM:ss',
        ignore: 'pid,hostname',
      }
    },
    {
      level: 'info',
      target: 'pino-roll',
      options: {
        file: path.join(logFilePath, 'baileys.log'),
        frequency: 'daily',
        size: '10M',
        mkdir: true,
      },
    },
  ],
}));
export default async function log(message, isError = false) {
  const inspectedMessage = util.inspect(message);
  if (blockedKeywords.some(keyword => inspectedMessage.includes(keyword))) {
    return;
  }
  if (isError) {
    if (message instanceof Error) {
      appLogger.error(message);
    } else {
      const textMessage = typeof message === 'string' ? message : util.inspect(message, { depth: null });
      appLogger.error(textMessage);
    }
  } else {
    const textMessage = typeof message === 'string' ? message : util.inspect(message, { depth: null });
    appLogger.info(textMessage);
  }
}

console.log = (...args) => log(args.map(a => util.inspect(a, { depth: 1 })).join(" "));
console.info = (...args) => log(args.map(a => util.inspect(a, { depth: 1 })).join(" "));
console.warn = (...args) => log(args.map(a => util.inspect(a, { depth: 1 })).join(" "), true);
console.error = (...args) => log(args.map(a => util.inspect(a, { depth: 1 })).join(" "), true);