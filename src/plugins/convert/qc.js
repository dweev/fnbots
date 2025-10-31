// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { QuoteGenerator } from 'qc-generator-whatsapp';
import { processAllTextFormatting, formatTimestampToHourMinute } from '../../function/index.js';

export const command = {
  name: 'qc',
  category: 'convert',
  description: 'Membuat Quote Chat',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, quotedMsg, serial, arg, sReply, pushname, quotedParticipant, sendRawWebpAsSticker, store, dbSettings }) => {
    const isQuotedText = quotedMsg && (quotedMsg?.type === 'extendedTextMessage' || quotedMsg?.type === 'conversation');
    const getProfilePic = async (jid) => {
      try {
        const imageBuffer = await fn.profileImageBuffer(jid, 'image');
        return imageBuffer;
      } catch {
        return null;
      }
    };
    const processAllEntities = async (textToProcess) => {
      const { text: finalCleanText, entities: allEntities } = await processAllTextFormatting(textToProcess, store, fn);
      return { text: finalCleanText, entities: allEntities };
    };
    const params = {
      type: 'quote',
      format: 'png',
      backgroundColor: '#1a1a1a',
      width: 512,
      height: 768,
      messages: []
    };
    const message = {
      avatar: true,
      from: {},
      text: ''
    };
    if (isQuotedText) {
      const targetSender = quotedParticipant;
      const quotedText = quotedMsg?.body;
      const processedQuoted = await processAllEntities(quotedText);
      if (arg) {
        const processedArg = await processAllEntities(arg);
        message.from = {
          id: 1,
          name: pushname,
          photo: {
            buffer: await getProfilePic(serial)
          },
          number: '+' + serial.split('@')[0],
          time: formatTimestampToHourMinute(m.timestamp)
        };
        message.text = processedArg.text;
        message.entities = processedArg.entities;
        message.replyMessage = {
          chatId: 2,
          name: await fn.getName(targetSender),
          text: processedQuoted.text,
          entities: processedQuoted.entities,
          number: '+' + targetSender.split('@')[0]
        };
      } else {
        message.from = {
          id: 1,
          name: await fn.getName(targetSender),
          photo: {
            buffer: await getProfilePic(targetSender)
          },
          number: '+' + targetSender.split('@')[0],
          time: formatTimestampToHourMinute(m.timestamp)
        };
        message.text = processedQuoted.text;
        message.entities = processedQuoted.entities;
      }
    } else {
      if (arg) {
        const processedArg = await processAllEntities(arg);
        message.from = {
          id: 1,
          name: pushname,
          photo: {
            buffer: await getProfilePic(serial)
          },
          number: '+' + serial.split('@')[0],
          time: formatTimestampToHourMinute(m.timestamp)
        };
        message.text = processedArg.text;
        message.entities = processedArg.entities;
      } else {
        return await sReply('Perintah tidak lengkap. Mohon sertakan teks atau balas sebuah pesan.');
      }
    }
    params.messages.push(message);
    const result = await QuoteGenerator(params);
    const imageBuffer = Buffer.from(result.image, 'base64');
    await sendRawWebpAsSticker(imageBuffer, { packName: dbSettings.packName, authorName: dbSettings.packAuthor });
  }
};
