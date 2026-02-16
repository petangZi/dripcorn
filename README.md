# 🦄 DripCorn V2 - Professional Security Testing Framework

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![Python](https://img.shields.io/badge/python-%3E%3D3.9-blue)

**Python-Node.js Fusion Framework** with 30+ attack vectors, 15+ bypass techniques, and professional security testing capabilities.

---

## ⚠️ LEGAL DISCLAIMER

**READ CAREFULLY BEFORE USE**

This framework is designed EXCLUSIVELY for:
- ✅ **Legal Penetration Testing** (with written authorization)
- ✅ **Security Research** (in authorized environments)
- ✅ **Authorized Stress Testing** (own infrastructure only)

**STRICTLY PROHIBITED:**
- ❌ Unauthorized system access
- ❌ Attacks without explicit permission
- ❌ Any illegal activities
- ❌ Script kiddie behavior

**YOU ARE SOLELY RESPONSIBLE** for your actions. Unauthorized use is illegal and punishable by law under:
- Computer Fraud and Abuse Act (USA)
- Computer Misuse Act (UK)
- EU Cybersecurity Directives
- Your local jurisdiction laws

---

## 🚀 Quick Start

### Installation
```bash
# Clone repository
git clone https://github.com/redops/dripcorn-v2
cd dripcorn-v2

# Install dependencies
npm run setup

# Or manual installation:
npm install
pip install -r requirements.txt --break-system-packages
```

### First Run
```bash
# Start framework
npm start

# Or directly
node index.js
```

### 2FA Setup

On first run, you'll be prompted to:
1. Scan QR code with authenticator app
2. Enter 6-digit verification code
3. Save your secret key securely

---

## 🎯 Features

### 30+ Attack Vectors

#### Layer 7 (HTTP/HTTPS)
- 🌊 HTTP Flood (GET/POST/PUT)
- 🐌 Slowloris (Connection Exhaustion)
- 🐢 Slow POST (R.U.D.Y)
- 📖 Slow Read
- 💥 Cache Buster
- 🍪 Cookie Bomb
- 🔄 Redirect Loop

#### Layer 4 (TCP/UDP)
- 🎯 SYN Flood (requires root)
- 📡 UDP Flood
- ✅ ACK Flood
- 🛑 RST Flood
- 🏓 ICMP Flood

#### Modern Protocols
- ⚡ HTTP/2 Rapid Reset (CVE-2023-44487)
- 🔌 WebSocket Flood
- 📡 Server-Sent Events

#### Application DoS
- 💣 XML Bomb (Billion Laughs)
- 💥 JSON Bomb
- #️⃣ Hash Collision
- 🔁 ReDoS (Regex DoS)
- 🔥 CPU Exhaustion

#### SSL/TLS Attacks
- 🔐 SSL Renegotiation
- 🔒 SSL Exhaustion
- 🛡️ TLS Flood

### 15+ Bypass Techniques

- 🔄 IP Rotation
- 🔗 Proxy Chain (HTTP/SOCKS5)
- 🎭 User-Agent Rotation
- 📝 Header Randomization
- 🔐 TLS Fingerprint Spoofing
- ⏰ Timing Randomization
- 🌐 Browser Emulation
- 🍪 Cookie Management
- ☁️ CloudFlare Bypass
- 🛡️ WAF Evasion

---

## 📚 Usage Examples

### Basic HTTP Flood
```bash
# Launch framework
npm start

# Select: Attack Vectors > Layer 7 > HTTP Flood
# Enter target: http://localhost:3000
# Configure: duration=30, rps=100
# Confirm disclaimers and launch
```

### SYN Flood (Advanced)
```bash
# Requires sudo privileges
sudo npm start

# Select: Attack Vectors > Layer 4 > SYN Flood
# Enter target: 192.168.1.100
# Port: 80
# Packets/sec: 1000
# Duration: 30
```

### Proxy Rotation Test
```bash
npm start

# Select: Bypass Techniques > Proxy Rotation
# Framework will test all proxies
# Shows working vs failed proxies
```

---

## 🛡️ Security Features

### Triple Disclaimer System

1. **Startup Disclaimer** - Legal terms before framework access
2. **Pre-Attack Disclaimer** - Authorization confirmation before each attack
3. **Audit Logging** - All actions logged with timestamps

### 2FA Authentication

- TOTP-based two-factor authentication
- Required before framework access
- QR code setup with authenticator apps
- Encrypted secret storage

### Comprehensive Logging

All actions logged to: `~/.dripcorn/logs/audit.log`

Log includes:
- Timestamp
- User information
- System details
- Attack parameters
- Target information

---

## 🔧 Configuration

### Environment Variables

Create `.env` file:
```env
# Proxy Configuration
HTTP_PROXY=http://proxy.example.com:8080
SOCKS_PROXY=socks5://proxy.example.com:1080

# 2Captcha API (for CAPTCHA bypass)
CAPTCHA_API_KEY=your_api_key_here

# Monitoring
MONITOR_PORT=8080
```

### Custom Proxy List

Create `proxies.txt`:
```
http://proxy1.example.com:8080
http://proxy2.example.com:8080
socks5://proxy3.example.com:1080
```

---

## 📊 Statistics & Reporting

View attack statistics:
- Total attacks launched
- Success/failure rates
- Attack duration and metrics
- Target information
- Timestamp logs

Access via: Main Menu > Statistics

---

## 🐛 Troubleshooting

### Python Not Found
```bash
# Install Python 3.9+
# macOS
brew install python3

# Ubuntu/Debian
sudo apt install python3 python3-pip

# Windows
# Download from python.org
```

### Scapy Permission Denied
```bash
# SYN Flood requires root
sudo python3 attacks/syn_flood.py <args>

# Or run framework with sudo
sudo npm start
```

### Dependencies Issues
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Python deps
pip install -r requirements.txt --break-system-packages
```

---

## 🤝 Use Cases

### 1. Legal Penetration Testing

**Scenario:** Testing client web application security
```
1. Obtain written authorization
2. Launch DripCorn V2
3. Test various attack vectors
4. Document vulnerabilities
5. Generate report for client
```

### 2. Security Research

**Scenario:** Researching new DoS mitigation techniques
```
1. Set up isolated lab environment
2. Deploy test infrastructure
3. Launch controlled attacks
4. Measure mitigation effectiveness
5. Publish findings
```

### 3. Authorized Stress Testing

**Scenario:** Testing own infrastructure resilience
```
1. Deploy target on own servers
2. Configure monitoring
3. Launch graduated attacks
4. Identify bottlenecks
5. Implement improvements
```

---

## 📖 Documentation

Full documentation available in `docs/` directory:

- `ATTACKS.md` - Detailed attack vector documentation
- `BYPASS.md` - Bypass technique guides
- `API.md` - Framework API reference
- `LEGAL.md` - Legal compliance guide

---

## 🛠️ Development

### Project Structure
```
dripcorn-v2/
├── index.js              # Main framework
├── package.json          # Node dependencies
├── requirements.txt      # Python dependencies
├── attacks/
│   ├── syn_flood.py     # SYN flood script
│   └── dns_amp.py       # DNS amplification
├── docs/                # Documentation
└── logs/                # Audit logs
```

### Contributing

Contributions welcome! Please:
1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open pull request

---

## 📄 License

MIT License - see LICENSE file

---

## 🙏 Credits

Developed by **RedOps Security Lab**

Special thanks to the security research community.

---

## ⚡ Support

- Issues: GitHub Issues
- Docs: `/docs` directory
- Email: security@redops.lab

---

## 🔒 Responsible Disclosure

Found a vulnerability? Please report responsibly:

1. Do NOT publicly disclose
2. Email: security@redops.lab
3. Include detailed POC
4. Allow time for patch

We appreciate responsible security researchers.

---

**Remember: Stay legal. Stay ethical. Stay safe.** 🦄✨
