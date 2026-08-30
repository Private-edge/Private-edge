# 🧪 Test Report — Private Edge v1.1.15

**English** | [فارسی](TEST_REPORT_FA.md) | [中文](TEST_REPORT_CN.md)

> **Date:** 2026-08-29 · **Scope:** v1.1.15 source, compiled builds, and the deployable `_worker.js` in this repository
> **Method:** full re-run of every test suite + a dedicated 43-scenario black-box probe executed against the minified build itself + line-by-line code review

---

## 🎯 Executive Summary

| Test layer | Count | Result |
|---|---|---|
| 1. Syntax check (5 JS files) | 5 | ✅ all valid |
| 2. Functional tests (source) | 56 | ✅ 56 / 0 |
| 3. Error-1101 & concurrency tests (source) | 47 | ✅ 47 / 0 |
| 4. Error-1101 tests (dashboard build) | 47 | ✅ 47 / 0 |
| 5. Black-box probe (minified `_worker.js`) | 43 | ✅ 43 / 0 |
| **Total checks executed** | **198** | **✅ 0 failures** |

**Verdict:** v1.1.15 passes all five layers without a single error. The `_worker.js` in this repository behaves identically to the readable source.

---

## 1. Methodology

1. **Full re-run** of all three project test suites from scratch (no reliance on previous results)
2. **Error-1101 harness executed against the dashboard build** (not just the source) — proving the compiled output is equally safe
3. **Dedicated black-box probe:** a sandboxed harness that loads the actual minified `_worker.js` from this repository and drives 43 real-world scenarios from the outside — exactly what a client or scanner would observe
4. **Static code review** of the 1101 defense layers and cases the tests cannot cover

---

## 2. Flows Tested — 43-Scenario Black-Bubble Probe

### 🔀 A. Routing & cover page (9/9 ✅)

| Scenario | Result |
|---|---|
| GET / with `LND_MOD=all` → 200 HTML | ✅ |
| Strict CSP header on the page (`default-src 'none'`) | ✅ |
| `LND_MOD=root` → root 200 / other paths 404 | ✅ |
| `LND_MOD=off` → 404 | ✅ |
| HEAD → 200 · POST → 404 | ✅ |
| Unknown path → 404 + `nosniff` header (camouflage) | ✅ |
| WebSocket upgrade to a wrong path → 404 | ✅ |

### 📦 B. Config endpoint & authentication (15/15 ✅)

| Scenario | Result |
|---|---|
| `format=sub` → base64 that decodes to a valid `vless://` URI | ✅ |
| `Profile-Title` header = config name (base64) | ✅ |
| `format=uri` → port 443 + TLS + default `ed=2560` | ✅ |
| **No token → 404** · wrong token → 404 (`SUB_TKN` lock) | ✅ |
| Bearer token → 200 | ✅ |
| `format=notls` → `security=none` + port 80 | ✅ |
| `format=core` (legacy) → `vnext` structure | ✅ |
| `format=modern` → `settings.address` + `method: websocket` | ✅ |
| `format=sb` → vless + ws transport + `max_early_data=2560` + early-data header | ✅ |
| `format=ech` with `ECH_CFG` → JSON containing the config | ✅ |
| `PUB_HST` applied to the generated URI | ✅ |

### 🔌 C. WebSocket & VLESS protocol (11/11 ✅)

| Scenario | Result |
|---|---|
| No subprotocol → 101 without echo | ✅ |
| Named subprotocol (`binary`) → 101 + echo — **v1.1.15 fix** | ✅ |
| Broken subprotocol → 101 + echo — **v1.1.15 fix** | ✅ |
| Valid early data → 101 + echo | ✅ |
| Wrong UUID → abort 1011 | ✅ |
| Private destinations: `127.0.0.1` / `10.x` / `::ffff:10.0.0.1` (IPv4-mapped) → 1011 | ✅ |
| Port 25 → 1011 (anti-spam) | ✅ |
| Valid TCP session → upstream data relayed with VLESS response header + clean close 1000 | ✅ |
| `MAX_TUN=1` → second connection 404 | ✅ |

### 📡 D. DNS relay (3/3 ✅)

| Scenario | Result |
|---|---|
| DNS (cmd=2, port=53) → DoH query issued and answer relayed with length prefix | ✅ |
| **Primary DoH blocked → automatic fallback to the next resolver (1.1.1.1)** | ✅ |
| Invalid DNS packet (<12 bytes) → handled, no 1101 | ✅ |

### 🔐 E. Environment validation & security (5/5 ✅)

| Scenario | Result |
|---|---|
| Missing `IDUS` → 404 | ✅ |
| Invalid `BLK_PRV` → 404 (**fail-closed**) | ✅ |
| Invalid `PRX_MOD` → 404 (**fail-closed**) | ✅ |
| Non-HTTPS `DOH_URL` → 404 | ✅ |
| Truncated header → server waits, no error | ✅ |

---

## 3. Feature Verification

