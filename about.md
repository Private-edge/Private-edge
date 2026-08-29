# 📖 About Private Edge

**English** · **فارسی** · **中文**

---

## 🇬🇧 English

### What is Private Edge?

Private Edge is a **single-file personal proxy** that runs on Cloudflare's global network (Workers). You deploy it with your own UUID in under two minutes, and it speaks the **VLESS** protocol over **WebSocket** — the combination that works best behind aggressive filtering, because to any middlebox it just looks like ordinary HTTPS traffic to Cloudflare.

It is designed for one person (or a small group): no database, no accounts, no admin panel to attack. Your UUID *is* the credential.

### Protocols & compatibility

| Layer | Choice | Why |
| :-- | :-- | :-- |
| Proxy protocol | VLESS (no extra encryption — TLS does that) | Lowest overhead, best client support |
| Transport | WebSocket + TLS (or plain WS / noTLS on a custom domain) | Looks like normal web traffic |
| Early data | 0-RTT via `?ed=2560` + `Sec-WebSocket-Protocol` | Faster connection start, v2rayNG-friendly |
| DNS | UDP/53 relayed to DoH with an automatic fallback chain | Keeps DNS working when DoH domains are blocked |
| ECH | Config generation + HTTPS-record lookup | Optional, for advanced setups |
| TCP | Direct relay via `cloudflare:sockets` with multi-target failover + replay | Survives flaky routes to the destination |

**Tested clients:** v2rayNG, v2rayN, Xray-core (v25), sing-box.
**Config outputs:** `vless://` URI · Xray JSON (legacy & modern) · sing-box JSON · base64 subscription · noTLS · ECH.

### Security notes

- **UUID is your password.** Generate it randomly, never reuse one from a tutorial. Comparison is constant-time.
- **`SUB_TKN`** adds a second lock on the config endpoint (query or Bearer token).
- **Private networks are blocked** (`BLK_PRV`): loopback, link-local, RFC-1918, CGNAT, IPv4-mapped IPv6, cloud metadata endpoints. Fail-closed: a typo in this variable kills the Worker at startup instead of silently disabling protection.
- **Port 25 is always blocked** (no spam relay) and `MAX_TUN` caps simultaneous tunnels per Worker.
- **Cover page** — the Worker serves a normal-looking app page on public paths, not a proxy banner.
- Keep `DBG = "false"` in production; logs may contain destination hosts.

### Performance & resource usage

- **CPU:** ~2–3 ms per request on average — comfortably below the free plan's 10 ms limit.
- **Free plan quota:** 100,000 requests/day, and *each WebSocket connection counts as one request*. Traffic volume is unlimited.
- **Lower `MAX_TUN`** (e.g. 6) = fewer concurrent tunnels = lower CPU and memory.
- **DNS:** every UDP/53 query is relayed to DoH upstreams; the resolver chain tries the next server on timeout, so you don't pay double latency for a dead resolver more than once.
- A reconnect-looping client burns quota fast. Stable connections (see below) are also the cheapest ones.

### Stable, healthy connections

- `ERL_DAT = 2560` (default) puts early data in the WebSocket path — this is what v2rayNG expects; leaving it off can cause disconnect loops on some clients.
- The server always **echoes the `Sec-WebSocket-Protocol` header** when a client sends one (RFC 6455) — clients that require the echo no longer drop the connection.
- `CON_TMO_MS` / `DNS_TMO_MS` (8000 ms by default) fail over quickly instead of hanging.
- The **replay buffer** re-sends your first packets to a backup target (ProxyIP via `PDR`) when a direct route fails mid-handshake — no client-side retry needed.
- If `*.workers.dev` is unstable in your region, **bind a custom domain** and (optionally) set `PUB_HST`/`HST_HDR` to it. Turn off "Always Use HTTPS" on that domain if you need noTLS.

### Good to know

