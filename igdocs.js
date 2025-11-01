#!/usr/bin/env node

/**
 * @file igdocs.js
 * Skrip CLI untuk mengambil doc_id, app_id, dan asbd_id dari URL Instagram.
 * Menggunakan utilitas instagramGetIds dari src/utils/igdocs.js.
 * Created with ❤️ and 💦 By FN
 */

import instagramGetIds from './src/utils/igdocs.js';

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Penggunaan: node igdocs.js <URL Instagram>');
    process.exit(1);
  }
  const url = args[0];
  console.log(`Mencari ID untuk: ${url}\n`);
  try {
    const data = await instagramGetIds(url);
    console.log('\n--- HASIL DITEMUKAN ---');
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('\n--- ERROR ---');
    console.error(err.message || err);
  }
}
main();
