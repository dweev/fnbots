// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info Logger.js ──────────────────────

import pino from 'pino';
import path from 'path';
import util from 'util';
import process from 'process';
import config from '../../config.js';

const logFilePath = path.join(process.cwd(), config.paths.logsDir);
const blockedKeywords = config.logger.blockedKeywords;

class BaileysLoggerWrapper {
  constructor() {
    this.consoleLogger = pino(pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:dd-mm-yyyy HH:MM:ss',
        ignore: 'pid,hostname,level',
      }
    }));
    this.fileLogger = pino(pino.transport({
      target: 'pino-roll',
      options: {
        file: path.join(logFilePath, 'baileys.log'),
        frequency: 'daily',
        size: '10M',
        mkdir: true,
      },
    }));
    this._level = 'trace';
  }
  get level() {
    return this._level;
  }
  set level(newLevel) {
    this._level = newLevel;
    this.consoleLogger.level = newLevel;
  }
  trace(msg, ...args) {
    this.consoleLogger.trace(msg, ...args);
    this.fileLogger.trace(msg, ...args);
  }
  debug(msg, ...args) {
    this.consoleLogger.debug(msg, ...args);
    this.fileLogger.debug(msg, ...args);
  }
  info(msg, ...args) {
    this.consoleLogger.info(msg, ...args);
    this.fileLogger.info(msg, ...args);
  }
  warn(msg, ...args) {
    this.consoleLogger.warn(msg, ...args);
    this.fileLogger.warn(msg, ...args);
  }
  error(msg, ...args) {
    this.consoleLogger.error(msg, ...args);
    this.fileLogger.error(msg, ...args);
  }
  fatal(msg, ...args) {
    this.consoleLogger.fatal(msg, ...args);
    this.fileLogger.fatal(msg, ...args);
  }
  child(options) {
    const childWrapper = new BaileysLoggerWrapper();
    childWrapper._level = this._level;
    childWrapper.consoleLogger = this.consoleLogger.child(options);
    childWrapper.fileLogger = this.fileLogger.child(options);
    return childWrapper;
  }
  bind() {
    return this;
  }
}

export const pinoLogger = new BaileysLoggerWrapper();
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
export function updatePinoLoggerLevel(level) {
  pinoLogger.level = level;
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