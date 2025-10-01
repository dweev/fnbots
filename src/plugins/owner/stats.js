// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import os from 'os';
import util from 'util';
import fs from 'fs-extra';
import axios from 'axios';
import config from '../../../config.js';
import { exec as cp_exec } from 'child_process';
import { waktu, bytesToSize } from '../../function/index.js';
import { Command, Settings, User } from '../../../database/index.js';

const exec = util.promisify(cp_exec);
const cache = new Map();

export const command = {
  name: 'stats',
  category: 'owner',
  description: 'Menampilkan statistik bot dan server.',
  aliases: ['status', 'statistik'],
  isCommandWithoutPayment: true,
  execute: async ({ version, sReply }) => {
    const startTime = Date.now();
    const currentSettings = await Settings.getSettings();
    const [
      npmVersionData,
      diskData,
      virtData,
      ipInfo,
      packageJson,
      topCommands,
      userStats
    ] = await Promise.all([
      exec('npm -v').catch(() => ({ stdout: 'N/A' })),
      exec('df -h / | grep -v loop').catch(() => ({ stdout: '' })),
      exec('systemd-detect-virt || echo "N/A"').catch(() => ({ stdout: 'N/A' })),
      (async () => {
        const cacheKey = 'ipInfo';
        if (cache.has(cacheKey)) {
          return cache.get(cacheKey);
        }
        try {
          const response = await axios.get('https://ipinfo.io/json', { timeout: config.performance.defaultTimeoutMs });
          cache.set(cacheKey, response, config.performance.maxAgeHours);
          return response;
        } catch {
          return { data: {} };
        }
      })(),
      fs.readFile('./package.json', 'utf8').then(JSON.parse).catch(() => ({})),
      Command.getTopCommands(5),
      User.getUserStats().catch(() => ({ totalUsers: 0, activeUsers: 0 })),
    ]);
    const responseTime = Date.now() - startTime;
    const used = process.memoryUsage();
    const cpus = os.cpus();
    const cpuModel = cpus[0]?.model?.trim() || 'Unknown';
    const cpuCores = cpus.length;
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const nodeVersion = process.version;
    const hostname = os.hostname();
    const platform = os.platform();
    const release = os.release();
    const arch = os.arch();
    const load = os.loadavg().map(n => n.toFixed(2)).join(', ');
    const environment = process.env.NODE_ENV || 'development';
    const networkInterfaces = os.networkInterfaces();
    let ipv4Active = 'No', ipv6Active = 'No';
    for (const iface in networkInterfaces) {
      for (const details of networkInterfaces[iface]) {
        if (!details.internal) {
          if (details.family === 'IPv4') ipv4Active = 'Yes';
          if (details.family === 'IPv6') ipv6Active = 'Yes';
        }
      }
    }
    const npmVersion = npmVersionData.stdout?.toString()?.trim() || 'N/A';
    let diskUsed = 'N/A', diskTotal = 'N/A', diskPercent = 'N/A';
    const dfOutput = diskData.stdout?.toString()?.split('\n')[1];
    if (dfOutput) {
      const df = dfOutput.trim().split(/\s+/);
      if (df.length >= 5) {
        diskTotal = df[1] || 'N/A';
        diskUsed = df[2] || 'N/A';
        diskPercent = df[4] || 'N/A';
      }
    }
    let virtualization = virtData.stdout?.toString()?.trim() || 'N/A';
    virtualization = virtualization.toLowerCase() === 'none' ? 'Dedicated' : virtualization;
    const ip = (ipInfo.data?.ip || 'N/A').replace(/^(\d+)\.\d+\.\d+\.\d+$/, '$1.x.x.x');
    const region = ipInfo.data?.country || 'N/A';
    const isp = ipInfo.data?.org || 'N/A';
    const dependencies = packageJson.dependencies || {};
    const devDependencies = packageJson.devDependencies || {};
    const totalModules = Object.keys(dependencies).length + Object.keys(devDependencies).length;
    let topCommandsText = '';
    if (topCommands && topCommands.length > 0) {
      topCommandsText += `*❏ TOP 5 COMMANDS*\n`;
      topCommandsText += topCommands.map((cmd, index) => `> ${index + 1}. ${cmd.name} (${cmd.count} uses)`).join('\n') + '\n\n';
    }
    let message = '';
    message += `*❏ BOT PERFORMANCE STATS*\n`;
    message += `> Response Time: ${responseTime}ms\n`;
    message += `> Environment: ${environment}\n`;
    message += `> Node.js: ${nodeVersion}\n`;
    message += `> NPM: ${npmVersion}\n`;
    message += `> Bot Uptime: ${waktu(process.uptime())}\n`;
    message += `> System Uptime: ${waktu(os.uptime())}\n`;
    message += `> Load Average: ${load}\n\n`;
    message += `*❏ MEMORY USAGE*\n`;
    message += `> System RAM: ${bytesToSize(usedMem)}/${bytesToSize(totalMem)} (${((usedMem / totalMem) * 100).toFixed(2)}%)\n`;
    message += Object.keys(used).map(key => `> ${key}: ${bytesToSize(used[key])}`).join('\n') + '\n\n';
    message += `*❏ USAGE STATISTICS*\n`;
    message += `> Total Users: ${userStats.totalUsers || 0}\n`;
    message += `> Active Users (7d): ${userStats.activeUsers || 0}\n`;
    message += `> Total Commands: ${currentSettings?.totalHitCount || 0}\n`;
    message += `> Installed Modules: ${totalModules}\n\n`;
    message += `*❏ SYSTEM INFO*\n`;
    message += `> Hostname: ${hostname}\n`;
    message += `> CPU: ${cpuModel}\n`;
    message += `> Cores/Threads: ${cpuCores}\n`;
    message += `> Platform: ${platform}\n`;
    message += `> OS: ${release}\n`;
    message += `> Arch: ${arch}\n`;
    message += `> Virtualization: ${virtualization}\n`;
    message += `> IPv4: ${ipv4Active}\n`;
    message += `> IPv6: ${ipv6Active}\n`;
    message += `> Disk: ${diskUsed}/${diskTotal} (${diskPercent})\n\n`;
    message += `*❏ NETWORK INFO*\n`;
    message += `> IP: ${ip}\n`;
    message += `> Region: ${region}\n`;
    message += `> ISP: ${isp}\n\n`;
    message += topCommandsText;
    message += `*❏ BOT INFO*\n`;
    message += `> Version: ${packageJson.version || 'Unknown'}\n`;
    message += `> WhatsApp: ${version?.join('.') || 'Unknown'}\n`;
    await sReply(message.trim());
  }
};