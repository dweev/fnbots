// ─── Info ───────────────────────────────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info src/worker/workers/image_generator_worker.js ──────────────

import fs from 'fs-extra';
import { spawn } from 'child_process';
import sharp from 'sharp';
import log from '../../lib/logger.js';
import { tmpDir } from '../../lib/tempManager.js';

function runImageMagick(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('convert', args);
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      reject(new Error(`ImageMagick spawn error: ${error.message}`));
    });
    child.on('close', (code) => {
      if (code !== 0) {
        const errorMessage = stderr.trim() || `ImageMagick exited with code ${code}`;
        reject(new Error(errorMessage));
      } else {
        resolve();
      }
    });
  });
}

function validateText(text, maxLength = 8) {
  if (!text || text.trim().length === 0) {
    throw new Error('Teks tidak boleh kosong');
  }
  const upperText = text.toUpperCase();
  if (upperText.length > maxLength) {
    throw new Error(`Teks terlalu panjang! Maksimal ${maxLength} huruf`);
  }
  if (/[^A-Z]/.test(upperText)) {
    throw new Error('Teks hanya boleh berisi huruf A-Z');
  }
  return upperText;
}

export default async function imageGenerator({ type, text1, text2, text3, outputFormat = 'jpg' }) {
  if (!type) {
    throw new Error('Type is required (tahta, harta, or create)');
  }
  let annotationText;
  let validatedTexts = [];
  try {
    if (type === 'tahta' || type === 'harta') {
      if (!text1) {
        throw new Error('Text is required');
      }
      const validated = validateText(text1);
      validatedTexts.push(validated);
      annotationText = `HARTA\nTAHTA\n${validated}`;
    } else if (type === 'create') {
      if (!text1 || !text2 || !text3) {
        throw new Error('Three texts are required for create mode');
      }
      validatedTexts = [validateText(text1), validateText(text2), validateText(text3)];
      annotationText = validatedTexts.join('\n');
    } else {
      throw new Error(`Unknown type: ${type}. Use tahta, harta, or create`);
    }
  } catch (error) {
    log(`[ImageGenerator] Validation failed: ${error.message}`, true);
    throw error;
  }
  const outputFile = tmpDir.createTempFile(`output-${type}.jpg`);
  try {
    // prettier-ignore
    const convertArgs = [
      '-size', '512x512',
      '-background', 'black',
      'xc:black',
      '-pointsize', '90',
      '-font', './src/fonts/harta.ttf',
      '-gravity', 'center',
      '-tile', './src/image/rainbow.jpg',
      '-annotate', '+0+0', annotationText,
      '-wave', '4.5x64',
      outputFile
    ];
    await runImageMagick(convertArgs);
    if (!(await fs.pathExists(outputFile))) {
      throw new Error('ImageMagick did not create output file');
    }
    const outputStats = await fs.stat(outputFile);
    if (outputStats.size === 0) {
      throw new Error('ImageMagick created empty output file');
    }
    let outputBuffer;
    if (outputFormat === 'webp' || type === 'harta' || type === 'create') {
      outputBuffer = await sharp(outputFile).webp().toBuffer();
    } else {
      outputBuffer = await fs.readFile(outputFile);
    }
    if (!Buffer.isBuffer(outputBuffer)) {
      throw new Error('Output is not a Buffer');
    }
    if (outputBuffer.length === 0) {
      throw new Error('Output buffer is empty');
    }
    return outputBuffer;
  } catch (error) {
    log(`[ImageGenerator] Processing failed: ${error.message}`, true);
    throw error;
  } finally {
    await tmpDir.deleteFile(outputFile);
  }
}
