// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

export const command = {
  name: 'block',
  category: 'vip',
  description: 'Memblokir user dari bot',
  isCommandWithoutPayment: true,
  execute: async ({ fn, toId, arg, dbSettings, quotedMsg, mentionedJidList, quotedParticipant, sReply, store }) => {
    const targets = [];
    if (quotedMsg) {
      targets.push(quotedParticipant);
    } else if (mentionedJidList.length > 0) {
      targets.push(...mentionedJidList);
    } else if (arg) {
      targets.push(arg.replace(/[^0-9]/g, '') + '@s.whatsapp.net');
    } else {
      return await sReply(`Tidak ada user yang ditargetkan!\n\nCara penggunaan:\n• Reply pesan user yang ingin diblokir, atau\n• Mention user dengan @username\n\nContoh: ${dbSettings.rname}block @user`);
    }
    const blocked = [];
    const failed = [];
    const metadata = await store.getGroupMetadata(toId);
    // prettier-ignore
    const groupAdmins = metadata?.participants?.reduce((a, b) => {
        if (b.admin) a.push({ id: b.id, admin: b.admin });
        return a;
      }, []) || [];
    for (const jid of targets) {
      if (groupAdmins && groupAdmins.some((admin) => admin.id === jid)) {
        failed.push(jid);
        continue;
      }
      await fn.updateBlockStatus(jid, 'block');
      blocked.push(jid);
    }
    let response = '';
    if (blocked.length > 0) {
      response += `Berhasil block:\n` + blocked.map((j, i) => `${i + 1}. @${j.split('@')[0]}`).join('\n') + '\n\n';
    }
    if (failed.length > 0) {
      response += `Gagal:\n` + failed.map((j, i) => `${i + 1}. @${j.split('@')[0]}`).join('\n');
    }
    await sReply(response);
  }
};