- **ProxyIP (`PDR` + `PRX_MOD`)** helps when Cloudflare's direct route to a destination is blocked — traffic exits via your listed IP instead. `fallback` (default) only uses it when needed.
- **DoH with raw IPs** (`https://1.1.1.1/dns-query`) works even when DoH *domains* are filtered — that's why it's the suggested default.
- The project ships with **103 automated tests** (protocol, security, concurrency, error-handling).
- ⚠️ **Legal & fair use:** this is a personal tool. Respect Cloudflare's Terms of Service and the laws of your jurisdiction.

---

## <img src="https://raw.githubusercontent.com/Private-edge/Private-edge/02b41b32e43f5d83a3e0291368920230a052939a/flag-of-iran-emoji-toss-face.svg" width="48" alt="فارسی"> فارسی

### Private Edge چیست؟

Private Edge یک **پروکسی شخصی تک‌فایل** است که روی شبکهٔ جهانی Cloudflare (Workers) اجرا می‌شود. با یک UUID اختصاصی در کمتر از دو دقیقه دیپلوی می‌شود و پروتکل **VLESS** را روی **WebSocket** صحبت می‌کند — ترکیبی که پشت فیلترینگ سنگین بهترین کارایی را دارد، چون از دید هر واسطی فقط یک ترافیک HTTPS معمولی به سمت Cloudflare است.

برای یک نفر (یا گروه کوچک) طراحی شده: بدون دیتابیس، بدون اکانت، بدون پنل ادمینِ قابل‌حمله. UUID شما همان شناسهٔ ورود است.

### پروتکل‌ها و سازگاری

| لایه | انتخاب | دلیل |
| :-- | :-- | :-- |
| پروتکل پراکسی | VLESS (رمزنگاری اضافه ندارد — کار TLS است) | کم‌ترین سربار، بهترین پشتیبانی کلاینت‌ها |
| ترنسپورت | WebSocket + TLS (یا WS ساده / noTLS روی دامنهٔ اختصاصی) | شبیه ترافیک وب معمولی است |
| Early data | 0-RTT با `?ed=2560` + `Sec-WebSocket-Protocol` | شروع سریع‌تر اتصال، سازگار با v2rayNG |
| DNS | رلهٔ UDP/53 به DoH با زنجیرهٔ fallback خودکار | حتی وقتی دامنه‌های DoH فیلترند، DNS کار می‌کند |
| ECH | تولید کانفیگ + استعلام رکورد HTTPS | اختیاری، برای تنظیمات پیشرفته |
| TCP | رلهٔ مستقیم با `cloudflare:sockets` + failover چندمقصدی + replay | مسیرهای خراب به مقصد را تحمل می‌کند |

**کلاینت‌های تست‌شده:** v2rayNG، v2rayN، Xray-core (نسخهٔ ۲۵)، sing-box.
**خروجی‌های کانفیگ:** URI `vless://` · JSON ایکس‌ری (قدیمی و مدرن) · JSON اسنگ‌باکس · ساب بیس۶۴ · noTLS · ECH.

### نکات امنیتی

- **UUID همان رمز عبور شماست.** تصادفی بسازید، هرگز UUID آموزش‌ها را استفاده نکنید. مقایسه به‌صورت ثابت‌زمان انجام می‌شود.
- **`SUB_TKN`** یک قفل دوم روی endpoint کانفیگ است (توکن query یا Bearer).
- **شبکهٔ خصوصی بلاک است** (`BLK_PRV`): لوکال‌هاست، لینک‌لوکال، بازه‌های RFC-1918، CGNAT، IPv4-mapped IPv6 و metadata سرویس‌های ابری. Fail-closed: غلط املایی در این متغیر، Worker را در startup متوقف می‌کند نه اینکه محافظت را بی‌صدا خاموش کند.
- **پورت ۲۵ همیشه بلاک است** (ضد رلهٔ اسپم) و `MAX_TUN` سقف تونل‌های هم‌زمان هر Worker است.
- **صفحهٔ عمومی** — Worker در مسیرهای عمومی یک صفحهٔ اپ معمولی نشان می‌دهد، نه بنر پراکسی.
- در production مقدار `DBG` روی `"false"` بماند؛ لاگ‌ها ممکن است شامل مقصدها باشند.

