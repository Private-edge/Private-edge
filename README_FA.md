# 🚀 Private Edge
![Version](https://img.shields.io/badge/version-1.1.15-blue?style=flat-square)
![Protocol](https://img.shields.io/badge/protocol-VLESS%2BWS-green?style=flat-square)
![Platform](https://img.shields.io/badge/platform-Cloudflare%20Workers-orange?style=flat-square)
![Tests](https://img.shields.io/badge/tests-103%20passing-brightgreen?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square)

[English](README.md) | **فارسی** | [中文](README_CN.md)

پروکسی شخصی **VLESS + WebSocket** روی Cloudflare Workers — رلهٔ TCP، دی‌ان‌اس با زنجیرهٔ DoH و fallback خودکار (بهینه برای ایران)، پشتیبانی از ProxyIP، Early Data و تولید خودکار کانفیگ برای **Xray / sing-box / v2rayNG**. یک فایل، بدون هیچ وابستگی، روی پلن رایگان.

## ✨ امکانات

- 🛡️ **VLESS روی WebSocket** — با TLS و noTLS
- 🔀 **رلهٔ TCP** با failover چندمقصدی و بافر replay
- 📡 **DNS UDP/53 → DoH** با زنجیرهٔ fallback از resolverهای IP-خام (`1.1.1.1 ← 8.8.8.8 ← 9.9.9.9 ← …`) که فیلترینگ مبتنی بر DNS را دور می‌زنند
- 🌐 **ProxyIP** — سه حالت: `fallback` / `always` / `off`
- ⚡ **Early Data** (`?ed=2560`) با echo ساب‌پروتکل مطابق RFC 6455 — اتصال پایدار روی v2rayNG / Xray
- 📦 **یک لینک برای همهٔ کلاینت‌ها** — URI `vless://`، JSON ایکس‌ری (قدیمی و مدرن)، JSON sing-box، ساب بیس۶۴، noTLS و ECH
- 🔐 بررسی UUID با مقایسهٔ ثابت‌زمان، بلاک شبکهٔ خصوصی، سقف تونل برای هر Worker، بلاک پورت ۲۵
- 🎨 **صفحهٔ عمومی** (کموفلاژ) — کاملاً قابل شخصی‌سازی با متغیرها
- ✅ ۱۰۳ تست خودکار · تست‌شده در محیط واقعی

## 🚀 دیپلوی — هر روشی که دوست داری

### روش ۱ · داشبورد Cloudflare (ساده‌ترین، ~۲ دقیقه)

1. فایل [`_worker.js`](_worker.js) را باز کنید و محتوایش را کپی کنید
2. داشبورد Cloudflare → **Workers & Pages** → **Create Worker** → Edit code → پیست → **Deploy**
3. در Worker → **Settings → Variables** اضافه کنید:
   ```
   IDUS = آیدی-یو-یو-آی-دی-شما
   ```
   (یک UUID از [uuidgenerator.net](https://www.uuidgenerator.net) بسازید)
4. لینک ساب آماده است:

   ```
   https://your-worker.workers.dev/your-uuid?format=sub
   ```

### روش ۲ · دیپلوی یک‌کلیکی

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/joker360x/Private-edge)

بعد از دیپلوی، متغیر `IDUS` را در تنظیمات Worker وارد کنید.

### روش ۳ · Cloudflare Pages

1. این مخزن را Fork کنید
2. داشبورد → Workers & Pages → Create → **Pages** → **Connect to Git** → Fork خودتان را انتخاب کنید
3. دیپلوی کنید — فایل `_worker.js` به‌صورت خودکار شناسایی می‌شود
4. تنظیمات پروژهٔ Pages → Environment variables → متغیر `IDUS` را اضافه کنید

### روش ۴ · خط فرمان (Wrangler)

```bash
git clone https://github.com/joker360x/Private-edge.git
cd Private-edge
npx wrangler secret put IDUS    # یو‌یو‌آی‌دی خود را وارد کنید
npx wrangler deploy
```

## 🔑 متغیرهای پیشنهادی

| متغیر | مقدار نمونه | توضیح |
| :-- | :-- | :-- |
| `IDUS` | `00000000-0000-0000-0000-000000000000` | UUID پروتکل VLESS — **تنها تنظیم اجباری** |
| `LND_MOD` | `all` | حالت صفحهٔ عمومی: `all` / `root` / `off` |
| `MAX_TUN` | `6` | حداکثر تونل هم‌زمان (۱ تا ۲۵۶) |
| `PDR` | `79.137.197.212` | لیست ProxyIP با جداکنندهٔ کاما (اختیاری) |
| `PRX_MOD` | `fallback` | حالت ProxyIP: `fallback` / `always` / `off` |
| `DBG` | `false` | لاگ دیباگ — در حالت واقعی `false` بماند |
| `ECH_MOD` | `off` | حالت Encrypted Client Hello |
| `DOH_URL` | `https://1.1.1.1/dns-query` | DoH اصلی (IP خام در برابر فیلترینگ DNS مقاوم است) |
| `DOH_FBK_URL` | `https://8.8.8.8/dns-query` | DoH جایگزین |
| `BLK_PRV` | `true` | بلاک مقصدهای خصوصی/لوکال — همیشه `true` |
| `CON_TMO_MS` | `8000` | تایم‌اوت اتصال TCP (میلی‌ثانیه) |
| `DNS_TMO_MS` | `8000` | تایم‌اوت کوئری DoH (میلی‌ثانیه) |
| `MAX_RPL_BYT` | `262144` | سقف بافر replay (بایت) |
| `PUB_HST` | `your-worker.workers.dev` | هاست عمومی در کانفیگ‌های تولیدشده (آدرس Worker شما) |
| `PUB_PRT` | `443` | پورت عمومی |
| `FPR` | `chrome` | اثر انگشت uTLS برای Xray / sing-box |
| `CFG_NAM` | `private-edge` | نام پروفایل / کانفیگ |
| `ERL_DAT` | `2560` | اندازهٔ early data در WebSocket (بایت) |
| `LOC_SCK_PRT` | `10808` | پورت SOCKS محلی در کانفیگ Xray |
| `LOC_MIX_PRT` | `2080` | پورت Mixed محلی در کانفیگ sing-box |
| `SUB_TKN` | `Cname` | توکن ساب (query یا Bearer) — یک عبارت تصادفی بلند انتخاب کنید |

📋 **مرجع کامل متغیرها** (هر ۳۶ متغیر با پیش‌فرض‌ها) → **[VARIABLES.md](VARIABLES.md)** · English / فارسی / 中文

## 📱 سابسکریپشن و کلاینت‌ها

لینک پایه: `https://your-worker.workers.dev/<UUID>` (اگر `SUB_TKN` تنظیم شده باشد `?token=…` اضافه کنید)

| `format=` | خروجی |
| :-- | :-- |
| `sub` *(پیش‌فرض)* | ساب بیس۶۴ — v2rayNG، v2rayN، NekoBox |
| `uri` / `link` | URI خام `vless://` |
| `notls` | URI بدون TLS (نیازمند دامنهٔ اختصاصی) |
| `core` / `legacy` / `modern` / `json` | کانفیگ JSON ایکس‌ری |
| `sb` / `sing-box` | کانفیگ JSON اسنگ‌باکس |
| `ech` | وضعیت ECH (استعلام رکورد HTTPS در DNS) |

**کلاینت‌های تست‌شده:** v2rayNG · v2rayN · Xray-core (نسخهٔ ۲۵) · sing-box

## 📖 بیشتر بدانید

- **[about.md](about.md)** — پروتکل‌ها، نکات امنیتی، کارایی و پایداری (English / فارسی / 中文)

## ⚠️ نکات مهم

- سابدامین `*.workers.dev` در برخی مناطق فیلتر است — برای دسترس‌پذیری بهتر **دامنهٔ اختصاصی** متصل کنید
- پلن رایگان: **۱۰۰٫۰۰۰ درخواست در روز** (هر اتصال WebSocket = ۱ درخواست)، حجم ترافیک نامحدود است
- UUID و `SUB_TKN` را محرمانه نگه دارید — این‌ها همان شناسه‌های ورود به پروکسی شما هستند
- `BLK_PRV` باید `true` بماند؛ پورت ۲۵ همیشه مسدود است

## ⭐ حمایت

[![Stars](https://img.shields.io/github/stars/joker360x/Private-edge?style=flat-square)](https://github.com/joker360x/Private-edge/stargazers)

اگر این پروژه به شما کمک کرد، یک ⭐ ستاره بهترین دلگرمی است!

##📋لایسنس

[MIT](LICENSE) — © 2026 Private Edge
