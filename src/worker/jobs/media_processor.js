// ─── Info ───────────────────────────────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info src/worker/jobs/media_processor.js ────────────────────────

import mediaProcessor from '../workers/media_processor_worker.js';

export default async function mediaProcessorJob(data) {
  const { argsArray } = data;
  if (!argsArray || !Array.isArray(argsArray)) {
    throw new Error('Invalid media processor job data: argsArray must be an array');
  }
  return await mediaProcessor({ argsArray });
}
