# 🔧 VARIABLES — Private Edge

Complete variable & secret reference · **English** · **فارسی** · **中文**

> Only `IDUS` is required. Everything else has a safe default.

---

## 🇬🇧 English

### Required

| Name | Type | Default | Description |
| :-- | :-- | :-- | :-- |
| `IDUS` | Secret | — | Standard VLESS UUID — the only required value. If set alone, the WebSocket path and config endpoint both default to `/<IDUS>`. |

### Paths & private access

| Name | Type | Default | Description |
| :-- | :-- | :-- | :-- |
| `WS_PTH` | Secret | `/<IDUS>` | WebSocket path — root path not allowed. |
| `SUB_PTH` | Secret | `WS_PTH` | Private config endpoint path. |
| `SUB_TKN` | Secret | *(empty)* | Optional token (query `?token=` or `Authorization: Bearer`) protecting the config endpoint. |

### TCP relay & ProxyIP

| Name | Default | Description |
| :-- | :-- | :-- |
| `PDR` | *(empty)* | Comma-separated public ProxyIP / hostname list. Not an HTTP/SOCKS proxy. Example: `203.0.113.10,203.0.113.11:443,[2001:db8::10]` |
| `PRX_MOD` | `fallback` | `fallback` / `always` / `off`. With `always`, `PDR` must not be empty. |
| `CON_TMO_MS` | `8000` | Per-attempt TCP connect timeout, 1000–30000 ms. |
| `MAX_RPL_BYT` | `262144` | Replay buffer cap before first remote response, 16384–1048576 bytes. |
| `BLK_PRV` | `true` | Block private / loopback / link-local / metadata destinations. Fail-closed: any invalid value errors at startup. Keep `true`. |
| `DBG` | `false` | Log session errors — keep `false` in production. |
| `MAX_TUN` | `16` | Max simultaneous tunnels, 1–256. Lower values reduce resource usage. |
| `DNS_TMO_MS` | `8000` | DoH query timeout, 1000–30000 ms. Port 25 is always blocked. |

### Client config output

| Name | Default | Description |
| :-- | :-- | :-- |
| `PUB_HST` | request host | Public host used in generated configs. |
| `PUB_PRT` | `443` | Public port (80 for noTLS when empty). |
| `HST_HDR` | `PUB_HST` | WebSocket `Host` header. |
| `SNI` | `PUB_HST` | TLS server name. |
| `FPR` | `chrome` | uTLS fingerprint in Xray & sing-box configs. |
| `CFG_NAM` | `private-edge` | URI fragment, `Profile-Title` header, Xray outbound tag, sing-box tag & `route.final`. |
| `LOC_SCK_PRT` | `10808` | Local SOCKS port in the full Xray config. |
| `LOC_MIX_PRT` | `2080` | Local mixed port in the full sing-box config. |
| `ERL_DAT` | `2560` | WebSocket early data (`?ed=2560` path), 0–8192 bytes. Default tuned for v2rayNG. |

In the common case, don't set `PUB_HST` / `HST_HDR` / `SNI` — the Worker hostname is used automatically.

### DNS & ECH

| Name | Default | Description |
| :-- | :-- | :-- |
| `DOH_URL` | `https://cloudflare-dns.com/dns-query` | Binary DoH for UDP/53 relay and Xray DNS. Must be HTTPS on a public host. |
| `DOH_JSON_URL` | Cloudflare DoH | JSON endpoint for HTTPS/SVCB record lookups. |
| `DOH_FBK_URL` | `https://1.1.1.1/dns-query` | Second DoH for the relay fallback chain; further automatic fallbacks: `8.8.8.8`, `9.9.9.9`, Quad9, AliDNS, … |
| `ECH_MOD` | `off` | `off` or an active mode such as `auto`. |
| `ECH_CFG` | *(empty)* | Fixed ECHConfigList (base64) — takes priority over DNS lookup. Invalid base64 errors at startup. |
| `ECH_LKP_HST` | SNI | Hostname for the HTTPS/ECH record lookup. |
| `ECH_DOH_URL` | `DOH_URL` | DoH used for automatic ECH values in Xray. |

