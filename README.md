# 🚀 Private Edge

![Version](https://img.shields.io/badge/version-1.1.15-blue?style=flat-square)
![Protocol](https://img.shields.io/badge/protocol-VLESS%2BWS-green?style=flat-square)
![Platform](https://img.shields.io/badge/platform-Cloudflare%20Workers-orange?style=flat-square)
![Tests](https://img.shields.io/badge/tests-103%20passing-brightgreen?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square)

**English** | [فارسی](README_FA.md) | [中文](README_CN.md)

A personal **VLESS + WebSocket** edge proxy on Cloudflare Workers — TCP relay, DNS-over-HTTPS with automatic fallback chain (tuned for Iran), ProxyIP support, early data, and auto-generated client configs for **Xray / sing-box / v2rayNG**. One file, zero dependencies, works on the free plan.

## ✨ Features

- 🛡️ **VLESS over WebSocket** — TLS and noTLS
- 🔀 **TCP relay** with multi-target failover and replay buffer
- 📡 **DNS UDP/53 → DoH** with a fallback chain of raw-IP resolvers (`1.1.1.1 ← 8.8.8.8 ← 9.9.9.9 ← …`) that survive DNS-based filtering
- 🌐 **ProxyIP** — three modes: `fallback` / `always` / `off`
- ⚡ **Early data** (`?ed=2560`) with RFC 6455-compliant subprotocol echo — stable connections on v2rayNG / Xray
- 📦 **One link, every client** — `vless://` URI, Xray JSON (legacy & modern), sing-box JSON, base64 subscription, noTLS, ECH
- 🔐 Constant-time UUID check, private-network blocking, per-Worker tunnel cap, port 25 blocked
- 🎨 Built-in **cover page** (camouflage) — fully customizable via variables
- ✅ 103 automated tests · production-tested

## ⭐ Support

[![Stars](https://img.shields.io/github/stars/joker360x/Private-edge?style=flat-square)](https://github.com/joker360x/Private-edge/stargazers)

If this project helped you, a ⭐ star is the best support!

## 📄 License

[MIT](LICENSE) — © 2026 Private Edge
