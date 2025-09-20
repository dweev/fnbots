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
      level: 'trace',
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:dd-mm-yyyy HH:MM:ss',
        ignore: 'pid,hostname,level',
      }
    },
    {
      level: 'trace',
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
      level: 'trace',
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:dd-mm-yyyy HH:MM:ss',
        ignore: 'pid,hostname,level',
      }
    },
    {
      level: 'trace',
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
  try {
    if (message instanceof Error) {
      const errorObj = {
        name: message.name,
        message: message.message,
        stack: message.stack,
        ...Object.getOwnPropertyNames(message).reduce((acc, key) => {
          if (!['name', 'message', 'stack'].includes(key)) {
            try {
              acc[key] = message[key];
            } catch {
              acc[key] = `[unserializable:${key}]`;
            }
          }
          return acc;
        }, {})
      };
      const errorString = util.inspect(errorObj, { depth: null, colors: false });
      if (blockedKeywords.some(keyword => errorString.includes(keyword))) return;
      appLogger.error(errorString);
      return;
    }
    const inspectedMessage = typeof message === 'string' ? message : util.inspect(message, { depth: null });
    if (blockedKeywords.some(keyword => inspectedMessage.includes(keyword))) return;
    if (isError) {
      appLogger.error(inspectedMessage);
    } else {
      appLogger.info(inspectedMessage);
    }
  } catch (loggerError) {
    if (isError) {
      console.error('Logger error:', loggerError);
      if (message instanceof Error) {
        console.error(message.message);
        console.error(message.stack);
      } else {
        console.error(message);
      }
    } else {
      console.log(message);
    }
  }
}
console.log = (...args) => {
  const message = args.length === 1 ? args[0] : args;
  log(message);
};
console.info = (...args) => {
  const message = args.length === 1 ? args[0] : args;
  log(message);
};
console.error = (...args) => {
  const message = args.length === 1 ? args[0] : args;
  log(message, true);
};
console.warn = (...args) => {
  const message = args.length === 1 ? args[0] : args;
  log(message, true);
};