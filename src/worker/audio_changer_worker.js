// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info audio_changer_worker.js ────────

import fs from 'fs-extra';
import { exec } from 'child_process';
import { parentPort } from 'worker_threads';
import { tmpDir } from '../lib/tempManager.js';

function runFFMPEG(inputPath, outputPath, filter) {
  return new Promise((resolve, reject) => {
    const command = `ffmpeg -i "${inputPath}" ${filter.flag} "${filter.filter}" "${outputPath}"`;
    exec(command, (error, stderr) => {
      if (error) {
        return reject(new Error(`FFMPEG ERROR: ${stderr || error.message}`));
      }
      resolve(outputPath);
    });
  });
}
parentPort.on('message', async (mediaBuffer) => {
  const inputFile = tmpDir.createTempFile('.mp3', 'in-');
  const outputFile = tmpDir.createTempFile('.mp3', 'out-');
  try {
    await fs.writeFile(inputFile, mediaBuffer);
    const ffmpegFilters = [
      { filter: "equalizer=f=54:width_type=o:width=2:g=20", flag: '-af' },
      { filter: "acrusher=.1:1:64:0:log", flag: '-af' },
      { filter: "atempo=4/4,asetrate=44500*2/3", flag: '-af' },
      { filter: "volume=12", flag: '-af' },
      { filter: "atempo=1.63,asetrate=44100", flag: '-af' },
      { filter: "atempo=1.6,asetrate=22100", flag: '-af' },
      { filter: "atempo=1.06,asetrate=44100*1.25", flag: '-af' },
      { filter: "areverse", flag: '-filter_complex' },
      { filter: "afftfilt=real='hypot(re,im)*sin(0)':imag='hypot(re,im)*cos(0)':win_size=512:overlap=0.75", flag: '-filter_complex' },
      { filter: "atempo=0.7,asetrate=44100", flag: '-af' },
      { filter: "atempo=0.5,asetrate=65100", flag: '-af' },
      { filter: "aecho=0.8:0.9:1000:0.3", flag: '-af' },
      { filter: "vibrato=f=5", flag: '-af' },
      { filter: "aphaser=in_gain=0.4", flag: '-af' },
      { filter: "afftfilt=real='hypot(re,im)':imag='0'", flag: '-filter_complex' },
      { filter: "tremolo=f=5.0:d=0.8", flag: '-af' },
      { filter: "highpass=f=200, lowpass=f=3000", flag: '-af' },
      { filter: "bandpass=f=1000:width_type=h:width=200", flag: '-af' },
      { filter: "aecho=0.6:0.3:1000:0.5, lowpass=f=300", flag: '-af' },
      { filter: "aecho=0.8:0.88:60:0.4", flag: '-af' },
      { filter: "asetrate=44100*0.8, atempo=1.1", flag: '-af' },
      { filter: "asetrate=44100*0.7, atempo=1.2", flag: '-af' },
      { filter: "afftfilt=real='hypot(re,im)*cos(0.5)':imag='hypot(re,im)*sin(0.5)'", flag: '-af' },
      { filter: "asetrate=44100*0.5, atempo=2", flag: '-af' },
      { filter: "apulsator=hz=0.3", flag: '-af' }
    ];
    const randomFilter = ffmpegFilters[Math.floor(Math.random() * ffmpegFilters.length)];
    await runFFMPEG(inputFile, outputFile, randomFilter);
    parentPort.postMessage({ status: 'done', outputPath: outputFile });
  } catch (e) {
    parentPort.postMessage({ status: 'error', error: e.message });
  } finally {
    await tmpDir.deleteFile(inputFile);
  }
});