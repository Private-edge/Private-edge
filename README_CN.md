# 🚀 Private Edge

![Version](https://img.shields.io/badge/version-1.1.15-blue?style=flat-square)
![Protocol](https://img.shields.io/badge/protocol-VLESS%2BWS-green?style=flat-square)
![Platform](https://img.shields.io/badge/platform-Cloudflare%20Workers-orange?style=flat-square)
![Tests](https://img.shields.io/badge/tests-103%20passing-brightgreen?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square)

[English](README.md) | [فارسی](README_FA.md) | **中文**

运行在 Cloudflare Workers 上的个人 **VLESS + WebSocket** 代理 — 支持 TCP 中继、带自动回退链的 DNS-over-HTTPS（针对伊朗网络优化）、ProxyIP、Early Data，并自动生成 **Xray / sing-box / v2rayNG** 的客户端配置。单文件、零依赖、免费套餐可用。

## ✨ 功能特性

- 🛡️ **基于 WebSocket 的 VLESS** — 支持 TLS 与 noTLS
- 🔀 **TCP 中继** — 多目标故障转移 + 重放缓冲
- 📡 **DNS UDP/53 → DoH** — 原生 IP 解析器回退链（`1.1.1.1 ← 8.8.8.8 ← 9.9.9.9 ← …`），可绕过基于 DNS 的封锁
- 🌐 **ProxyIP** — 三种模式：`fallback` / `always` / `off`
- ⚡ **Early Data**（`?ed=2560`）— 符合 RFC 6455 的子协议回显，v2rayNG / Xray 连接稳定
- 📦 **一个链接，所有客户端** — `vless://` URI、Xray JSON（旧版与新版）、sing-box JSON、Base64 订阅、noTLS、ECH
- 🔐 常数时间 UUID 校验、私网地址封锁、单 Worker 隧道数上限、封锁 25 端口
- 🎨 内置**伪装首页** — 通过变量完全自定义
- ✅ 103 项自动化测试 · 经过生产环境验证

## 🚀 部署 — 任选一种方式

### 方式一 · Cloudflare 控制台（最简单，约 2 分钟）

1. 打开 [`_worker.js`](_worker.js) 并复制全部内容
2. Cloudflare 控制台 → **Workers & Pages** → **Create Worker** → 编辑代码 → 粘贴 → **部署**
3. Worker → **Settings → Variables** → 添加：
   ```
   IDUS = 你的UUID
   ```
   （可在 [uuidgenerator.net](https://www.uuidgenerator.net) 生成）
4. 订阅链接即刻可用：

   ```
   https://your-worker.workers.dev/你的UUID?format=sub
   ```

### 方式二 · 一键部署

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/joker360x/Private-edge)

部署完成后，在 Worker 设置中添加 `IDUS` 变量。

### 方式三 · Cloudflare Pages

1. Fork 本仓库
2. 控制台 → Workers & Pages → Create → **Pages** → **Connect to Git** → 选择你的 Fork
3. 部署 — `_worker.js` 会被自动识别
4. Pages 项目 → Settings → **Environment variables** → 添加 `IDUS`

### 方式四 · Wrangler 命令行

```bash
git clone https://github.com/joker360x/Private-edge.git
cd Private-edge
npx wrangler secret put IDUS    # 输入你的 UUID
npx wrangler deploy
```

## 🔑 推荐变量

| 变量 | 示例值 | 说明 |
| :-- | :-- | :-- |
| `IDUS` | `00000000-0000-0000-0000-000000000000` | VLESS UUID — **唯一必填项** |
| `LND_MOD` | `all` | 伪装页模式：`all` / `root` / `off` |
| `MAX_TUN` | `6` | 最大并发隧道数（1–256） |
| `PDR` | `79.137.197.212` | ProxyIP 列表，逗号分隔（可选） |
| `PRX_MOD` | `fallback` | ProxyIP 模式：`fallback` / `always` / `off` |
| `DBG` | `false` | 调试日志 — 生产环境保持 `false` |
| `ECH_MOD` | `off` | Encrypted Client Hello 模式 |
| `DOH_URL` | `https://1.1.1.1/dns-query` | 主 DoH（原生 IP 可抵御 DNS 封锁） |
| `DOH_FBK_URL` | `https://8.8.8.8/dns-query` | 备用 DoH |
| `BLK_PRV` | `true` | 封锁私有/回环目标 — 保持 `true` |
| `CON_TMO_MS` | `8000` | TCP 连接超时（毫秒） |
| `DNS_TMO_MS` | `8000` | DoH 查询超时（毫秒） |
| `MAX_RPL_BYT` | `262144` | 重放缓冲上限（字节） |
| `PUB_HST` | `your-worker.workers.dev` | 生成配置中的公共主机（你的 Worker 地址） |
| `PUB_PRT` | `443` | 公共端口 |
| `FPR` | `chrome` | Xray / sing-box 的 uTLS 指纹 |
| `CFG_NAM` | `private-edge` | 配置/订阅名称 |
| `ERL_DAT` | `2560` | WebSocket Early Data 大小（字节） |
| `LOC_SCK_PRT` | `10808` | Xray 配置中的本地 SOCKS 端口 |
| `LOC_MIX_PRT` | `2080` | sing-box 配置中的本地 Mixed 端口 |
| `SUB_TKN` | `Cname` | 订阅令牌（query 或 Bearer）— 请使用长随机字符串 |

📋 **完整变量参考**（全部 36 个变量及默认值）→ **[VARIABLES.md](VARIABLES.md)** · English / فارسی / 中文

## 📱 订阅与客户端

基础链接：`https://your-worker.workers.dev/<UUID>`（若设置了 `SUB_TKN`，加上 `?token=…`）

| `format=` | 输出 |
| :-- | :-- |
| `sub` *（默认）* | Base64 订阅 — v2rayNG、v2rayN、NekoBox |
| `uri` / `link` | 纯 `vless://` URI |
| `notls` | 无 TLS URI（需自定义域名） |
| `core` / `legacy` / `modern` / `json` | Xray JSON 配置 |
| `sb` / `sing-box` | sing-box JSON 配置 |
| `ech` | ECH 状态（HTTPS DNS 记录查询） |

**已测试客户端：** v2rayNG · v2rayN · Xray-core (v25) · sing-box

## 📖 了解更多

- **[about.md](about.md)** — 协议、安全说明、性能与稳定性建议（English / فارسی / 中文）

## ⚠️ 重要说明

- `*.workers.dev` 在部分地区被封锁 — 建议绑定**自定义域名**以获得最佳可达性
- 免费套餐：**每天 100,000 次请求**（每个 WebSocket 连接 = 1 次请求），流量不限
- 请勿泄露你的 UUID 和 `SUB_TKN` — 它们就是代理的登录凭证
- `BLK_PRV` 必须保持 `true`；25 端口始终被封禁

## ⭐ 支持

[![Stars](https://img.shields.io/github/stars/joker360x/Private-edge?style=flat-square)](https://github.com/joker360x/Private-edge/stargazers)

如果这个项目对你有帮助，点个 ⭐ 星标就是最好的支持！

## 📋 许可证

[MIT](LICENSE) — © 2026 Private Edge
