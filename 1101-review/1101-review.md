# بررسی خطای 1101 در نسخهٔ 1.1.8 (index.js)

**تاریخ:** ۲۰۲۶-۰۸-۱۹
**فایل:** `Private edge 2 v8/src/index.js` (۱۸۹۳ خط)
**روش:** (۱) بررسی ایستای ساختار + (۲) تست دینامیک با هارنس واقعی (`tests/1101-test.cjs` — ۳۵ سناریو)

---

## نتیجه: ❌ هیچ مسیر 1101 آشکاری در کد نیست

بررسی روی **دو فایل** انجام شد و هر دو **40 پاس / 0 خطا**: `src/index.js` (سورس) و `deploy/worker.dashboard.js` (خروجی build — همان چیزی که واقعاً دپلوی می‌شود).

خطای 1101 یعنی «exception ای که از fetch handler فرار کند». در v8 این اتفاق عملاً ممکن نیست، چون:

### چرا؟

| لایه | محافظت |
|---|---|
| **fetch handler** | کل بدنه داخل `try { return await route(...) } catch { → 404 }` است؛ حتی خطای پیشبینینشده هم 1101 نمیشود |
| **route (WS)** | `acceptTunnelSocket` داخل try/catch → هر خطای sync به 404 تبدیل میشود |
| **route (config)** | `return await handleConfigEndpoint(...)` **با await** داخل try/catch → rejection ها (مثل DoH خراب) مهار میشوند. (این همان فیکس v1.1.4 است که اینجا بهدرستی هست) |
| **رویدادهای WebSocket** | message/close/error هر سه داخل try/catch |
| **زنجیرهٔ پیامها (enqueue)** | `chain.then(push).catch(→ abort 1011)` — rejection سشن به 1011 تبدیل میشود نه 1101 |
| **pumpRemote** | `void pumpRemote(...).catch(...)` — هندلشده |
| **socket/writer بستن** | `abort()`/`close()` همگی با `.catch(() => {})` |
| **timers** | همه در `finally` با clearTimeout پاک میشوند |

### تست دینامیک (۳۵ سناریو — همه پاس ✓)

- **HTTP:** GET/HEAD/POST، landing، 404، مسیرهای اشتباه
- **config endpoint:** uri/sub/core/sb/ech، token درست/نادرست/بزرگ، DoH خراب (reject)، JSON خراب → همه به 404/200 ختم میشوند، هیچ rejection فراری
- **env خراب:** بدون IDUS، BLK_PRV/PRX_MOD نامعتبر، DOH_URL بدون https، ECH_CFG خراب → همه 404 (نه 1101)
- **WebSocket:** upgrade درست/اشتباه، subprotocol معتبر/خراب/بزرگ → 101 (بدون 400)
- **سشن واقعی:** هدر VLESS معتبر (TCP)، UUID اشتباه (1011)، مقصد خصوصی (1011)، پورت 25 (1011)، هدر ناقص، پیام متنی (1011) — و در پایان **صفر unhandled rejection**

---

## نکات تکمیلی (نه 1101 ولی برای پایداری اتصال مهم)

1. **سقف تونل‌ها (`MAX_TUN` پیش‌فرض ۱۶):** اگر پر شود، درخواست WS جدید 404 میگیرد → کلاینت قطع/وصل میکند. این «خطا» نیست ولی همان رفتار نوسان را ایجاد میکند؛ اگر چند دستگاه دارید عدد را بالا ببرید.
2. **echo نکردن subprotocol نامعتبر:** اگر کلاینتی early data خراب بفرستد، سرور 101 برمیگرداند ولی هدر را echo نمیکند؛ طبق RFC 6455 کلاینت ممکن است خودش اتصال را fail کند. با v2rayN و early data معتبر (که `?ed=2560` تضمین میکند) مشکلی نیست.
3. **`activeTunnels` سراسری:** اگر Worker بهخاطر idle ایزولهاش را ببندد، شمارنده ریست میشود — بیخطر.
4. **یک تفاوت محیطی:** در Cloudflare واقعی، `socket.opened` ممکن است reject کند؛ این با `withTimeout` (Promise.race) هندل میشود و rejection سرگردان نمیماند.

---

## جمعبندی

کد v1.1.8 از نظر 1101 **تمیز است**: تمام مسیرهای sync و async محافظت شدهاند و هر خطای runtime به یک پاسخ نرمال (404/1011) تبدیل میشود. خطاهای مشاهدهشده در لاگ قبلی شما «internal error» زیرساخت Cloudflare بودند (در colo GYD)، نه خطای کد — همان تحلیل قبلی پابرجاست.
