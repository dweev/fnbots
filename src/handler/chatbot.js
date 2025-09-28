// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Handler chatbot.js ──────────────────

import { delay } from 'baileys';
import log from '../lib/logger.js';
import config from '../../config.js';

export class ChatbotHandler {
  constructor(fn, Media, DatabaseBot) {
    this.fn = fn;
    this.Media = Media;
    this.DatabaseBot = DatabaseBot;
    this.bacotTriggers = ["bct", "bacot"];
    this.greetingTriggers = ["bot", "hi"];
    this.greetingMediaPath = config.paths.vanya;
  }
  async handle(params) {
    const { m, toId, fn, dbSettings, body, Media, DatabaseBot, sReply } = params;
    try {
      const trigger = m.body ? m.body.trim().toLowerCase() : '';
      if (!trigger) {
        return;
      }
      const [mediaResponses, dbBot] = await Promise.all([
        Media.find({ name: trigger }).lean(),
        DatabaseBot.getDatabase()
      ]);
      await this.handleBacotResponse(body, dbSettings, dbBot, sReply);
      await this.handleGreetingResponse(body, dbSettings, fn, toId, m, sReply);
      await this.handleChatResponse(trigger, dbBot, sReply);
      await this.handleMediaResponse(mediaResponses, fn, toId, m);
    } catch (error) {
      log(`Error in chatbot handler: ${error}`, true);
    }
  }
  async handleBacotResponse(body, dbSettings, dbBot, sReply) {
    try {
      if (!body) return;
      const normalizedBody = body.toLowerCase().trim();
      const prefixedBacot = [
        dbSettings.sname + "bacot",
        dbSettings.rname + "bacot"
      ];
      const isBacotTrigger = this.bacotTriggers.includes(normalizedBody) || prefixedBacot.includes(body);
      if (isBacotTrigger) {
        const randomText = dbBot.getRandomBacot();
        if (randomText) {
          await sReply(randomText);
        }
      }
    } catch (error) {
      log(`Error in bacot response: ${error}`, true);
    }
  }
  async handleGreetingResponse(body, dbSettings, fn, toId, m, sReply) {
    try {
      if (!body) return;
      const normalizedBody = body.toLowerCase().trim();
      const isGreetingTrigger = this.greetingTriggers.includes(normalizedBody);
      if (isGreetingTrigger) {
        await fn.sendFilePath(toId, 'hi.oga', this.greetingMediaPath, { quoted: m, ptt: true });
        const greetingMessage = `ada yang bisa dibantu? silakan ketik ${dbSettings.rname}commands`;
        await sReply(greetingMessage);
      }
    } catch (error) {
      log(`Error in greeting response: ${error}`, true);
      try {
        if (this.greetingTriggers.includes(body?.toLowerCase().trim())) {
          const greetingMessage = `ada yang bisa dibantu? silakan ketik ${dbSettings.rname}commands`;
          await sReply(greetingMessage);
        }
      } catch (fallbackError) {
        log(`Error in greeting fallback: ${fallbackError}`, true);
      }
    }
  }
  async handleChatResponse(trigger, dbBot, sReply) {
    try {
      const chatResponse = dbBot.getChat(trigger);
      if (chatResponse) {
        await sReply(chatResponse);
      }
    } catch (error) {
      log(`Error in chat response: ${error}`, true);
    }
  }
  async handleMediaResponse(mediaResponses, fn, toId, m) {
    try {
      for (const mediaResponse of mediaResponses) {
        if (mediaResponse && mediaResponse.data && mediaResponse.data.buffer) {
          const mediaBuffer = Buffer.from(mediaResponse.data.buffer);
          await fn.sendMediaByType(toId, mediaResponse.mime, mediaBuffer, '', m, {});
          await delay(1000);
        }
      }
    } catch (error) {
      log(`Error in media response: ${error}`, true);
    }
  }
}

export const handleChatbot = async (params) => {
  const handler = new ChatbotHandler(params.fn, params.Media, params.DatabaseBot);
  return await handler.handle(params);
};