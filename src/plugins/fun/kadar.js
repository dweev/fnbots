// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

const categories = {
  kebodohan: [
    [10, 'masih bisa diperbaiki. semangat ^^'],
    [30, 'ayo kak, kurangin malasnya!!'],
    [50, 'hmmmm bingung nih :('],
    [70, 'anjim goblok banget sia'],
    [90, 'ebuset tolol, anjing'],
    [99, 'wah kebangetan anjing!'],
    [100, 'mati aja tolol! gaguna idup']
  ],
  kepintaran: [
    [10, 'masih bisa diperbaiki. semangat ^^'],
    [30, 'ayo kak, kurangin malasnya!!'],
    [50, 'hmmmm bingung nih :('],
    [70, 'pertahankan kak! kalo bisa tingkatkan!'],
    [90, 'kakak kok pinter sih? duh jadi pengen deh sama kk'],
    [99, 'jago banget sih kak! hebat!'],
    [100, 'KAKAK MAKANNYA APA SIH GILA!']
  ],
  kemalasan: [
    [10, 'masih bisa diperbaiki. semangat ^^'],
    [30, 'ayo kak, kurangin malasnya!!'],
    [50, 'hmmmm bingung nih :('],
    [70, 'anjim pemalas banget sia'],
    [90, 'ebuset pemalas, anjing'],
    [99, 'wah kebangetan anjing!'],
    [100, 'mati aja tolol! gaguna idup']
  ],
  kebijaksanaan: [
    [10, 'hmmm dikit banget :('],
    [30, 'pasti biasanya suka bikin quotes2 ala anak senja'],
    [50, 'suka jadi tempat curhat ya?'],
    [70, 'wah titisannya mario tegang ya?'],
    [90, 'wah jadi gantinya mario tegang sabi nih!'],
    [99, 'fix mario tegang mah lewat!'],
    [100, 'mati aja tolol! gaguna idup']
  ],
  kenakalan: [
    [10, 'nakal dikit gapapalah ya ^^'],
    [30, 'dikurangin kak, nanti kebablasan!'],
    [50, 'suka bolos pas sekolah ya!!?'],
    [70, 'WAH CIRI CIRI BADBOY / BADGIRL NIH! apa malah BADWARIA?'],
    [90, 'pasti sering bikin doi nangis! kurang ajar!!'],
    [99, 'JANGAN GITU DONG KAK! TOBATLAH!'],
    [100, 'FIX INI MAH HOBI HAMILIN ANAK ORANG!']
  ],
  kegantengan: [
    [10, 'hmmmm dikit banget, gapapalah dikit :)'],
    [30, 'gausah sok ganteng, lo muka editan!'],
    [50, 'gak yakin gw kalo lu ganteng! kaca mana kaca!?'],
    [70, 'mentang2 ganteng jangan jadi playboy dong!'],
    [90, 'udah berapa kali ganti pasangan kak!?'],
    [99, 'fix ini mah artis :('],
    [100, 'KALO MAIN FILM, PASTI MASUK BOX OFFICE FILMNYA!']
  ],
  kecantikan: [
    [10, 'hmmm dikit banget :('],
    [30, 'cantik kok kak, jangan insecure ya!'],
    [50, 'jangan sok cantik anjing! jangan kegatelan, muka pas2an doang'],
    [70, 'wah rajin perawatan ya :)'],
    [90, 'heh kak, mau jadi pacarku?'],
    [99, 'KAK, JADI PACARKU YA!'],
    [100, 'KAK, AKU GABISA TANPAMU :(']
  ],
  gay: [
    [10, 'korbannya siapa sih ini :('],
    [30, 'pasti biasanya suka mancing2'],
    [50, 'suka jadi anu ya :('],
    [70, 'najis lo, minggir sana!'],
    [90, 'anjing gay! gw blokir aja kali ya?'],
    [99, 'ANJING!'],
    [100, 'NYESEL GW JAWAB, DASAR GAY! MATI LO SANA!']
  ],
  cabul: [
    [10, 'pasti baru mau coba2, jangan!!'],
    [30, 'jangan keterusan tolol, kasian anak orang'],
    [50, 'gini nih, perusak anak orang!'],
    [70, 'dah berapa hooman yang lo rusak jing?'],
    [90, 'najis cabul banget, dasar otak selangkangan!'],
    [99, 'anjinglah, no komen gua'],
    [100, 'mati aja tolol! gaguna idup']
  ],
  hoki: [
    [10, 'hmmm dikit banget :('],
    [30, 'pasti biasanya dapet hadiah di ciki ciki yakan :D'],
    [50, 'pasti sering dapet jajan di waktu yang tak terduga'],
    [70, 'sering dijajanin ya?'],
    [90, 'ajegile, hokinya gede!'],
    [99, 'bagi bagi dong hokinya!'],
    [100, 'beruntung amat lu idup, jadi ngiri gue! :(']
  ],
  bucin: [
    [10, 'butuh pencerahan!'],
    [30, 'pasti biasanya baru2 pacaran'],
    [50, 'suka goblok ya?'],
    [70, 'anjing bucin lo!'],
    [90, 'minggir lo bucin!'],
    [99, 'tailah dasar bucin!'],
    [100, 'najis bucin, putus nangis2 lo!']
  ]
};

export const command = {
  name: 'kadar',
  category: 'fun',
  description: `Melihat Kekadaran...`,
  isCommandWithoutPayment: true,
  execute: async ({ args, sReply }) => {
    if (args.length === 0) {
      const availableCategories = Object.keys(categories).map(cat => `› ${cat}`).join('\n');
      return await sReply(
        `Silakan pilih kadar yang ingin diukur!\n\n` +
        `*Contoh Penggunaan:*\n.kadar kepintaran\n\n` +
        `*Pilihan yang Tersedia:*\n${availableCategories}`
      );
    }
    const requestedCategory = args[0].toLowerCase();
    if (categories[requestedCategory]) {
      const random = Math.floor(Math.random() * 100) + 1;
      const result = categories[requestedCategory].find(([max]) => random <= max);
      if (result) {
        const replyText = `Tingkat *${requestedCategory}* kamu adalah *${random}%*!\n\n"${result[1]}"`;
        await sReply(replyText);
      } else {
        return await sReply("Terjadi kesalahan internal pada data kategori.");
      }
    } else {
      const availableCategories = Object.keys(categories).map(cat => `› ${cat}`).join('\n');
      return await sReply(
        `Kadar "${requestedCategory}" tidak ditemukan.\n\n` +
        `*Pilihan yang Tersedia:*\n${availableCategories}`
      );
    }
  }
};