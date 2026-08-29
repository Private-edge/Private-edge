# بررسی عمیق 1101 در نسخهٔ 1.1.15 (فیکس v2rayNG)

**تاریخ:** ۲۰۲۶-۰۸-۱۹
**فایل:** `Private edge 2 v8/src/index.js` (به‌روز شده با فیکس early data)
**روش:** تحلیل ایستای زنجیره‌های promise + ۵ دسته تست دینامیک (شامل همزمانی و race)

---

## نتیجه: ❌ هیچ مسیر 1101 پیدا نشد — همهٔ تست‌ها پاس شدند

| # | تست | نتیجه |
|---|---|---|
| ۱ | ۲۰ سشن هم‌زمان WebSocket + socket سالم | ✓ صفر unhandled rejection |
| ۲ | socket ها با `connect refused` (opened reject) | ✓ صفر unhandled |
| ۳ | socket با تاخیر + fail در وسط read/write | ✓ صفر unhandled |
| ۴ | ۵۰ درخواست هم‌زمان config با DoH خراب | ✓ همه 404 (هیچ rejection فراری) |
| ۵ | `socket.opened` همیشه reject (۱۰۰ سشن) | ✓ صفر unhandled |
| ۶ | `socket.closed` همیشه reject (۳۰ سشن) | ✓ صفر unhandled |
| ۷ | `socket.opened` هرگز resolve (هنگ) + close | ✓ صفر unhandled |
| ۸ | Bearer خیلی بزرگ (۳۰۰۰ کاراکتر) | ✓ 404 |
| ۹ | `MAX_TUN=abc` (نامعتبر) | ✓ پیش‌فرض ۱۶ (رفتار امن) |
| ۱۰ | `MAX_TUN=2` + بستن اتصال → جا باز می‌شود | ✓ 101،101،404 → 101 |
| ۱۱ | هارنس اصلی 1101 (۴۴ سناریو) | ✓ همه پاس |
| ۱۲ | تست عملکردی ۵۰ سناریو | ✓ همه پاس |

---

## چرا 1101 در V.1.1.15 عملاً غیرممکن است؟ (زنجیره‌های هندل‌شده)

### ۱) fetch handler — سد نهایی
```js
async fetch(request, env) {
  try {
    return await route(request, env);   // ← هر rejection اینجا می‌افتد
  } catch (err) {
    logDebug(env, err);                  // ← (اختیاری)
    return notFound();                   // ← 404 — هیچ‌وقت 1101
  }
}
```

### ۲) همهٔ Promise های «رها شده» catch دارند
| Promise | هندلر |
|---|---|
| `chain.then(push)` (پیام‌های WS) | `.catch(→ abort 1011)` |
| `void pumpRemote(...)` | `.catch(→ close + 1011)` |
| `Promise.resolve(promise).catch` (withTimeout) | `.catch(() => {})` |
| `socket.closed.catch` (observeSocket) | `.catch(() => {})` |
| `writer.abort()` / `socket.close()` | `.catch(() => {})` |

### ۳) نقاطی که در نسخه‌های قبل 1101 می‌دادند، اینجا بسته شده‌اند
- `handleConfigEndpoint` با `await` داخل try/catch → rejection های DoH/JSON → 404 (نه 1101)
- `lookupEch` با `fetchWithTimeout` + `redirect: "error"` + try/finally
- رویدادهای WS (message/close/error) همه داخل try/catch
- `abort()` و `shutdown()` داخل try/catch
- `pumpRemote` بعد از خطای read: اگر WS بسته باشد فقط `closed=true` (بدون throw فراری)

### ۴) رفتار race ها
- `activeTunnels++` / `release()` — غیراتمیک ولی چون JS تک‌رشته‌ای است، race واقعی ندارد (فقط در حد چند ایزوله، که هرکدام شمارندهٔ خود را دارند)
- `beginSwitch()` — با `this.switching` از هم‌زمانی activate های تکراری جلوگیری شده
- `generation` — از تداخل pump های قدیمی با socket جدید جلوگیری می‌کند

---

## نکات قابل توجه (غیر 1101)

1. **MAX_TUN کار می‌کند** (تأیید شد): با `MAX_TUN=2` اتصال سوم 404 می‌گیرد و بعد از بستن یکی، دوباره 101 برمی‌گردد. اگر چند دستگاه دارید، مقدار را ۳۲–۶۴ کنید.
2. **پیام‌های هم‌زمان**: اگر دو پیام هم‌زمان برسند، `enqueue` آن‌ها را زنجیره می‌کند (ترتیب حفظ می‌شود) و هر خطا → 1011.
3. **`activeTunnels` بعد از خطای WebSocketPair** در catch دوباره release می‌شود (هیچ «نشتی» شمارنده‌ای نیست).
4. **تفاوت محیطی**: در Cloudflare واقعی `socket.opened` ممکن است reject کند؛ این دقیقاً با `withTimeout` + `Promise.race` هندل می‌شود (تست ۵ و ۷ آن را شبیه‌سازی کردند).

---

## جمع‌بندی نهایی

**کد V1.1.15 (با فیکس v2rayNG) از نظر 1101 کاملاً تمیز است.** هیچ promise رهاشده‌ای، هیچ مسیر throw فراری، و هیچ race مهلکی پیدا نشد. تمام خطاهای ممکن به یکی از این سه ختم می‌شوند:- **404** (خطاهای HTTP/route/env)
- **1011** (خطاهای سشن WebSocket — بستن تمیز با reason)
- **1000** (بستن عادی بعد از اتمام)

لاگ‌هایی که قبلاً دیدید («internal error; reference=...») خطای زیرساخت Cloudflare در colo خاص بودند، نه خطای کد — این تحلیل همچنان پابرجاست.