ECH is off by default for compatibility; the Worker cannot force it on Cloudflare's edge TLS handshake.

### Landing (cover) page

| Name | Default | Description |
| :-- | :-- | :-- |
| `LND_MOD` | `all` | `all` / `root` / `off` — where the public cover page is shown. |
| `APP_NAM` | `LumaDesk` | App name on the cover page. |
| `APP_TAG` | *(built-in)* | Main tagline. |
| `APP_DSC` | *(built-in)* | Description & meta description. |
| `APP_BDG` | `Personal workspace` | Badge above the title. |
| `APP_STS` | `All systems operational` | Footer status text. |
| `APP_ACC` | `#7567f8` | Primary color. |
| `APP_ACC_2` | `#30b9a4` | Accent color. |

---
## Persian <img src="https://raw.githubusercontent.com/Private-edge/Private-edge/02b41b32e43f5d83a3e0291368920230a052939a/flag-of-iran-emoji-toss-face.svg" width="48" alt="فارسی"> 


| نام | نوع | پیش‌فرض | توضیح |
| :-- | :-- | :-- | :-- |
| `IDUS` | Secret | — | UUID استاندارد VLESS و تنها مقدار الزامی. اگر تنها همین تنظیم شود، مسیر WebSocket و endpoint کانفیگ هر دو `/<IDUS>` خواهند بود. |

### مسیرها و دسترسی خصوصی

| نام | نوع | پیش‌فرض | توضیح |
| :-- | :-- | :-- | :-- |
| `WS_PTH` | Secret | `/<IDUS>` | مسیر WebSocket؛ مسیر ریشه مجاز نیست. |
| `SUB_PTH` | Secret | `WS_PTH` | مسیر endpoint خصوصی کانفیگ. |
| `SUB_TKN` | Secret | خالی | توکن اختیاری (query یا Bearer) برای محافظت از endpoint کانفیگ. |

### رلهٔ TCP و ProxyIP

| نام | پیش‌فرض | توضیح |
| :-- | :-- | :-- |
| `PDR` | خالی | فهرست ProxyIP/هاست عمومی با جداکنندهٔ کاما. HTTP/SOCKS پراکسی نیست. نمونه: `203.0.113.10,203.0.113.11:443,[2001:db8::10]` |
| `PRX_MOD` | `fallback` | `fallback` / `always` / `off`. با `always` مقدار `PDR` نباید خالی باشد. |
| `CON_TMO_MS` | `8000` | تایم‌اوت هر تلاش اتصال TCP؛ بین ۱۰۰۰ تا ۳۰۰۰۰ میلی‌ثانیه. |
| `MAX_RPL_BYT` | `262144` | سقف بافر replay پیش از اولین پاسخ مقصد؛ بین ۱۶۳۸۴ تا ۱۰۴۸۵۷۶ بایت. |
| `BLK_PRV` | `true` | بلاک مقصدهای خصوصی/لوکال/لینک‌لوکال/metadata. Fail-closed: مقدار نامعتبر در startup خطا می‌دهد. همیشه `true` بماند. |
| `DBG` | `false` | ثبت خطاهای session — در production روی `false` باشد. |
| `MAX_TUN` | `16` | حداکثر تونل هم‌زمان (۱ تا ۲۵۶). مقدار کمتر = مصرف منابع کمتر. |
| `DNS_TMO_MS` | `8000` | تایم‌اوت کوئری DoH؛ بین ۱۰۰۰ تا ۳۰۰۰۰ میلی‌ثانیه. پورت ۲۵ همیشه مسدود است. |

### خروجی کانفیگ کلاینت

