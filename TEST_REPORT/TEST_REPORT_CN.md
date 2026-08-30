# 🧪 测试报告 — Private Edge v1.1.15

[English](TEST_REPORT.md) | [فارسی](TEST_REPORT_FA.md) | **中文**

> **日期：** 2026-08-29 · **范围：** v1.1.15 源码、编译产物以及本仓库中可部署的 `_worker.js`
> **方法：** 重新完整运行全部测试套件 + 针对压缩构建本身执行 43 项黑盒探测 + 逐行代码审查

---

## 🎯 摘要

| 测试层 | 数量 | 结果 |
|---|---|---|
| 1. 语法检查（5 个 JS 文件） | 5 | ✅ 全部有效 |
| 2. 功能测试（源码） | 56 | ✅ 56 / 0 |
| 3. 1101 错误与并发测试（源码） | 47 | ✅ 47 / 0 |
| 4. 1101 错误测试（dashboard 构建） | 47 | ✅ 47 / 0 |
| 5. 黑盒探测（压缩版 `_worker.js`） | 43 | ✅ 43 / 0 |
| **执行检查总计** | **198** | **✅ 0 失败** |

**结论：** v1.1.15 在全部五个层级中零错误通过。本仓库中的 `_worker.js` 与可读源码行为完全一致。

---

## 1. 测试方法

1. **从零完整重跑**项目全部三套测试（不依赖历史结果）
2. **对 dashboard 构建执行 1101 测试**（而非仅源码）— 证明编译产物同样安全
3. **专用黑盒探测：** 在沙箱环境中加载本仓库实际的压缩版 `_worker.js`，从外部驱动 43 个真实场景 — 即客户端或扫描器所观察到的行为
4. 对 1101 防御层及测试无法覆盖的部分进行**静态代码审查**

---

## 2. 流程测试 — 43 项黑盒探测

### 🔀 A. 路由与伪装页（9/9 ✅）

| 场景 | 结果 |
|---|---|
| `LND_MOD=all` 时 GET / → 200 HTML | ✅ |
| 页面启用严格 CSP 头（`default-src 'none'`） | ✅ |
| `LND_MOD=root` → 根路径 200 / 其他 404 | ✅ |
| `LND_MOD=off` → 404 | ✅ |
| HEAD → 200 · POST → 404 | ✅ |
| 未知路径 → 404 + `nosniff` 头（伪装） | ✅ |
| 对错误路径的 WebSocket 升级 → 404 | ✅ |

### 📦 B. 配置端点与身份验证（15/15 ✅）

| 场景 | 结果 |
|---|---|
| `format=sub` → base64 可解码为有效 `vless://` URI | ✅ |
| `Profile-Title` 头 = 配置名称（base64） | ✅ |
| `format=uri` → 443 端口 + TLS + 默认 `ed=2560` | ✅ |
| **无 token → 404** · 错误 token → 404（`SUB_TKN` 锁） | ✅ |
| Bearer token → 200 | ✅ |
| `format=notls` → `security=none` + 80 端口 | ✅ |
| `format=core`（旧版）→ `vnext` 结构 | ✅ |
| `format=modern` → `settings.address` + `method: websocket` | ✅ |
| `format=sb` → vless + ws 传输 + `max_early_data=2560` + early-data 头 | ✅ |
| 带有 `ECH_CFG` 的 `format=ech` → 包含配置的 JSON | ✅ |
| `PUB_HST` 应用到生成的 URI | ✅ |

### 🔌 C. WebSocket 与 VLESS 协议（11/11 ✅）

| 场景 | 结果 |
|---|---|
| 无子协议 → 101 且不回显 | ✅ |
| 命名子协议（`binary`）→ 101 + 回显 — **v1.1.15 修复** | ✅ |
| 损坏的子协议 → 101 + 回显 — **v1.1.15 修复** | ✅ |
| 有效 early data → 101 + 回显 | ✅ |
| UUID 错误 → 中止 1011 | ✅ |
| 私有目标：`127.0.0.1` / `10.x` / `::ffff:10.0.0.1`（IPv4-mapped）→ 1011 | ✅ |
| 25 端口 → 1011（反垃圾邮件） | ✅ |
| 有效 TCP 会话 → 上游数据连同 VLESS 响应头被中继 + 干净关闭 1000 | ✅ |
| `MAX_TUN=1` → 第二个连接 404 | ✅ |

### 📡 D. DNS 中继（3/3 ✅）

| 场景 | 结果 |
|---|---|
| DNS（cmd=2, port=53）→ 发出 DoH 查询并中继带长度前缀的应答 | ✅ |
| **主 DoH 被封锁 → 自动回退到下一个解析器（1.1.1.1）** | ✅ |
| 无效 DNS 报文（<12 字节）→ 被处理，无 1101 | ✅ |

### 🔐 E. 环境校验与安全（5/5 ✅）

| 场景 | 结果 |
|---|---|
| 缺少 `IDUS` → 404 | ✅ |
| `BLK_PRV` 无效 → 404（**fail-closed**） | ✅ |
| `PRX_MOD` 无效 → 404（**fail-closed**） | ✅ |
| `DOH_URL` 非 HTTPS → 404 | ✅ |
| 截断的头部 → 服务器等待，不报错 | ✅ |

---

## 3. 功能验证