### کارایی و مصرف منابع

- **CPU:** به‌طور متوسط ~۲–۳ میلی‌ثانیه به ازای هر درخواست — با سقف ۱۰ میلی‌ثانیهٔ پلن رایگان فاصلهٔ امن دارد.
- **سهمیهٔ پلن رایگان:** ۱۰۰٫۰۰۰ درخواست در روز و *هر اتصال WebSocket یک درخواست حساب می‌شود*. حجم ترافیک نامحدود است.
- **`MAX_TUN` کمتر** (مثلاً ۶) = تونل هم‌زمان کمتر = CPU و حافظهٔ کمتر.
- **DNS:** هر کوئری UDP/53 به DoH می‌رود؛ زنجیرهٔ resolver در صورت تایم‌اوت سراغ بعدی می‌رود، پس برای resolver مرده دوبار هزینه نمی‌دهید.
- کلاینتی که مدام قطع/وصل می‌شود سهمیه را سریع می‌سوزاند. اتصال پایدار (پایین) ارزان‌ترین اتصال هم هست.

### اتصال سالم و پایدار

- `ERL_DAT = 2560` (پیش‌فرض) early data را در مسیر WebSocket می‌گذارد — همان چیزی که v2rayNG انتظار دارد؛ خاموش بودنش در برخی کلاینت‌ها حلقهٔ قطع می‌سازد.
- سرور هدر `Sec-WebSocket-Protocol` را هر بار که کلاینت فرستاده **echo می‌کند** (RFC 6455) — کلاینت‌هایی که echo لازم دارند دیگر اتصال را نمی‌بندند.
- `CON_TMO_MS` و `DNS_TMO_MS` (پیش‌فرض ۸۰۰۰ms) به‌جای معلق‌ماندن، سریع failover می‌کنند.
- **بافر replay** بسته‌های اول شما را به مقصد پشتیبان (ProxyIP از طریق `PDR`) دوباره می‌فرستد وقتی مسیر مستقیم وسط handshake می‌شکند — بدون نیاز به retry سمت کلاینت.
- اگر `*.workers.dev` در منطقهٔ شما ناپایدار است، **دامنهٔ اختصاصی** وصل کنید و (اختیاری) `PUB_HST`/`HST_HDR` را روی آن بگذارید. برای noTLS گزینهٔ «Always Use HTTPS» را روی آن دامنه خاموش کنید.

### خوب است بدانید

- **ProxyIP** (`PDR` + `PRX_MOD`) وقتی کمک می‌کند که مسیر مستقیم Cloudflare به مقصد بلاک باشد — ترافیک از IP شما خارج می‌شود. حالت `fallback` (پیش‌فرض) فقط در صورت نیاز استفاده می‌کند.
- **DoH با IP خام** (`https://1.1.1.1/dns-query`) حتی وقتی *دامنه‌های* DoH فیلترند کار می‌کند — برای همین پیش‌فرض پیشنهادی است.
- پروژه با **۱۰۳ تست خودکار** (پروتکل، امنیت، همزمانی، مدیریت خطا) عرضه می‌شود.
- ⚠️ **حقوقی و استفادهٔ منصفانه:** این ابزار شخصی است. با قوانین Cloudflare و قوانین محل زندگی‌تان احترام بگذارید.

---

## 🇨🇳 中文

### Private Edge 是什么？

Private Edge 是一个运行在 Cloudflare 全球网络（Workers）上的**单文件个人代理**。只需一个自己的 UUID，两分钟内即可完成部署，通过 WebSocket 传输 **VLESS** 协议 — 在高强度封锁环境下表现最佳的组合，因为在任何中间设备眼中，这只是访问 Cloudflare 的普通 HTTPS 流量。

它为个人（或小团体）设计：没有数据库、没有账号体系、没有可被攻击的管理面板。**UUID 就是你的凭证。**

### 协议与兼容性

