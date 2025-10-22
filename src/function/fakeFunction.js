// ─── Info ────────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── info src/function/fakeFunction.js ───────────────

import { delay } from 'baileys';
import log from '../lib/logger.js';
import { tmpDir } from '../lib/tempManager.js';
import { QuoteGenerator } from 'qc-generator-whatsapp';
import { formatTimestampToHourMinute } from './index.js';

export async function processAllTextFormatting(rawText, store, fn) {
  const combinedRegex = /@(\d{5,})|\*([^*]+)\*|_([^_]+)_|`([^`]+)`|\b((https?:\/\/|www\.)[^\s]+\/[^\s]*)/g;
  const matches = [];
  let match;
  while ((match = combinedRegex.exec(rawText)) !== null) {
    let type, replacementText;
    const originalText = match[0];
    if (match[1]) {
      type = 'mention';
      const jid = match[1] + "@s.whatsapp.net";
      const contact = await store.getContact(jid);
      const fallbackMentionName = await fn.getName(jid);
      replacementText = "@" + (contact?.name || fallbackMentionName || "Unknown?");
    } else if (match[2]) {
      type = 'bold';
      replacementText = match[2];
    } else if (match[3]) {
      type = 'italic';
      replacementText = match[3];
    } else if (match[4]) {
      type = 'code';
      replacementText = match[4];
    } else if (match[5]) {
      type = 'code';
      replacementText = match[0];
    } else {
      continue;
    }
    matches.push({
      index: match.index,
      type: type,
      originalText: originalText,
      replacementText: replacementText,
    });
  }
  let finalCleanText = "";
  let lastIndex = 0;
  const allEntities = [];
  matches.forEach(m => {
    finalCleanText += rawText.substring(lastIndex, m.index);
    const entityStartOffset = finalCleanText.length;
    finalCleanText += m.replacementText;
    allEntities.push({
      type: m.type,
      offset: entityStartOffset,
      length: m.replacementText.length,
    });
    lastIndex = m.index + m.originalText.length;
  });
  finalCleanText += rawText.substring(lastIndex);
  return { text: finalCleanText, entities: allEntities };
}

export const colorNameMap = {
  'merah':  '#F44336',
  'pink':   '#E91E63',
  'ungu':   '#9C27B0',
  'biru':   '#2196F3',
  'indigo': '#3F51B5',
  'toska':  '#009688',
  'hijau':  '#8BC34A',
  'kuning': '#FFEB3B',
  'oranye': '#FF9800',
  'putih':  '#FFFFFF',
  'hitam':  '#000000',
  'abu':    '#424242'
};

export function getContrastColor(hexColor) {
  if (!hexColor || typeof hexColor !== 'string') return '#FFFFFF';
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
  return luminance > 140 ? '#000000' : '#FFFFFF';
}

export async function generateFakeChatWithQCGenerator(m, count, fn, store) {
  const jid = m.key.remoteJid;
  const sReply = (content, options = {}) => fn.sendReply(jid, content, { quoted: m, ...options });
  try {
    const chatData = await store.getConversations(jid, count);
    if (!chatData || chatData.length === 0) throw new Error("Tidak ada percakapan yang tersimpan untuk chat ini.");
    const filteredChats = chatData.filter(c => c.keyId !== m.key.id).filter(c => !c.text || !c.text.includes('sschat'));
    const selectedChats = filteredChats.slice(-count);
    if (selectedChats.length === 0) throw new Error("Tidak ada percakapan yang bisa diambil.");
    const defaultAvatar = null;
    const messages = [];
    const tempAvatars = [];
    for (let i = 0; i < selectedChats.length; i++) {
      await delay(500);
      const msg = selectedChats[i];
      const senderJid = msg.sender;
      const senderContact = await store.getContact(senderJid);
      const fallbackName = await fn.getName(senderJid);
      const senderName = senderContact?.name || msg.name || fallbackName || "Mukidi Slamet";
      let avatarBuffer;
      try {
        avatarBuffer = await fn.profileImageBuffer(senderJid, 'image');
      } catch {
        avatarBuffer = defaultAvatar;
      }
      tempAvatars.push(avatarBuffer);
      const { text: finalCleanText, entities: allEntities } = await processAllTextFormatting(
        msg.text || '',
        store,
        fn
      );
      const messageObj = {
        entities: allEntities,
        avatar: true,
        from: {
          time: formatTimestampToHourMinute(msg.timestamp),
          number: "+" + senderJid.split('@')[0],
          id: senderJid.split('@')[0],
          photo: { buffer: avatarBuffer },
          name: senderName,
          first_name: senderName.split(' ')[0] || senderName
        },
        text: finalCleanText
      };
      if (msg.quoted && msg.quotedSender) {
        const quotedContact = await store.getContact(msg.quotedSender);
        const fallbackQuotedName = await fn.getName(msg.quotedSender);
        const quotedSenderName = quotedContact?.name || fallbackQuotedName || "Yanto Baut";
        const { text: finalCleanQuotedText, entities: allQuotedEntities } = await processAllTextFormatting(
          msg.quoted || '',
          store,
          fn
        );
        messageObj.replyMessage = {
          number: "+" + msg.quotedSender.split('@')[0],
          name: quotedSenderName,
          text: finalCleanQuotedText,
          chatId: msg.quotedSender.split('@')[0],
          entities: allQuotedEntities
        };
      }
      messages.push(messageObj);
    }
    const params = {
      width: 512,
      height: 768,
      type: 'image',
      format: 'png',
      backgroundColor: '#a8dffb',
      scale: 2,
      messages
    };
    const result = await QuoteGenerator(params);
    const finalImagePath = await tmpDir.createTempFileWithContent(result.image, 'jpg');
    await fn.sendFilePath(jid, '', finalImagePath, { quoted: m });
  } catch (error) {
    await log(`Error fakeConversation:\n${error.stack || error}`, true);
    await sReply(error.message || 'Terjadi kesalahan saat membuat fake chat.');
  }
}