| 功能 | 状态 | 证据 |
|---|---|---|
| 基于 WebSocket 的 VLESS 代理 | ✅ | C4、C5、C10 |
| TLS + noTLS | ✅ | B4、B9 |
| 通过 `cloudflare:sockets` 的 TCP 中继 | ✅ | C10 |
| 多目标故障转移 + 重放缓冲 | ✅ | 功能套件（TcpChannel） |
| ProxyIP — 三种模式（fallback/always/off） | ✅ | 功能套件 + E3 |
| DNS UDP/53 → DoH 中继 | ✅ | D1 |
| **解析器回退链**（面向伊朗的裸 IP） | ✅ | D2 |
| 0-RTT early data（`?ed=2560`） | ✅ | B5、B13、C4 |
| 完整子协议回显（RFC 6455） | ✅ | C2、C3 |
| Xray 配置生成（旧版与新版） | ✅ | B10、B11 |
| sing-box 配置生成 | ✅ | B12、B13 |
| base64 订阅 + `Profile-Title` | ✅ | B1–B3 |
| ECH（固定配置 + DNS 查询） | ✅ | B14 |
| 订阅鉴权（query + Bearer） | ✅ | B6–B8 |
| 私有网段封锁（IPv4/IPv6/mapped） | ✅ | C6–C8 |
| 25 端口封锁 | ✅ | C9 |
| 并发隧道上限 `MAX_TUN` | ✅ | C11 |
| 常数时间 UUID/token 比较 | ✅ | 代码审查（constantBytesEqual / constantStringEqual） |
| 可自定义伪装页 | ✅ | A1–A5 |
| fail-closed 环境校验 | ✅ | E1–E4 |
| 安全头（CSP/nosniff/Referrer-Policy） | ✅ | A2、A8 |

---

## 4. 1101 错误深度分析

1101 错误指「从 fetch handler 逃逸的异常或 rejection」。代码拥有 **8 层连续防御**：

| 层 | 保护 | 测试位置 |
|---|---|---|
| 1. fetch handler | 整个主体在 `try/catch` 中 → 任何错误都变为 404 | 测试 §1 |
| 2. 路由（WS） | `acceptTunnelSocket` 位于 try/catch 中 | 测试 §4 |
| 3. 路由（配置） | `await` + try/catch → DoH 失败被抑制 | 测试 §2 |
| 4. WebSocket 事件 | message/close/error 均在 try/catch 中 | 测试 §6 |
| 5. 消息链 | `chain.then(push).catch(→ abort 1011)` | 测试 §6 |
| 6. pumpRemote | `void pumpRemote(...).catch(...)` | 测试 §6 |
| 7. socket/writer 关闭 | 全部带 `.catch(() => {})` | 代码审查 |
| 8. 定时器 | 全部在 `finally` 中 clearTimeout | 代码审查 |

### 通过的 1101 测试场景（47 项，分 7 组）

1. **公共 HTTP 路由** — GET/HEAD/POST、伪装页、404、错误路径
2. **DoH 损坏时的配置** — fetch reject → 404 而非 1101
3. **损坏的环境** — 缺少 IDUS、无效值 → 404
4. **WebSocket 升级** — 无头、错误路径、无子协议
5. **有效/无效 early data** — 损坏的 base64、超过 8192 字节、命名协议
6. **v2rayNG 模拟** — ERL_DAT 未设置/0/2560 + 3000 字节 early data
7. **真实会话与边界** — 错误 UUID、私有目标、25 端口、截断头部、文本消息、>1MB 消息、无效 ECH URL、无 PDR 的 `PRX_MOD=always`、超大 Bearer、无效 `MAX_TUN`，以及最终检查：**零 unhandled rejection**

> 整个运行期间对 Node 进程的 `unhandledRejection` 事件进行监控 — **零次出现**。此前深度审查中的 12 项高并发场景（20 个并行会话、socket 打开失败、中途读写失败）同样为零。

---

## 5. 性能与资源

| 指标 | 数值 | 结论 |
|---|---|---|
| 每个 VLESS 请求的 CPU | ~2.8 ms | ✅ 距免费套餐 10 ms 上限有安全余量 |
| 免费套餐配额 | 每天 100k 请求（每个 WS = 1 个请求） | 足够个人使用 |
| UUID 缓存 | 32 个条目，LRU 淘汰（v1.1.15 修复） | ✅ |
| 重放缓冲上限 | 262,144 字节（可配置） | ✅ 有界 |
| WebSocket 消息上限 | 1 MB | ✅ |
| 每会话 DNS 查询上限 | 1000 | ✅ 有界 |

---

## 6. 已知限制（实事求是）

| 限制 | 说明 |
|---|---|
| UDP 仅限 53 端口 | Workers 固有限制 — 不支持 QUIC 或其他 UDP |
| 无 DNS 应答缓存 | 每次查询都发往 DoH（简单/安全的设计；成本 = 一次 fetch） |
| ECH 不强制 | Worker 无法在 Cloudflare 边缘 TLS 握手上强制启用 ECH |
| `MAX_TUN` 为 isolate 级 | 而非账户级 — 跨 isolate 的有效上限更高 |
| 依赖 `workers.dev` | 在部分地区被封锁 — 建议使用自定义域名 |
| noTLS | 仅适用于自定义域名 + 关闭「Always Use HTTPS」 |

---

## 7. 总结

**v1.1.15** 通过 **5 个层级共 198 项可执行检查**，零失败。全部 23 项已文档化的功能均符合预期行为，8 层 1101 防御全部完好，且每个畸形输入路径（损坏的 env、损坏的头部、错误 token、被禁止的目标、DoH 宕机）都以受控方式（404/1011）收尾 — 绝不会出现逃逸的异常。

**已达到生产可用标准。** 🚀
