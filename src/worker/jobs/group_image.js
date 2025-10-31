// ─── Info ─────────────────────────────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info src/worker/jobs/group_image.js ──────────────────────────

import createImage from '../workers/groupimage_worker.js';

export default async function groupImageJob(data) {
  const { username, groupname, welcometext, profileImagePath } = data;
  if (!username || !groupname || !welcometext || !profileImagePath) throw new Error('Invalid group image job data');
  return await createImage({ username, groupname, welcometext, profileImagePath });
}
