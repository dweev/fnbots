// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { User, Command, Settings } from '../../database/index.js';
import { waktu, bytesToSize } from '../utils/function.js';
import os from 'os';
import fs from 'fs-extra';
import axios from 'axios';
import util from 'util';
import { exec as cp_exec } from 'child_process';
const exec = util.promisify(cp_exec);

export const command = {
    name: 'stats',
    category: 'owner',
    description: 'Menampilkan statistik bot dan server.',
    aliases: ['status', 'info'],
    execute: async ({ m, version, sReply }) => {
        const currentSettings = await Settings.getSettings();
        const [npmVersionData, diskData, virtData, ipInfo, packageJson] = await Promise.all([
            exec('npm -v').catch(() => ({ stdout: 'N/A' })),
            exec('df -h /').catch(() => ({ stdout: '' })),
            exec('systemd-detect-virt').catch(() => ({ stdout: 'N/A' })),
            axios.get('https://ipinfo.io/json').catch(() => ({ data: {} })),
            fs.readFile('./package.json', 'utf8').then(JSON.parse).catch(() => ({}))
        ]);
        const used = process.memoryUsage();
        const cpus = os.cpus();
        const cpuModel = cpus[0].model.trim();
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
        const npmVersion = npmVersionData.stdout.trim();
        let diskUsed = 'N/A', diskTotal = 'N/A', diskPercent = 'N/A';
        const dfOutput = diskData.stdout.toString().split('\n')[1];
        if (dfOutput) {
            const df = dfOutput.trim().split(/\s+/);
            diskTotal = df[1] || 'N/A';
            diskUsed = df[2] || 'N/A';
            diskPercent = df[4] || 'N/A';
        }
        let virtualization = virtData.stdout.toString().trim();
        virtualization = virtualization.toLowerCase() === 'none' ? 'Dedicated' : virtualization;
        const ip = (ipInfo.data.ip || 'N/A').replace(/^(\d+)\.\d+\.\d+\.\d+$/, '$1.x.x.x');
        const region = ipInfo.data.country || 'N/A';
        const isp = ipInfo.data.org || 'N/A';
        const dependencies = packageJson.dependencies || {};
        const devDependencies = packageJson.devDependencies || {};
        const totalModules = Object.keys(dependencies).length + Object.keys(devDependencies).length;
        let a = '';
        a += `*❏ BOT STATISTICS*\n`;
        a += `> WhatsApp Version: ${version?.join('.') || 'Unknown'}\n`;
        a += `> Node.js: ${nodeVersion}\n`;
        a += `> NPM: ${npmVersion}\n`;
        a += `> Installed Modules: ${totalModules}\n`;
        a += `> Total Perintah Dijalankan: ${currentSettings?.totalHitCount || 0}\n`;
        a += `> Bot Version: ${packageJson.version || 'Unknown'}\n`;
        a += `> Bot Uptime: ${waktu(process.uptime())}\n`;
        a += `> System Uptime: ${waktu(os.uptime())}\n`;
        a += `> Load Average (1m,5m,15m): ${load}\n\n`;
        a += `*❏ Node.js Memory Usage*\n`;
        a += Object.keys(used).map(key => `> ${key}: ${bytesToSize(used[key])}`).join('\n') + '\n\n';
        a += `*❏ INFO SERVER*\n`;
        a += `> Hostname: ${hostname}\n`;
        a += `> CPU Model: ${cpuModel}\n`;
        a += `> CPU Core/Threads: ${cpuCores}\n`;
        a += `> Platform: ${platform}\n`;
        a += `> OS: ${release}\n`;
        a += `> Kernel Arch: ${arch}\n`;
        a += `> Virtualization: ${virtualization}\n`;
        a += `> IPv4 Active: ${ipv4Active}\n`;
        a += `> IPv6 Active: ${ipv6Active}\n`;
        const ramPercentage = totalMem > 0 ? ((usedMem / totalMem) * 100).toFixed(2) + '%' : 'N/A';
        a += `> Ram: ${bytesToSize(usedMem)} / ${bytesToSize(totalMem)} (${ramPercentage})\n`;
        a += `> Disk: ${diskUsed} / ${diskTotal} (${diskPercent})\n\n`;
        a += `*❏ PROVIDER INFO*\n`;
        a += `> IP: ${ip}\n`;
        a += `> Region: ${region}\n`;
        a += `> ISP: ${isp}`;
        await sReply(a.trim());
        await Command.findOneAndUpdate({ name: command.name }, { $inc: { count: 1 } }, { upsert: true });
        await User.findOneAndUpdate({ userId: m.sender }, { $inc: { [`commandStats.${command.name}`]: 1 } }, { upsert: true });
    }
};