| نام | پیش‌فرض | توضیح |
| :-- | :-- | :-- |
| `PUB_HST` | هاست درخواست | هاست عمومی در کانفیگ‌های تولیدشده. |
| `PUB_PRT` | `443` | پورت عمومی (خالی = ۸۰ برای noTLS). |
| `HST_HDR` | `PUB_HST` | هدر `Host` در WebSocket. |
| `SNI` | `PUB_HST` | نام سرور TLS. |
| `FPR` | `chrome` | اثر انگشت uTLS در کانفیگ Xray و sing-box. |
| `CFG_NAM` | `private-edge` | fragment در URI، هدر `Profile-Title`، تگ outbound در Xray و تگ/`route.final` در sing-box. |
| `LOC_SCK_PRT` | `10808` | پورت SOCKS محلی در کانفیگ کامل Xray. |
| `LOC_MIX_PRT` | `2080` | پورت Mixed محلی در کانفیگ کامل sing-box. |
| `ERL_DAT` | `2560` | Early data در WebSocket (مسیر `?ed=2560`)؛ بین ۰ تا ۸۱۹۲ بایت. پیش‌فرض برای v2rayNG بهینه است. |

در حالت معمول `PUB_HST`، `HST_HDR` و `SNI` را تنظیم نکنید — هاست واقعی Worker خودکار استفاده می‌شود.

### DNS و ECH

| نام | پیش‌فرض | توضیح |
| :-- | :-- | :-- |
| `DOH_URL` | `https://cloudflare-dns.com/dns-query` | DoH باینری برای رلهٔ UDP/53 و DNS کانفیگ Xray. باید HTTPS با هاست عمومی باشد. |
| `DOH_JSON_URL` | Cloudflare DoH | endpoint JSON برای استعلام رکورد HTTPS/SVCB. |
| `DOH_FBK_URL` | `https://1.1.1.1/dns-query` | DoH دوم در زنجیرهٔ fallback رله؛ fallbackهای خودکار بعدی: `8.8.8.8`، `9.9.9.9`، Quad9، AliDNS و… |
| `ECH_MOD` | `off` | `off` یا حالت فعال مانند `auto`. |
| `ECH_CFG` | خالی | ECHConfigList ثابت (base64)؛ بر lookup اولویت دارد. base64 نامعتبر در startup خطا می‌دهد. |
| `ECH_LKP_HST` | SNI | هاست استعلام رکورد HTTPS/ECH. |
| `ECH_DOH_URL` | `DOH_URL` | DoH مورد استفاده در مقدار خودکار ECH برای Xray. |

ECH برای سازگاری پیش‌فرض خاموش است و Worker نمی‌تواند آن را روی TLS handshake لبهٔ Cloudflare اجبار کند.

### صفحهٔ عمومی (کموفلاژ)

| نام | پیش‌فرض | توضیح |
| :-- | :-- | :-- |
| `LND_MOD` | `all` | `all` / `root` / `off` — صفحهٔ عمومی کجا نمایش داده شود. |
| `APP_NAM` | `LumaDesk` | نام اپ در صفحهٔ عمومی. |
| `APP_TAG` | متن داخلی | تیتر اصلی. |
| `APP_DSC` | متن داخلی | توضیح و meta description. |
| `APP_BDG` | `Personal workspace` | badge بالای تیتر. |
| `APP_STS` | `All systems operational` | متن وضعیت در footer. |
| `APP_ACC` | `#7567f8` | رنگ اصلی. |
| `APP_ACC_2` | `#30b9a4` | رنگ مکمل. |

---

## 🇨🇳 中文

### 必填项

| 名称 | 类型 | 默认值 | 说明 |
| :-- | :-- | :-- | :-- |
| `IDUS` | Secret | — | 标准 VLESS UUID — 唯一必填项。仅设置此项时，WebSocket 路径与配置端点均为 `/<IDUS>`。 |

### 路径与私有访问

| 名称 | 类型 | 默认值 | 说明 |
| :-- | :-- | :-- | :-- |
| `WS_PTH` | Secret | `/<IDUS>` | WebSocket 路径 — 不允许根路径。 |
| `SUB_PTH` | Secret | `WS_PTH` | 私有配置端点路径。 |
| `SUB_TKN` | Secret | 空 | 可选令牌（query `?token=` 或 `Authorization: Bearer`），保护配置端点。 |

### TCP 中继与 ProxyIP

