// ─── Info ─────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info src/handler/autojoin.js ─────────────────

import log from '../lib/logger.js';
import { store } from '../../database/index.js';

class AutoJoinHandler {
  constructor(fn, User) {
    this.fn = fn;
    this.User = User;
  }
  async handle(params) {
    const { m, fn, dbSettings, body, isSadmin, isMaster, isVIP, user, sReply, User } = params;
    try {
      if (body?.match(/^https?:\/\/chat\.whatsapp\.com\/\w+$/i)) {
        return;
      }
      const inviteCode = this.extractInviteCode(body);
      if (!inviteCode) {
        await sReply("Link undangan tidak valid.");
        return;
      }
      const groupInfo = await fn.groupGetInviteInfo(inviteCode);
      if (!groupInfo) {
        await sReply("Tidak dapat mengambil informasi grup.");
        return;
      }
      const { restrict, joinApprovalMode, subject, participants, id } = groupInfo;
      if (isSadmin || isMaster) {
        await this.handlePrivilegedUserJoin(inviteCode, joinApprovalMode, restrict, id, subject, dbSettings, m, fn, sReply, user, User);
      } else {
        await this.handleRegularUserJoin(inviteCode, joinApprovalMode, restrict, id, subject, participants, dbSettings, m, fn, sReply, user, User, isSadmin, isMaster, isVIP);
      }
    } catch (error) {
      log(`Error in auto join handler: ${error}`, true);
      await sReply("Terjadi kesalahan saat mencoba join grup.");
    }
  }
  extractInviteCode(body) {
    try {
      const linkMatch = body.match(/https:\/\/chat\.whatsapp\.com\/([a-zA-Z0-9]+)/);
      if (linkMatch && linkMatch[1]) {
        return linkMatch[1];
      }
      const parts = body.split("https://chat.whatsapp.com/");
      if (parts.length > 1) {
        const code = parts[1].split(/\s/)[0];
        return code || null;
      }
      return null;
    } catch (error) {
      log(`Error extracting invite code: ${error}`, true);
      return null;
    }
  }
  async handlePrivilegedUserJoin(inviteCode, joinApprovalMode, restrict, groupId, subject, dbSettings, m, fn, sReply, user, User) {
    try {
      if (!joinApprovalMode) {
        await fn.groupAcceptInvite(inviteCode);
        if (!restrict) {
          const greetingMessage = `Halo warga grup *${subject}*!\nTerima kasih sudah mengundang ${dbSettings.botname}.`;
          const res = await store.getGroupMetadata(groupId);
          await fn.sendPesan(groupId, greetingMessage, { ephemeralExpiration: res.ephemeralDuration });
        }
        await sReply("Berhasil join grup.");
        const userUpdates = { $inc: { userCount: 1 } };
        await User.updateOne({ userId: user.userId }, userUpdates);
      } else {
        await sReply("Grup ini memerlukan persetujuan admin untuk bergabung.");
      }
    } catch (error) {
      log(`Error in privileged user join: ${error}`, true);
      await sReply("Gagal join grup. Mungkin link sudah expired atau ada masalah lain.");
    }
  }
  async handleRegularUserJoin(inviteCode, joinApprovalMode, restrict, groupId, subject, participants, dbSettings, m, fn, sReply, user, User, isSadmin, isMaster, isVIP) {
    try {
      if (participants.length <= dbSettings.memberLimit) {
        const errorMessage = `Group yang ingin kamu masukkan bot tidak memiliki member melebihi ${dbSettings.memberLimit}\nBot tidak bisa masuk ke grup, silakan hubungi owner.`;
        await sReply(errorMessage);
        return;
      }
      if (!joinApprovalMode) {
        await fn.groupAcceptInvite(inviteCode);
        if (!restrict) {
          const greetingMessage = `Halo warga grup *${subject}*!\nTerima kasih sudah mengundang ${dbSettings.botname}.`;
          const res = await store.getGroupMetadata(groupId);
          await fn.sendPesan(groupId, greetingMessage, { ephemeralExpiration: res.ephemeralDuration });
        }
        await sReply("Berhasil join grup.");
        const userUpdates = { $inc: { userCount: 1 } };
        if (!isSadmin && !isMaster && !isVIP) {
          userUpdates.$inc['limit.current'] = -1;
        }
        await User.updateOne({ userId: user.userId }, userUpdates);
      } else {
        await sReply("Grup ini memerlukan persetujuan admin untuk bergabung.");
      }
    } catch (error) {
      log(`Error in regular user join: ${error}`, true);
      await sReply("Gagal join grup. Mungkin link sudah expired atau ada masalah lain.");
    }
  }
}

export const handleAutoJoin = async (params) => {
  const handler = new AutoJoinHandler(params.fn, params.User);
  return await handler.handle(params);
};