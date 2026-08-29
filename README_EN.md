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

## 🚀 Deploy — pick your method

### Method 1 · Cloudflare Dashboard (easiest, ~2 min)

1. Open [`_worker.js`](_worker.js) and copy its content
2. Cloudflare Dashboard → **Workers & Pages** → **Create Worker** → Edit code → paste → **Deploy**
3. Worker → **Settings → Variables** → add:
   ```
   IDUS = your-uuid-here
   ```
   (generate a UUID at [uuidgenerator.net](https://www.uuidgenerator.net))
4. Your subscription link is ready:

   ```
   https://your-worker.workers.dev/your-uuid?format=sub
   ```

### Method 2 · One-click deploy

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Private-edge/Private-edge)

After deployment, set the `IDUS` variable in your Worker settings.

### Method 3 · Cloudflare Pages

1. Fork this repository
2. Dashboard → Workers & Pages → Create → **Pages** → **Connect to Git** → select your fork
3. Deploy — `_worker.js` is detected automatically
4. Pages project → Settings → **Environment variables** → add `IDUS`

### Method 4 · Wrangler CLI

```bash
git clone https://github.com/joker360x/Private-edge.git
cd Private-edge
npx wrangler secret put IDUS    # paste your UUID
npx wrangler deploy
```

## 🔑 Suggested variables

| Variable | Example value | Description |
| :-- | :-- | :-- |
| `IDUS` | `00000000-0000-0000-0000-000000000000` | VLESS UUID — **the only required setting** |
| `LND_MOD` | `all` | Cover page mode: `all` / `root` / `off` |
| `MAX_TUN` | `6` | Max simultaneous tunnels (1–256) |
| `PDR` | `79.137.197.212` | ProxyIP list, comma-separated (optional) |
| `PRX_MOD` | `fallback` | ProxyIP mode: `fallback` / `always` / `off` |
| `DBG` | `false` | Debug logging — keep `false` in production |
| `ECH_MOD` | `off` | Encrypted Client Hello mode |
| `DOH_URL` | `https://1.1.1.1/dns-query` | Primary DoH (raw IP resists DNS filtering) |
| `DOH_FBK_URL` | `https://8.8.8.8/dns-query` | Fallback DoH |
| `BLK_PRV` | `true` | Block private/loopback destinations — keep `true` |
| `CON_TMO_MS` | `8000` | TCP connect timeout (ms) |
| `DNS_TMO_MS` | `8000` | DoH query timeout (ms) |
| `MAX_RPL_BYT` | `262144` | Replay buffer cap (bytes) |
| `PUB_HST` | `your-worker.workers.dev` | Public host used in generated configs (your Worker address) |
| `PUB_PRT` | `443` | Public port |
| `FPR` | `chrome` | uTLS fingerprint for Xray / sing-box |
| `CFG_NAM` | `private-edge` | Profile / config name |
| `ERL_DAT` | `2560` | WebSocket early data size (bytes) |
| `LOC_SCK_PRT` | `10808` | Local SOCKS port in generated Xray config |
| `LOC_MIX_PRT` | `2080` | Local mixed port in generated sing-box config |
| `SUB_TKN` | `Cname` | Subscription token (query or Bearer) — use a long random secret |

📋 **Complete variable reference** (all 36 variables, all defaults) → **[VARIABLES.md](VARIABLES.md)** · English / فارسی / 中文

## 📱 Subscription & clients

Base link: `https://your-worker.workers.dev/<UUID>` (add `?token=…` if `SUB_TKN` is set)

| `format=` | Output |
| :-- | :-- |
| `sub` *(default)* | base64 subscription — v2rayNG, v2rayN, NekoBox |
| `uri` / `link` | plain `vless://` URI |
| `notls` | no-TLS URI (requires a custom domain) |
| `core` / `legacy` / `modern` / `json` | Xray JSON config |
| `sb` / `sing-box` | sing-box JSON config |
| `ech` | ECH status (HTTPS DNS record lookup) |

**Tested clients:** v2rayNG · v2rayN · Xray-core (v25) · sing-box

## 📖 Learn more

- **[about.md](about.md)** — protocols, security notes, performance & stability tips (English / فارسی / 中文)

## ⚠️ Important notes

- `*.workers.dev` is filtered in some regions — **bind a custom domain** for the best reachability
- Free plan: **100,000 requests/day** (each WebSocket connection = 1 request), traffic is unlimited
- Keep your UUID and `SUB_TKN` private — they *are* your proxy's credentials
- `BLK_PRV` must stay `true`; port 25 is always blocked

## ⭐ Support

[![Stars](https://img.shields.io/github/stars/joker360x/Private-edge?style=flat-square)](https://github.com/joker360x/Private-edge/stargazers)

If this project helped you, a ⭐ star is the best support!

## 📋 License

[MIT](LICENSE) — © 2026 Private Edge