| 名称 | 默认值 | 说明 |
| :-- | :-- | :-- |
| `PDR` | 空 | 逗号分隔的公共 ProxyIP/主机名列表，不是 HTTP/SOCKS 代理。示例：`203.0.113.10,203.0.113.11:443,[2001:db8::10]` |
| `PRX_MOD` | `fallback` | `fallback` / `always` / `off`。`always` 模式下 `PDR` 不能为空。 |
| `CON_TMO_MS` | `8000` | 每次 TCP 连接超时，1000–30000 毫秒。 |
| `MAX_RPL_BYT` | `262144` | 收到首个远程响应前的重放缓冲上限，16384–1048576 字节。 |
| `BLK_PRV` | `true` | 封锁私有/回环/链路本地/metadata 目标。Fail-closed：无效值在启动时报错。保持 `true`。 |
| `DBG` | `false` | 记录会话错误 — 生产环境保持 `false`。 |
| `MAX_TUN` | `16` | 最大并发隧道数，1–256。调低可减少资源占用。 |
| `DNS_TMO_MS` | `8000` | DoH 查询超时，1000–30000 毫秒。25 端口始终被封禁。 |

### 客户端配置输出

| 名称 | 默认值 | 说明 |
| :-- | :-- | :-- |
| `PUB_HST` | 请求主机 | 生成配置中使用的公共主机。 |
| `PUB_PRT` | `443` | 公共端口（noTLS 时留空 = 80）。 |
| `HST_HDR` | `PUB_HST` | WebSocket `Host` 头。 |
| `SNI` | `PUB_HST` | TLS 服务器名称。 |
| `FPR` | `chrome` | Xray 与 sing-box 配置中的 uTLS 指纹。 |
| `CFG_NAM` | `private-edge` | URI fragment、`Profile-Title` 头、Xray 出站标签、sing-box 标签与 `route.final`。 |
| `LOC_SCK_PRT` | `10808` | 完整 Xray 配置中的本地 SOCKS 端口。 |
| `LOC_MIX_PRT` | `2080` | 完整 sing-box 配置中的本地 Mixed 端口。 |
| `ERL_DAT` | `2560` | WebSocket Early Data（`?ed=2560` 路径），0–8192 字节。默认值针对 v2rayNG 优化。 |

一般情况下无需设置 `PUB_HST` / `HST_HDR` / `SNI` — 会自动使用 Worker 主机名。

### DNS 与 ECH

| 名称 | 默认值 | 说明 |
| :-- | :-- | :-- |
| `DOH_URL` | `https://cloudflare-dns.com/dns-query` | 用于 UDP/53 中继与 Xray DNS 的二进制 DoH。必须为公共主机的 HTTPS。 |
| `DOH_JSON_URL` | Cloudflare DoH | 用于查询 HTTPS/SVCB 记录的 JSON 端点。 |
| `DOH_FBK_URL` | `https://1.1.1.1/dns-query` | 中继回退链的第二个 DoH；后续自动回退：`8.8.8.8`、`9.9.9.9`、Quad9、AliDNS 等。 |
| `ECH_MOD` | `off` | `off` 或活跃模式（如 `auto`）。 |
| `ECH_CFG` | 空 | 固定的 ECHConfigList（base64）— 优先于 DNS 查询。无效 base64 在启动时报错。 |
| `ECH_LKP_HST` | SNI | 查询 HTTPS/ECH 记录的主机名。 |
| `ECH_DOH_URL` | `DOH_URL` | Xray 自动 ECH 值所用的 DoH。 |

ECH 默认关闭以保持兼容；Worker 无法在 Cloudflare 边缘 TLS 握手上强制启用。

### 伪装首页

| 名称 | 默认值 | 说明 |
| :-- | :-- | :-- |
| `LND_MOD` | `all` | `all` / `root` / `off` — 伪装首页的显示范围。 |
| `APP_NAM` | `LumaDesk` | 首页显示的应用名称。 |
| `APP_TAG` | 内置文案 | 主标语。 |
| `APP_DSC` | 内置文案 | 描述与 meta description。 |
| `APP_BDG` | `Personal workspace` | 标题上方的徽章。 |
| `APP_STS` | `All systems operational` | 页脚状态文字。 |
| `APP_ACC` | `#7567f8` | 主色。 |
| `APP_ACC_2` | `#30b9a4` | 辅助色。 |
