// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info handleGroupStubMessages.js ─────

import log from './logger.js';
import { updateContact } from '../function/function.js';
import { jidNormalizedUser, WAMessageStubType } from 'baileys';
import { mongoStore, Group, OTPSession } from '../../database/index.js';

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default async function handleGroupStubMessages(fn, m) {
  if (!m.isGroup) return;
  let needsMetadataRefresh = false;
  const normalizedTarget = m.messageStubParameters?.[0];
  if (!normalizedTarget) return;
  switch (m.messageStubType) {
    case 20:
    case 27:
    case 29:
    case 30:
      needsMetadataRefresh = true;
      break;
    case 28:
    case 32:
      if (m.fromMe && (jidNormalizedUser(fn.user.id) === normalizedTarget)) return;
      needsMetadataRefresh = true;
      break;
    case 172: {
      const groupData = await Group.findOne({ groupId: m.key.remoteJid });
      if (!groupData || !groupData.verifyMember) {
        return;
      }
      const pendingParticipants = await fn.groupRequestParticipantsList(m.key.remoteJid);
      for (const request of pendingParticipants) {
        let requesterJid;
        if (request.jid.endsWith('@lid')) {
          requesterJid = request.phone_number;
        } else {
          requesterJid = request.jid;
        }
        if (groupData.isMemberBanned(requesterJid)) {
          await log(`${requesterJid} ditolak karena ada di daftar banned grup ${m.key.remoteJid}.`);
          continue;
        }
        const existingSession = await OTPSession.getSession(requesterJid);
        if (existingSession) {
          await log(`${requesterJid} sudah memiliki session OTP aktif.`);
          continue;
        }
        const otp = generateOTP();
        try {
          await OTPSession.createSession(requesterJid, m.key.remoteJid, otp);
          await fn.sendPesan(requesterJid,
            `*Kode Verifikasi Grup*\n\n` +
            `Untuk melanjutkan proses persetujuan, silakan kirim kode berikut:\n\n` +
            `*${otp}*\n\n` +
            `Kode berlaku selama 5 menit\n` +
            `Maksimal 4 kali percobaan`,
            m
          );
        } catch (error) {
          await log(`Gagal mengirim OTP ke ${requesterJid}: ${error.message}`, true);
        }
      }
      break;
    }
    default:
      if (m.messageStubType !== 2) {
        await log({ messageStubType: m.messageStubType, messageStubParameters: m.messageStubParameters, type: WAMessageStubType[m.messageStubType] });
      }
      break;
  }
  if (needsMetadataRefresh) {
    try {
      const freshMetadata = await mongoStore.syncGroupMetadata(fn, m.chat);
      if (freshMetadata && freshMetadata.participants) {
        for (const participant of freshMetadata.participants) {
          const contactJid = jidNormalizedUser(participant.id);
          const contactName = await fn.getName(contactJid);
          await updateContact(contactJid, { lid: participant.lid, name: contactName });
        }
      }
    } catch (error) {
      await log(error, true);
    }
  }
};