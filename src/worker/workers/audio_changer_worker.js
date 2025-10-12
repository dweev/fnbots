// ─── Info ───────────────────────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info src/worker/workers/audio_changer_worker.js ────────────────

import { spawn } from 'child_process';
import log from '../../lib/logger.js';

const ffmpegFilters = new Map([
  ['8d',         { flag: '-af',             filter: 'apulsator=hz=0.3'                                                                          }],
  ['alien',      { flag: '-af',             filter: 'asetrate=44100*0.5, atempo=2'                                                              }],
  ['bass',       { flag: '-af',             filter: 'equalizer=f=54:width_type=o:width=2:g=20'                                                  }],
  ['blown',      { flag: '-af',             filter: 'acrusher=.1:1:64:0:log'                                                                    }],
  ['chipmunk',   { flag: '-af',             filter: 'atempo=0.5,asetrate=65100'                                                                 }],
  ['deep',       { flag: '-af',             filter: 'atempo=4/4,asetrate=44500*2/3'                                                             }],
  ['demonic',    { flag: '-af',             filter: 'asetrate=44100*0.7, atempo=1.2'                                                            }],
  ['dizzy',      { flag: '-af',             filter: 'aphaser=in_gain=0.4'                                                                       }],
  ['earrape',    { flag: '-af',             filter: 'volume=12'                                                                                 }],
  ['echo',       { flag: '-af',             filter: 'aecho=0.8:0.9:1000:0.3'                                                                    }],
  ['fast',       { flag: '-af',             filter: 'atempo=1.63,asetrate=44100'                                                                }],
  ['fastreverse',{ flag: '-filter_complex', filter: 'areverse,atempo=1.63,asetrate=44100'                                                       }],
  ['fat',        { flag: '-af',             filter: 'atempo=1.6,asetrate=22100'                                                                 }],
  ['ghost',      { flag: '-af',             filter: 'aecho=0.8:0.88:60:0.4'                                                                     }],
  ['haunted',    { flag: '-filter_complex', filter: "afftfilt=real='hypot(re,im)':imag='0'"                                                     }],
  ['nightcore',  { flag: '-af',             filter: 'atempo=1.06,asetrate=44100*1.25'                                                           }],
  ['nightmare',  { flag: '-af',             filter: "afftfilt=real='hypot(re,im)*cos(0.5)':imag='hypot(re,im)*sin(0.5)'"                        }],
  ['radio',      { flag: '-af',             filter: 'highpass=f=200, lowpass=f=3000'                                                            }],
  ['reverse',    { flag: '-filter_complex', filter: 'areverse'                                                                                  }],
  ['robot',      { flag: '-filter_complex', filter: "afftfilt=real='hypot(re,im)*sin(0)':imag='hypot(re,im)*cos(0)':win_size=512:overlap=0.75"  }],
  ['slow',       { flag: '-af',             filter: 'atempo=0.7,asetrate=44100'                                                                 }],
  ['smooth',     { flag: '-filter:v',       filter: 'minterpolate=mi_mode=mci:mc_mode=aobmc:vsbmc=1:fps=120'                                    }],
  ['spooky',     { flag: '-af',             filter: 'asetrate=44100*0.8, atempo=1.1'                                                            }],
  ['telephone',  { flag: '-af',             filter: 'bandpass=f=1000:width_type=h:width=200'                                                    }],
  ['tremolo',    { flag: '-af',             filter: 'tremolo=f=5.0:d=0.8'                                                                       }],
  ['underwater', { flag: '-af',             filter: 'aecho=0.6:0.3:1000:0.5, lowpass=f=300'                                                     }],
  ['vibrato',    { flag: '-af',             filter: 'vibrato=f=5'                                                                               }],
]);

function ensureBuffer(input) {
  if (Buffer.isBuffer(input)) {
    return input;
  }
  if (input && input.type === 'Buffer' && input.data) {
    if (Array.isArray(input.data)) {
      return Buffer.from(input.data);
    }
  }
  if (typeof input.length === 'number' && typeof input[0] === 'number') {
    return Buffer.from(input);
  }
  if (input.buffer instanceof ArrayBuffer) {
    return Buffer.from(input);
  }
  throw new Error(
    `Cannot convert to Buffer: type=${typeof input}, ` +
    `constructor=${input?.constructor?.name}, ` +
    `isArray=${Array.isArray(input)}, ` +
    `hasData=${input?.data !== undefined}`
  );
};
function runFFMPEGWithBuffer(inputBuffer, filter) {
  return new Promise((resolve, reject) => {
    const args = [
      '-i', 'pipe:0',
      filter.flag, filter.filter,
      '-f', 'mp3',
      'pipe:1'
    ];
    const ffmpeg = spawn('ffmpeg', args, {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const chunks = [];
    let errorOutput = '';
    ffmpeg.stdout.on('data', (chunk) => {
      chunks.push(chunk);
    });
    ffmpeg.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        const outputBuffer = Buffer.concat(chunks);
        if (outputBuffer.length === 0) {
          reject(new Error('FFMPEG created empty output'));
        } else {
          resolve(outputBuffer);
        }
      } else {
        console.error('FFmpeg Error Output:', errorOutput);
        reject(new Error(`FFMPEG exited with code ${code}`));
      }
    });
    ffmpeg.on('error', (err) => {
      reject(new Error(`FFMPEG spawn error: ${err.message}`));
    });
    ffmpeg.stdin.write(inputBuffer);
    ffmpeg.stdin.end();
  });
};

export default async function audioChanger({ mediaBuffer, filterName }) {
  if (!mediaBuffer) throw new Error('mediaBuffer is required but received undefined');
  let finalBuffer;
  try {
    finalBuffer = ensureBuffer(mediaBuffer);
  } catch (error) {
    log(`[AudioChanger] Buffer conversion failed: ${error.message}`, true);
    throw error;
  }
  if (finalBuffer.length === 0) throw new Error('Audio buffer is empty');
  let selectedFilter;
  if (filterName) {
    selectedFilter = ffmpegFilters.get(filterName);
    if (!selectedFilter) {
      const availableFilters = Array.from(ffmpegFilters.keys()).join(', ');
      throw new Error(`Filter "${filterName}" not found. Available: ${availableFilters}`);
    }
  } else {
    const filterKeys = Array.from(ffmpegFilters.keys());
    const randomKey = filterKeys[Math.floor(Math.random() * filterKeys.length)];
    selectedFilter = ffmpegFilters.get(randomKey);
  }
  try {
    const outputBuffer = await runFFMPEGWithBuffer(finalBuffer, selectedFilter);
    if (!Buffer.isBuffer(outputBuffer)) throw new Error('Output is not a Buffer');
    if (outputBuffer.length === 0) throw new Error('Output buffer is empty');
    return outputBuffer;
  } catch (error) {
    log(`Processing failed: ${error.message}`, true);
    throw error;
  }
}