| 层级 | 选择 | 原因 |
| :-- | :-- | :-- |
| 代理协议 | VLESS（无额外加密 — 由 TLS 负责） | 开销最低，客户端支持最广 |
| 传输层 | WebSocket + TLS（自定义域名也可用纯 WS / noTLS） | 外观与普通网页流量一致 |
| Early Data | 通过 `?ed=2560` + `Sec-WebSocket-Protocol` 实现 0-RTT | 连接启动更快，兼容 v2rayNG |
| DNS | UDP/53 中继到 DoH，带自动回退链 | 即使 DoH 域名被封锁，DNS 依然可用 |
| ECH | 配置生成 + HTTPS 记录查询 | 可选，面向进阶用户 |
| TCP | 通过 `cloudflare:sockets` 直连中继 + 多目标故障转移 + 重放 | 可耐受通往目标的不稳定线路 |

**已测试客户端：** v2rayNG、v2rayN、Xray-core (v25)、sing-box。
**配置输出：** `vless://` URI · Xray JSON（旧版与新版）· sing-box JSON · Base64 订阅 · noTLS · ECH。

### 安全说明

- **UUID 就是你的密码。** 请随机生成，切勿使用教程里的示例值。校验采用常数时间比较。
- **`SUB_TKN`** 为配置端点加上第二把锁（query 或 Bearer 令牌）。
- **私有网段全部封锁**（`BLK_PRV`）：回环、链路本地、RFC-1918、CGNAT、IPv4-mapped IPv6、云厂商 metadata 端点。Fail-closed：该变量写错会让 Worker 启动即报错，而不是悄悄关闭防护。
- **25 端口始终封锁**（防垃圾邮件中继），`MAX_TUN` 限制单个 Worker 的并发隧道数。
- **伪装首页** — 在公开路径上呈现一个普通的应用页面，而不是代理横幅。
- 生产环境保持 `DBG = "false"`；日志可能包含目标主机名。

### 性能与资源占用

- **CPU：** 平均每请求约 2–3 毫秒 — 远低于免费套餐 10 毫秒的限制。
- **免费套餐配额：** 每天 100,000 次请求，*每个 WebSocket 连接计为 1 次请求*。流量不限。
- **调低 `MAX_TUN`**（如 6）= 更少并发隧道 = 更低的 CPU 与内存占用。
- **DNS：** 每个 UDP/53 查询都会转发到 DoH；超时后解析器链自动尝试下一个，不会为死掉的解析器重复买单。
- 频繁断线重连的客户端会快速烧掉配额。稳定的连接（见下文）也是最省钱的连接。

### 稳定、健康的连接

- `ERL_DAT = 2560`（默认）将 early data 放入 WebSocket 路径 — 这正是 v2rayNG 所期望的；关闭它可能导致部分客户端断线循环。
- 只要客户端发送了 `Sec-WebSocket-Protocol` 头，服务器就会**原样回显**（RFC 6455）— 要求回显的客户端不会再主动断开。
- `CON_TMO_MS` / `DNS_TMO_MS`（默认 8000 毫秒）会快速故障转移，而不是无限挂起。
- **重放缓冲**会在直连路线握手失败时，把你的初始数据包重发到备用目标（通过 `PDR` 的 ProxyIP）— 客户端无需重试。
- 如果 `*.workers.dev` 在你所在地区不稳定，请**绑定自定义域名**，并（可选）将 `PUB_HST`/`HST_HDR` 指向它。需要 noTLS 时，在该域名上关闭「Always Use HTTPS」。

### 值得了解

- 当 Cloudflare 通往目标的直连路线被封锁时，**ProxyIP**（`PDR` + `PRX_MOD`）会让流量改从你指定的 IP 出口。默认的 `fallback` 模式只在必要时才启用。
- **使用原生 IP 的 DoH**（`https://1.1.1.1/dns-query`）即使在 DoH *域名*被过滤时也能工作 — 这就是它成为推荐默认值的原因。
- 本项目附带 **103 项自动化测试**（协议、安全、并发、错误处理）。
- ⚠️ **法律与合理使用：** 这是个人工具。请遵守 Cloudflare 服务条款及所在地法律。
