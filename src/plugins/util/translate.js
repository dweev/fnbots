// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import pkg from 'translatte';
const { translatte } = pkg;

export const command = {
  name: 'translate',
  category: 'util',
  description: `Translate teks ke bahasa lain`,
  isCommandWithoutPayment: true,
  execute: async ({ body, quotedMsg, sReply, dbSettings }) => {
    const raw = body.slice(10).trim();
    const args = raw.trim().split(/\s+/);
    const lang = args.shift()?.toLowerCase();
    let teks = args.join(' ').trim();
    if (!raw && !(quotedMsg && (quotedMsg?.type === 'extendedTextMessage' || quotedMsg?.type === 'conversation'))) {
      let tx = '*List Kode Bahasa Google Translate:*\n\n';
      tx += '```auto 	: Automatic\n';
      tx += 'af 	: Afrikaans\n';
      tx += 'sq 	: Albanian\n';
      tx += 'am 	: Amharic\n';
      tx += 'ar 	: Arabic\n';
      tx += 'hy 	: Armenian\n';
      tx += 'az 	: Azerbaijani\n';
      tx += 'eu 	: Basque\n';
      tx += 'be 	: Belarusian\n';
      tx += 'bn 	: Bengali\n';
      tx += 'bs 	: Bosnian\n';
      tx += 'bg 	: Bulgarian\n';
      tx += 'ca 	: Catalan\n';
      tx += 'ceb 	: Cebuano\n';
      tx += 'ny 	: Chichewa\n';
      tx += 'zh 	: Chinese (Simplified)\n';
      tx += 'zh-cn 	: Chinese (Simplified)\n';
      tx += 'zh-tw 	: Chinese (Traditional)\n';
      tx += 'co 	: Corsican\n';
      tx += 'hr 	: Croatian\n';
      tx += 'cs 	: Czech\n';
      tx += 'da 	: Danish\n';
      tx += 'nl 	: Dutch\n';
      tx += 'en 	: English\n';
      tx += 'eo 	: Esperanto\n';
      tx += 'et 	: Estonian\n';
      tx += 'tl 	: Filipino\n';
      tx += 'fi 	: Finnish\n';
      tx += 'fr 	: French\n';
      tx += 'fy 	: Frisian\n';
      tx += 'gl 	: Galician\n';
      tx += 'ka 	: Georgian\n';
      tx += 'de 	: German\n';
      tx += 'el 	: Greek\n';
      tx += 'gu 	: Gujarati\n';
      tx += 'ht 	: Haitian Creole\n';
      tx += 'ha 	: Hausa\n';
      tx += 'haw 	: Hawaiian\n';
      tx += 'he 	: Hebrew\n';
      tx += 'hi 	: Hindi\n';
      tx += 'hmn 	: Hmong\n';
      tx += 'hu 	: Hungarian\n';
      tx += 'is 	: Icelandic\n';
      tx += 'ig 	: Igbo\n';
      tx += 'id 	: Indonesian\n';
      tx += 'ga 	: Irish\n';
      tx += 'it 	: Italian\n';
      tx += 'ja 	: Japanese\n';
      tx += 'jw 	: Javanese\n';
      tx += 'kn 	: Kannada\n';
      tx += 'kk 	: Kazakh\n';
      tx += 'km 	: Khmer\n';
      tx += 'ko 	: Korean\n';
      tx += 'ku 	: Kurdish (Kurmanji)\n';
      tx += 'ky 	: Kyrgyz\n';
      tx += 'lo 	: Lao\n';
      tx += 'la 	: Latin\n';
      tx += 'lv 	: Latvian\n';
      tx += 'lt 	: Lithuanian\n';
      tx += 'lb 	: Luxembourgish\n';
      tx += 'mk 	: Macedonian\n';
      tx += 'mg 	: Malagasy\n';
      tx += 'ms 	: Malay\n';
      tx += 'ml 	: Malayalam\n';
      tx += 'mt 	: Maltese\n';
      tx += 'mi 	: Maori\n';
      tx += 'mr 	: Marathi\n';
      tx += 'mn 	: Mongolian\n';
      tx += 'my 	: Myanmar (Burmese)\n';
      tx += 'ne 	: Nepali\n';
      tx += 'no 	: Norwegian\n';
      tx += 'ps 	: Pashto\n';
      tx += 'fa 	: Persian\n';
      tx += 'pl 	: Polish\n';
      tx += 'pt 	: Portuguese\n';
      tx += 'pa 	: Punjabi\n';
      tx += 'ro 	: Romanian\n';
      tx += 'ru 	: Russian\n';
      tx += 'sm 	: Samoan\n';
      tx += 'gd 	: Scots Gaelic\n';
      tx += 'sr 	: Serbian\n';
      tx += 'st 	: Sesotho\n';
      tx += 'sn 	: Shona\n';
      tx += 'sd 	: Sindhi\n';
      tx += 'si 	: Sinhala\n';
      tx += 'sk 	: Slovak\n';
      tx += 'sl 	: Slovenian\n';
      tx += 'so 	: Somali\n';
      tx += 'es 	: Spanish\n';
      tx += 'su 	: Sundanese\n';
      tx += 'sw 	: Swahili\n';
      tx += 'sv 	: Swedish\n';
      tx += 'tg 	: Tajik\n';
      tx += 'ta 	: Tamil\n';
      tx += 'te 	: Telugu\n';
      tx += 'th 	: Thai\n';
      tx += 'tr 	: Turkish\n';
      tx += 'uk 	: Ukrainian\n';
      tx += 'ur 	: Urdu\n';
      tx += 'uz 	: Uzbek\n';
      tx += 'vi 	: Vietnamese\n';
      tx += 'cy 	: Welsh\n';
      tx += 'xh 	: Xhosa\n';
      tx += 'yi 	: Yiddish\n';
      tx += 'yo 	: Yoruba\n';
      tx += 'zu 	: Zulu```\n\n';
      tx += 'Contoh: .translate en aku cinta kamu';
      await sReply(tx);
    }
    if (!teks && quotedMsg && (quotedMsg?.type === 'extendedTextMessage' || quotedMsg?.type === 'conversation')) {
      teks = quotedMsg?.body;
    }
    if (!teks) return await sReply(`Teks tidak ditemukan.\nContoh: ${dbSettings.rname}translate en aku cinta kamu`);
    const hasil = await translatte(teks, { to: lang.toLowerCase() });
    await sReply(`*Google Translate*\n\n• Dari: ${hasil.from.language.iso}\n• Ke: ${lang}\n\n*>* ${hasil.text}`);
  }
};
