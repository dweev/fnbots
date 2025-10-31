// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

export const command = {
  name: 'umurku',
  category: 'fun',
  description: `Melihat info umurmu`,
  isCommandWithoutPayment: true,
  execute: async ({ args, sReply, dbSettings }) => {
    if (!args) return await sReply(`format salah!!\ngunakan perintah seperti ${dbSettings.rname}umurku tahunlahirmu`);
    const year = args[0];
    const currentYear = new Date().getFullYear();
    const age = currentYear - parseInt(year);
    if (age < 0) return await sReply(`Seseorang yang lahir di tahun ${year}, maka akan lahir ${Math.abs(age)} tahun lagi.`);
    await sReply(`Kamu lahir di tahun ${year}, sepertinya sekarang berumur ${age} tahun.`);
  }
};
