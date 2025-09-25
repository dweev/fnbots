// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Group } from '../../../database/index.js';

export const command = {
  name: 'banchat',
  category: 'manage',
  description: 'Matikan/aktifkan bot di group',
  isCommandWithoutPayment: true,
  execute: async ({ args, sReply, toId, dbSettings, reactDone, isSadmin, isMaster }) => {
    const group = await Group.ensureGroup(toId);
    const status = args[0]?.toLowerCase();
    switch (status) {
      case 'on':
        if (group.isMuted) sReply(`Chat ini sudah dimatikan notifikasinya.\n\nGunakan ${dbSettings.rname}banchat off untuk mengaktifkan kembali notifikasi.`);
        await group.muteChat();
        await reactDone();
        await sReply(`Chat berhasil dimatikan.`);
        break;
      case 'off':
        if (!group.isMuted) sReply(`Chat ini belum dimatikan notifikasinya.\n\nGunakan ${dbSettings.rname}banchat on untuk mematikan notifikasi.`);
        await group.unmuteChat();
        await reactDone();
        await sReply(`Chat berhasil diaktifkan.`);
        break;
      case 'reset': {
        if (isSadmin || isMaster) return;
        const mutedGroups = await Group.findMutedGroups();
        for (const mutedGroup of mutedGroups) {
          await mutedGroup.unmuteChat();
        }
        await reactDone();
        await sReply(`Semua chat yang dimatikan telah direset.`);
        break;
      }
      default: {
        let message = `Gunakan:\n`
        message += `${dbSettings.rname}banchat on untuk monaktifkan bot di group ini.\n`
        message += `${dbSettings.rname}banchat off untuk mengaktifkan bot di group ini.\n`
        message += `${dbSettings.rname}banchat reset untuk mereset semua pengaturan keaktifan bot di semua group..`
        await sReply(message);
      }
    }
  },
};