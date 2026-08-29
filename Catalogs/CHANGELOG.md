# 📋 Changelog — v1.1.15

**Date:** 2026-08-29 · **Base:** v1.1.14 (code identical to v1.1.13)

**English** | [فارسی](CHANGELOG_FA.md) | [中文](CHANGELOG_CN.md)

## ✅ Fixes

### 1. Echo the WebSocket subprotocol even without valid early data (important — client compatibility)

**Before:** if a client sent a `Sec-WebSocket-Protocol` header but `decodeEarlyData` returned an invalid value (broken base64, larger than 8192, or empty), the server did not return the header in the 101 response.

**Problem:** per RFC 6455, a client that requested a subprotocol and doesn't receive it back **must** close the connection → reconnect loops on some v2rayNG / Xray versions.

**Now:** the header is always echoed whenever the client sends one — independent of the early-data content.

**New tests:** 3 regression tests (broken / oversized / named subprotocol such as `binary`).

### 2. Evict the oldest entry instead of clearing the whole uuidCache

**Before:** with more than 32 UUIDs, `uuidCache.clear()` emptied the entire cache.
**Now:** only the oldest entry is removed (simple LRU). The real-world impact was tiny (usually a single UUID), but the behavior is now correct.

### 3. Version consistency

`package.json` moved from `1.1.12` and the README badges from various versions to a unified **1.1.15**. The `deploy/` bundles were rebuilt and the root `worker.js` / `_worker.js` were refreshed.

## 📊 Status of the 13-item debug report (audited against the v1.1.14 code)

| # | Reported issue | Actual status |
|---|---|---|
| 1 | XSS in HTML_ESCAPES | ❌ Did not exist — the code was correct (`"&": "&amp;"`, …) |
| 2 | Trailing spaces in FALLBACK_RESOLVERS | ❌ Did not exist — all URLs were clean |
| 3 | Missing subprotocol echo | ✅ **Real — fixed in this version** |
| 4 | Race condition in activeTunnels | ❌ No `await` between check and increment → atomic in single-threaded JS |
| 5 | Unchecked safeSend | ❌ Both call sites already have `if (!safeSend(...)) throw` |
| 6 | ERL_DAT vs 8192 inconsistency | Intentional design (commented in code) — a lenient server is harmless |
| 7 | resolverScore memory leak | ❌ Bounded and controlled (cap 16, low scorers removed) |
| 8 | PDR validation | ❌ parseProxyTarget fully validates (port 1–65535) |
| 9 | uuidCache.clear | ✅ **Real (minor) — fixed in this version** |
| 10 | ctx.waitUntil for cleanup | ❌ The counter is per-isolate; it resets when the isolate dies — no persistent leak possible |
| 11 | DNS timeout logging | ⚠️ Minor — AbortError message is sufficient; deliberately unchanged |
| 12 | Empty requestHost | ❌ In practice always filled from the live request URL |
| 13 | structuredClone for replay | ❌ Uint8Arrays are never mutated |

**Summary:** of the 13 reported items, only **2 were real** (1 protocol-compatibility fix + 1 minor optimization) — both fixed. 10 were false alarms / intentional design and 1 minor item was deliberately left unchanged.

## 🧪 Tests

- Functional: **56 pass / 0 fail** (unchanged)
- 1101 / concurrency: **47 pass / 0 fail** (44 previous + 3 new for the subprotocol fix)
- Syntax of all three files (src, dashboard, min): ✅
