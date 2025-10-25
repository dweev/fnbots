// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { uploader, uploader2, uploader3, uploader4, uploader5 } from "../../utils/uploader.js";

const uploaders = {
  1: { name: "Catbox.moe", fn: uploader },
  2: { name: "Uguu.se", fn: uploader2 },
  3: { name: "Qu.ax", fn: uploader3 },
  4: { name: "Put.icu", fn: uploader4 },
  5: { name: "Tmpfiles.org", fn: uploader5 },
};

export const command = {
  name: 'tourl',
  category: 'util',
  description: 'Mengunggah media ke server dan mendapatkan tautan unduhan.',
  isLimitCommand: true,
  execute: async ({ fn, m, args, sReply, quotedMsg }) => {
    if (!args[0] || isNaN(args[0]) || !uploaders[args[0]]) {
      const list = Object.entries(uploaders).map(([num, { name }]) => `${num}. ${name}`).join("\n");
      return await sReply(`Select upload server by number.\n› Example: .${command.name} 1\n\nAvailable servers:\n${list}`);
    }
    const server = uploaders[args[0]];
    const targetMsg = quotedMsg ? m.quoted || m : m.message;
    const isMedia = !!(targetMsg.imageMessage || targetMsg.videoMessage || targetMsg.stickerMessage);
    console.log(isMedia);
    if (!isMedia) return await sReply("Media tidak valid! Pastikan yang Anda balas adalah gambar atau video.");
    const buffer = await fn.getMediaBuffer(targetMsg);
    if (!Buffer.isBuffer(buffer) || !buffer.length) return await sReply("Failed to get media buffer.");
    const url = await server.fn(buffer).catch(() => null);
    if (!url) return await sReply(`Upload failed on ${server.name}. Try another server.`);
    const sizeKB = (buffer.length / 1024).toFixed(2);
    const caption = [
      `File uploaded successfully`,
      `Server : ${server.name}`,
      `Size : ${sizeKB} KB`,
      `URL : ${url}`,
    ].join("\n");
    await sReply(caption);
  }
};