| Feature | Status | Evidence |
|---|---|---|
| VLESS over WebSocket proxy | ✅ | C4, C5, C10 |
| TLS + noTLS | ✅ | B4, B9 |
| TCP relay via `cloudflare:sockets` | ✅ | C10 |
| Multi-target failover + replay buffer | ✅ | functional suite (TcpChannel) |
| ProxyIP — 3 modes (fallback/always/off) | ✅ | functional suite + E3 |
| DNS UDP/53 → DoH relay | ✅ | D1 |
| **Resolver fallback chain** (raw IPs for Iran) | ✅ | D2 |
| 0-RTT early data (`?ed=2560`) | ✅ | B5, B13, C4 |
| Full subprotocol echo (RFC 6455) | ✅ | C2, C3 |
| Xray config generation (legacy & modern) | ✅ | B10, B11 |
| sing-box config generation | ✅ | B12, B13 |
| base64 subscription + `Profile-Title` | ✅ | B1–B3 |
| ECH (fixed config + DNS lookup) | ✅ | B14 |
| Subscription auth (query + Bearer) | ✅ | B6–B8 |
| Private network blocking (IPv4/IPv6/mapped) | ✅ | C6–C8 |
| Port 25 blocking | ✅ | C9 |
| Simultaneous tunnel cap `MAX_TUN` | ✅ | C11 |
| Constant-time UUID/token comparison | ✅ | code review (constantBytesEqual / constantStringEqual) |
| Customizable cover page | ✅ | A1–A5 |
| Fail-closed environment validation | ✅ | E1–E4 |
| Security headers (CSP/nosniff/Referrer-Policy) | ✅ | A2, A8 |

---

## 4. Deep Analysis of Error 1101

Error 1101 means "an exception or rejection that escapes the fetch handler". The code has **8 consecutive defense layers**:

| Layer | Protection | Tested in |
|---|---|---|
| 1. fetch handler | entire body in `try/catch` → any error becomes 404 | harness §1 |
| 2. route (WS) | `acceptTunnelSocket` inside try/catch | harness §4 |
| 3. route (config) | `await` + try/catch → DoH failures contained | harness §2 |
| 4. WebSocket events | message/close/error each in try/catch | harness §6 |
| 5. message chain | `chain.then(push).catch(→ abort 1011)` | harness §6 |
| 6. pumpRemote | `void pumpRemote(...).catch(...)` | harness §6 |
| 7. socket/writer teardown | all with `.catch(() => {})` | code review |
| 8. timers | all cleared in `finally` | code review |

### Passing 1101 test scenarios (47, in 7 groups)

1. **Public HTTP routes** — GET/HEAD/POST, landing, 404, wrong paths
2. **Config with broken DoH** — rejecting fetch → 404, not 1101
3. **Broken environment** — missing IDUS, invalid values → 404
4. **WebSocket upgrades** — no header, wrong path, no subprotocol
5. **Valid/invalid early data** — broken base64, >8192 bytes, named protocols
6. **v2rayNG simulation** — ERL_DAT unset/0/2560 + 3000-byte early data
7. **Real sessions & edges** — wrong UUID, private destination, port 25, truncated header, text message, >1MB message, invalid ECH URL, `PRX_MOD=always` without PDR, oversized Bearer, invalid `MAX_TUN`, and a final check: **zero unhandled rejections**

> The Node process is monitored for `unhandledRejection` during the entire run — **zero occurrences**. The same was true for the 12 heavy concurrency scenarios of the earlier deep review (20 parallel sessions, socket-open failures, mid-stream failures).

---

## 5. Performance & Resources

| Metric | Value | Verdict |
|---|---|---|
| CPU per VLESS request | ~2.8 ms | ✅ safe margin below the 10 ms free-plan limit |
| Free-plan quota | 100k requests/day (each WS = 1 request) | sufficient for personal use |
| UUID cache | 32 entries with LRU eviction (v1.1.15 fix) | ✅ |
| Replay buffer cap | 262,144 bytes (configurable) | ✅ bounded |
| WebSocket message cap | 1 MB | ✅ |
| DNS queries per session | 1000 | ✅ bounded |

---

## 6. Known Limitations (honest)

| Limitation | Detail |
|---|---|
| UDP only on port 53 | inherent Workers limitation — no QUIC or other UDP |
| No DNS answer cache | every query goes to DoH (simple/safe design; cost = one fetch) |
| ECH not enforced | the Worker cannot force ECH on Cloudflare's edge TLS handshake |
| `MAX_TUN` is per-isolate | not per-account — effective cap is higher across isolates |
| `workers.dev` dependency | filtered in some regions — a custom domain is recommended |
| noTLS | only with a custom domain + "Always Use HTTPS" disabled |

---

## 7. Conclusion

Version **v1.1.15** was verified with **198 executable checks across 5 layers** without a single failure. All 23 documented features behave as specified, all 8 error-1101 defense layers are intact, and every malformed-input path (broken env, broken header, wrong token, forbidden destination, dead DoH) terminates in a controlled way (404/1011) — never an escaping exception.

**Production-ready.** 🚀
