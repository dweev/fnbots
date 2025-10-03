// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import imageGenerator from '../workers/image_generator_worker.js';

export default async function imageGeneratorJob(data) {
  if (!data || !data.type) {
    throw new Error('Invalid image generator job data: type is missing');
  }
  return await imageGenerator(data);
}