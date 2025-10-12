// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import path from 'path';
import fs from 'fs-extra';
import FileProcessor from '../../utils/beautify.js';
import log from '../../lib/logger.js';


export const command = {
  name: 'beautify',
  category: 'util',
  description: 'Merapikan kode JS, JSON, HTML, CSS, atau ZIP berisi file-file tersebut',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, toId, arg, sReply, quotedMsg }) => {
    if (quotedMsg && quotedMsg?.documentMessage) {
      const mime = quotedMsg?.documentMessage?.mimetype || '';
      const supportedMimes = ['application/javascript', 'text/html', 'text/css', 'application/json', 'application/zip', 'text/plain'];
      if (!supportedMimes.some(supportedMime => mime.startsWith(supportedMime))) return await sReply("Tipe media tidak didukung. Harap reply file .js, .json, .html, .css, atau .zip");
      const buffer = await fn.getMediaBuffer(quotedMsg);
      const originalFileName = quotedMsg?.documentMessage.title || 'replied-file';
      let beautifiedBuffer, outputFileName;
      if (mime.includes('zip')) {
        const tempZipPath = path.join(global.tmpDir, `temp_${Date.now()}.zip`);
        await fs.writeFile(tempZipPath, buffer);
        try {
          const processor = await FileProcessor.fromPath(tempZipPath);
          beautifiedBuffer = await processor.processZip();
          outputFileName = processor.getOutputFileName(originalFileName, 'zip');
        } finally {
          await fs.unlink(tempZipPath);
        }
      } else {
        const fileContent = buffer.toString('utf8');
        const processor = FileProcessor.fromText(fileContent, originalFileName);
        beautifiedBuffer = await processor.processSingleFile();
        const detectedType = processor.determineFileType(originalFileName);
        outputFileName = processor.getOutputFileName(originalFileName, detectedType);
      }
      const tempFilePath = path.join(global.tmpDir, outputFileName);
      await fs.writeFile(tempFilePath, beautifiedBuffer);
      const caption = `Kode Berhasil Dirapikan!`;
      await fn.sendFilePath(toId, caption, tempFilePath, { quoted: m });
    } else {
      let codeToProcess = '';
      if (quotedMsg && (quotedMsg?.type === 'extendedTextMessage' || quotedMsg?.type === 'conversation')) {
        codeToProcess = quotedMsg?.body;
      } else {
        codeToProcess = arg;
      }
      if (!codeToProcess || !codeToProcess.trim()) {
        const usage = `*Perintah Beautifier Universal*\n\n` +
          `Gunakan untuk merapikan kode JS, JSON, HTML, & CSS.\n\n` +
          `*Cara 1: Reply File*\n` +
          `Balas file (.js, .json, .html, .css, .zip) dengan perintah:\n*.beautify*\n\n` +
          `*Cara 2: Reply Teks*\n` +
          `Balas pesan teks yang berisi kode dengan perintah:\n*.beautify*\n\n` +
          `*Cara 3: Teks Langsung*\n` +
          `Ketik perintah diikuti dengan kode Kamu:\n*.beautify function hello(){...}*`;
        return await sReply(usage);
      }
      let beautifiedBuffer, outputFileName;
      try {
        const parsedJson = JSON.parse(codeToProcess);
        const beautifiedJson = JSON.stringify(parsedJson, null, 2);
        beautifiedBuffer = Buffer.from(beautifiedJson, 'utf8');
        outputFileName = 'beautified.json';
      } catch {
        try {
          const processor = FileProcessor.fromText(codeToProcess, 'input.js');
          beautifiedBuffer = await processor.processSingleFile('js');
          outputFileName = processor.getOutputFileName('beautified-code', 'js');
        } catch (error) {
          await log(`Beautify failed for both JSON and JS:\n${error}`, true);
          return await sReply("Gagal memformat kode. Pastikan sintaks JavaScript atau JSON Kamu sudah benar.");
        }
      }
      if (!beautifiedBuffer) return await sReply("Gagal memproses konten.");
      const beautifiedText = beautifiedBuffer.toString('utf8');
      if (beautifiedText.length < 10000) {
        const detectedType = outputFileName.endsWith('.json') ? 'json' : 'javascript';
        const replyText = `\`\`\`${detectedType}\n${beautifiedText}\n\`\`\``;
        await sReply(replyText);
      } else {
        const tempFilePath = path.join(global.tmpDir, outputFileName);
        await fs.writeFile(tempFilePath, beautifiedBuffer);
        const caption = `Kode Berhasil Dirapikan! (Hasil terlalu panjang, dikirim sebagai file)`;
        await fn.sendFilePath(toId, caption, tempFilePath, { quoted: m });
      }
    }
  }
};