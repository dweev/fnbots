// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import config from '../../../config.js';
import { fetchJson } from '../../function/index.js';

export const command = {
  name: 'cuaca',
  category: 'fun',
  description: `Melihat info cuaca`,
  isCommandWithoutPayment: true,
  execute: async ({ arg, sReply, dbSettings }) => {
    const kota = arg.trim();
    if (!kota) return await sReply(`Silakan masukkan nama kota yang ingin dicek.\nContoh: *${dbSettings.sname}cuaca Jakarta*`);
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${kota}&units=metric&appid=${config.openWather}&lang=id`;
    const data = await fetchJson(apiUrl);
    const deskripsi = data.weather[0].description.replace(/\b\w/g, char => char.toUpperCase());
    const kecepatanAnginKmh = (data.wind.speed * 3.6).toFixed(2);
    const waktuLokal = new Date((data.dt + data.timezone) * 1000).toUTCString().match(/(\d{2}:\d{2}:\d{2})/)[0];
    const ikonCuaca = {
      'Thunderstorm': '⛈️', 'Drizzle': '💧', 'Rain': '🌧️',
      'Snow': '❄️', 'Mist': '🌫️', 'Smoke': '💨', 'Haze': '🌫️',
      'Dust': '🌬️', 'Fog': '🌫️', 'Sand': '🏜️', 'Ash': '🌋',
      'Squall': '🌬️', 'Tornado': '🌪️', 'Clear': '☀️', 'Clouds': '☁️'
    };
    const ikon = ikonCuaca[data.weather[0].main] || '🌎';
    const pesanBalasan = `*${ikon} Prakiraan Cuaca untuk ${data.name}, ${data.sys.country}*\n` +
      `\`\`\`Waktu Lokal: ${waktuLokal}\`\`\`\n\n` +
      `*Cuaca :* ${deskripsi}\n` +
      `*Suhu :* ${data.main.temp}°C\n` +
      `*Terasa seperti :* ${data.main.feels_like}°C\n` +
      `*Kelembapan :* ${data.main.humidity}%\n` +
      `*Kecepatan Angin :* ${kecepatanAnginKmh} km/jam\n` +
      `*Tekanan Udara :* ${data.main.pressure} hPa\n\n` +
      `_*Sumber: OpenWeatherMap*_`;
    await sReply(pesanBalasan);
  }
};