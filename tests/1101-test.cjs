// Test harness for 1101 (unhandled exception / unhandled rejection) — v8
// Loads the REAL src/index.js with minimal stubs, drives the real fetch handler
// through many scenarios, and fails if ANY call rejects or any unhandled
// rejection escapes (the exact conditions that cause Cloudflare error 1101).
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "..", "src", "index.js"), "utf8");

// ---------- stubs ----------
let unhandled = [];
process.on("unhandledRejection", (reason) => {
  unhandled.push(String(reason && reason.message ? reason.message : reason));
});

// Node's real Response rejects `webSocket` init that isn't a native WebSocket,
// so we replace it with a faithful fake that keeps the server socket accessible.
class FakeResponse {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status || 200;
    this.headers = new Headers(init.headers);
    this.webSocket = init.webSocket || null;
  }
  async text() {
    if (this.body == null) return "";
    if (typeof this.body === "string") return this.body;
    if (this.body instanceof Uint8Array) return Buffer.from(this.body).toString("latin1");
    return String(this.body);
  }
  async json() { return JSON.parse(await this.text()); }
}
globalThis.Response = FakeResponse;

class FakeServerWS {
  constructor() {
    this.readyState = 0;
    this.listeners = {};
    this.sent = [];
    this.closedCode = null;
    this.closedReason = null;
  }
  accept() { this.readyState = 1; }
  addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
  emit(type, ev) { for (const fn of this.listeners[type] || []) fn(ev); }
  send(data) { this.sent.push(data); }
  close(code, reason) { this.readyState = 3; this.closedCode = code; this.closedReason = reason; }
}
class FakeClientWS {
  constructor() { this.readyState = 0; }
  accept() { this.readyState = 1; }
  addEventListener() {}
  send() {}
  close() { this.readyState = 3; }
}
class FakeWebSocketPair {
  constructor() {
    // same instance for both ends so tests can emit events via the returned socket
    const ws = new FakeServerWS();
    this[0] = ws;
    this[1] = ws;
  }
}

function makeFakeSocket() {
  return {
    opened: Promise.resolve(),
    closed: Promise.resolve(),
    writable: { getWriter: () => ({ write: async () => {}, abort: async () => {} }) },
    readable: { getReader: () => ({ read: async () => ({ done: true, value: undefined }), releaseLock: () => {} }) },
    close: async () => {},
  };
}

// replace import with stub + export default with assignable var
let code = source
  .replace('import { connect as openTcpSocket } from "cloudflare:sockets";',
    "const openTcpSocket = (opts) => makeFakeSocket(opts);")
  .replace("export default {", "globalThis.__worker = {");

globalThis.WebSocketPair = FakeWebSocketPair;
eval(code);
const worker = globalThis.__worker;

// ---------- helpers ----------
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${detail}`); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UUID = "123e4567-e89b-42d3-a456-426614174000";
const BASE = "https://snowy.example.workers.dev";
const baseEnv = {
  IDUS: UUID, BLK_PRV: "true", PRX_MOD: "off", PDR: "", DBG: "false",
  DOH_URL: "https://cloudflare-dns.com/dns-query", DOH_JSON_URL: "https://cloudflare-dns.com/dns-query",
  ECH_MOD: "off", CFG_NAM: "test", CON_TMO_MS: "8000", MAX_RPL_BYT: "262144",
  FPR: "chrome", LOC_SCK_PRT: "10808", LOC_MIX_PRT: "2080", ERL_DAT: "2560",
  WS_PTH: "/" + UUID, SUB_PTH: "/" + UUID, SUB_TKN: "tok123",
  PUB_HST: "snowy.example.workers.dev",
  LND_MOD: "off",
};
const landingEnv = { ...baseEnv, LND_MOD: "all" };

function vlessHeader({ cmd = 1, port = 443, atype = 1, addrBytes = [1, 2, 3, 4], uuid = UUID, payload = [] }) {
  const u = []; // uuid bytes
  const compact = uuid.replace(/-/g, "");
  for (let i = 0; i < 16; i++) u.push(parseInt(compact.slice(i * 2, i * 2 + 2), 16));
  return new Uint8Array([0, ...u, 0, cmd, (port >> 8) & 255, port & 255, atype, ...addrBytes, ...payload]);
}
const b64url = (bytes) => Buffer.from(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

// every scenario: call worker.fetch, must RESOLVE (never reject)
async function call(name, req, env = baseEnv) {
  try {
    const res = await worker.fetch(req, env);
    return res;
  } catch (err) {
    fail++;
    console.log(`  ✗ ${name} → REJECTED (1101!): ${err.message}`);
    return null;
  }
}

(async () => {
  console.log("\n== 1) مسیرهای HTTP عمومی ==");
  let r = await call("GET / (LND_MOD=all)", new Request(BASE + "/"), landingEnv);
  check("GET / → 200 landing", r && r.status === 200);
  r = await call("HEAD / (LND_MOD=all)", new Request(BASE + "/", { method: "HEAD" }), landingEnv);
  check("HEAD / → 200", r && r.status === 200);
  r = await call("POST / (LND_MOD=all)", new Request(BASE + "/", { method: "POST" }), landingEnv);
  check("POST / → 404", r && r.status === 404);
  r = await call("GET /index.html (LND_MOD=all)", new Request(BASE + "/index.html"), landingEnv);
  check("GET /index.html → 200", r && r.status === 200);
  r = await call("GET /wrong (LND_MOD=off)", new Request(BASE + "/wrong"));
  check("GET /wrong → 404", r && r.status === 404);
  r = await call("GET / (LND_MOD=off)", new Request(BASE + "/"));
  check("GET / با LND_MOD=off → 404", r && r.status === 404);

  console.log("\n== 2) endpoint خصوصی (config) ==");
  r = await call("format=uri با token", new Request(BASE + "/" + UUID + "?format=uri&token=tok123"));
  check("format=uri → 200", r && r.status === 200 && (await r.text()).startsWith("vless://"));
  r = await call("format=uri بدون token", new Request(BASE + "/" + UUID + "?format=uri"));
  check("بدون token → 404", r && r.status === 404);
  r = await call("format=sub", new Request(BASE + "/" + UUID + "?format=sub&token=tok123"));
  check("format=sub → 200", r && r.status === 200);
  r = await call("format=xray", new Request(BASE + "/" + UUID + "?format=core&token=tok123"));
  check("format=core → 200 JSON", r && r.status === 200 && JSON.parse(await r.text()).outbounds);
  r = await call("format=sb", new Request(BASE + "/" + UUID + "?format=sb&token=tok123"));
  check("format=sb → 200 JSON", r && r.status === 200);
  r = await call("format=ech با ECH_CFG", new Request(BASE + "/" + UUID + "?format=ech&token=tok123"), { ...baseEnv, ECH_MOD: "auto", ECH_CFG: "QUJDREVGRw==" });
  check("format=ech fixed → 200", r && r.status === 200);
  // DoH خراب: fetch که reject می‌کند — باید در catch خورده شود نه 1101
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("network down"); };
  r = await call("format=ech با DoH خراب (fetch rejects)", new Request(BASE + "/" + UUID + "?format=ech&token=tok123"), { ...baseEnv, ECH_MOD: "auto", ECH_CFG: "" });
  globalThis.fetch = realFetch;
  check("DoH خراب → 404 (نه 1101)", r && r.status === 404);
  // JSON خراب از DoH
  globalThis.fetch = async () => ({ ok: true, json: async () => { throw new SyntaxError("bad json"); } });
  r = await call("format=ech با JSON خراب", new Request(BASE + "/" + UUID + "?format=ech&token=tok123"), { ...baseEnv, ECH_MOD: "auto", ECH_CFG: "" });
  globalThis.fetch = realFetch;
  check("JSON خراب → 404 (نه 1101)", r && r.status === 404);
  // token خیلی بزرگ
  r = await call("token بیش از ۱۰۲۴", new Request(BASE + "/" + UUID + "?token=" + "a".repeat(2000)));
  check("token بزرگ → 404", r && r.status === 404);

  console.log("\n== 3) env خراب (باید 404 بدهد نه 1101) ==");
  r = await call("بدون IDUS", new Request(BASE + "/" + UUID), { LND_MOD: "off" });
  check("بدون IDUS → 404", r && r.status === 404);
  r = await call("env کاملاً خالی", new Request(BASE + "/"), {});
  check("env خالی → landing 200 (پیش‌فرض LND_MOD=all، نه 1101)", r && r.status === 200, "status=" + (r && r.status));
  r = await call("BLK_PRV نامعتبر", new Request(BASE + "/" + UUID + "?format=uri&token=tok123"), { ...baseEnv, BLK_PRV: "maybe" });
  check("BLK_PRV=maybe → 404", r && r.status === 404);
  r = await call("PRX_MOD نامعتبر", new Request(BASE + "/" + UUID + "?format=uri&token=tok123"), { ...baseEnv, PRX_MOD: "maybe" });
  check("PRX_MOD=maybe → 404", r && r.status === 404);
  r = await call("DOH_URL http", new Request(BASE + "/" + UUID + "?format=uri&token=tok123"), { ...baseEnv, DOH_URL: "http://x.com/dns-query" });
  check("DOH_URL http → 404", r && r.status === 404);
  r = await call("ECH_CFG نامعتبر", new Request(BASE + "/" + UUID + "?format=uri&token=tok123"), { ...baseEnv, ECH_CFG: "!!bad!!" });
  check("ECH_CFG خراب → 404", r && r.status === 404);

  console.log("\n== 4) WebSocket upgrade (بدون هدر) ==");
  const wsReq = (subprotocol) => {
    const headers = { Upgrade: "websocket", Connection: "Upgrade" };
    if (subprotocol) headers["Sec-WebSocket-Protocol"] = subprotocol;
    return new Request(BASE + "/" + UUID, { headers });
  };
  r = await call("WS مسیر اشتباه", new Request(BASE + "/wrong", { headers: { Upgrade: "websocket", Connection: "Upgrade" } }));
  check("WS مسیر اشتباه → 404", r && r.status === 404);
  r = await call("WS بدون subprotocol", wsReq());
  check("WS بدون subprotocol → 101", r && r.status === 101);

  console.log("\n== 5) WebSocket با early data معتبر/نامعتبر ==");
  const goodHeader = vlessHeader({ cmd: 1, port: 443, atype: 1, addrBytes: [1, 2, 3, 4] });
  r = await call("WS با هدر VLESS معتبر در early data", wsReq(b64url(goodHeader)));
  check("WS valid early data → 101 + echo", r && r.status === 101 && r.headers.get("Sec-WebSocket-Protocol") !== null);
  r = await call("WS با subprotocol خراب (غیر base64)", wsReq("!!!not-base64!!!"));
  check("WS subprotocol خراب → 101 (نه 400، نه 1101)", r && r.status === 101);
  check("subprotocol خراب → echo میشود (فیکس RFC 6455 — v1.1.15)", r && r.headers.get("Sec-WebSocket-Protocol") === "!!!not-base64!!!");
  r = await call("WS با subprotocol خیلی بزرگ (>8192)", wsReq("A".repeat(9000)));
  check("WS subprotocol بزرگ → 101 (فقط decode null)", r && r.status === 101);
  check("subprotocol بزرگ → echo میشود (فیکس RFC 6455 — v1.1.15)", r && r.headers.get("Sec-WebSocket-Protocol") === "A".repeat(9000));
  r = await call("WS با subprotocol اسمی (غیر early data)", wsReq("binary"));
  check("subprotocol اسمی → 101 + echo (سازگاری کلاینتها — v1.1.15)", r && r.status === 101 && r.headers.get("Sec-WebSocket-Protocol") === "binary");

  console.log("\n== 5b) شبیه‌سازی v2rayNG (early data) ==");
  // v2rayNG با مسیر ?ed=2560 هدر early data می‌فرستد.
  // اگر ERL_DAT در داشبورد ۰ یا خالی باشد، نسخهٔ قبلی echo نمی‌کرد → RFC 6455 → قطع اتصال.
  const edHeader = b64url(goodHeader); // ~80 کاراکتر
  r = await call("v2rayNG: ERL_DAT تنظیم‌نشده + early data", wsReq(edHeader), baseEnv);
  check("ED با ERL_DAT نامشخص → 101 + echo (فیکس!)", r && r.status === 101 && r.headers.get("Sec-WebSocket-Protocol") === edHeader);
  r = await call("v2rayNG: ERL_DAT=0 + early data", wsReq(edHeader), { ...baseEnv, ERL_DAT: "0" });
  check("ED با ERL_DAT=0 → 101 + echo (فیکس!)", r && r.status === 101 && r.headers.get("Sec-WebSocket-Protocol") === edHeader);
  r = await call("v2rayNG: ERL_DAT=2560 + early data", wsReq(edHeader), { ...baseEnv, ERL_DAT: "2560" });
  check("ED با ERL_DAT=2560 → 101 + echo", r && r.status === 101 && r.headers.get("Sec-WebSocket-Protocol") === edHeader);
  // early data بزرگ‌تر از ۲۵۶۰ (مثلاً ۳۰۰۰ بایت) — با maxEarly=8192 باید پذیرفته شود
  const bigEd = b64url(new Uint8Array(3000).fill(0x41));
  r = await call("early data 3000 بایت", wsReq(bigEd), { ...baseEnv, ERL_DAT: "2560" });
  check("ED بزرگ (>2560) → 101 + echo (با maxEarly=8192)", r && r.status === 101 && r.headers.get("Sec-WebSocket-Protocol") === bigEd);

  console.log("\n== 6) سشن WebSocket واقعی (از طریق پیام) ==");
  // وصل می‌شویم، هدر VLESS را به‌عنوان پیام باینری می‌فرستیم و مطمئن می‌شویم rejection فراری نداریم
  const res = await worker.fetch(wsReq(), baseEnv);
  check("اتصال برای سشن", res && res.status === 101);
  if (res) {
    const server = res.webSocket; // FakeServerWS
    // 6a: هدر معتبر برای مقصد عمومی → باید TCP stub را صدا بزند و بدون خطا تمام شود
    server.emit("message", { data: goodHeader.buffer });
    await sleep(120);
    check("سشن TCP معتبر: بدون unhandled rejection", unhandled.length === 0, unhandled.join("; "));
    // 6b: هدر با UUID اشتباه → Auth failed → abort 1011
    const badUuidHeader = vlessHeader({ uuid: "00000000-0000-4000-8000-000000000000" });
    server.emit("message", { data: badUuidHeader.buffer });
    await sleep(60);
    check("UUID اشتباه → abort 1011", server.closedCode === 1011 || unhandled.length === 0);
    // 6c: مقصد خصوصی → Destination denied → 1011
    const privHeader = vlessHeader({ port: 80, addrBytes: [127, 0, 0, 1] });
    server.emit("message", { data: privHeader.buffer });
    await sleep(60);
    check("مقصد خصوصی → abort 1011", server.closedCode === 1011 || unhandled.length === 0);
    // 6d: پورت 25 → Port denied
    const port25 = vlessHeader({ port: 25, addrBytes: [8, 8, 8, 8] });
    server.emit("message", { data: port25.buffer });
    await sleep(60);
    check("پورت 25 → abort 1011", server.closedCode === 1011 || unhandled.length === 0);
    // 6e: هدر ناقص (کمتر از ۱۸ بایت) → منتظر دادهٔ بیشتر می‌ماند، خطا نه
    server.emit("message", { data: new Uint8Array(5).buffer });
    await sleep(30);
    check("هدر ناقص → بدون خطا", unhandled.length === 0);
    // 6f: پیام متنی (text frame) → Binary frames required → abort 1011 نه 1101
    server.emit("message", { data: "hello text" });
    await sleep(60);
    check("پیام متنی → abort 1011 (نه 1101)", server.closedCode === 1011 || unhandled.length === 0);
    // 6g: بستن سشن
    server.emit("close", {});
    await sleep(30);
    check("بستن سشن → بدون خطا", unhandled.length === 0);

    console.log("\n== 7) سناریوهای لبه ==");
    // 7a: پیام بزرگ‌تر از ۱MB → asUint8Array خطا → abort 1011 (نه 1101)
    const res2 = await worker.fetch(wsReq(), baseEnv);
    if (res2) {
      res2.webSocket.emit("message", { data: new Uint8Array(1048577).buffer });
      await sleep(60);
      check("پیام >1MB → abort 1011 (نه 1101)", res2.webSocket.closedCode === 1011 || unhandled.length === 0, "code=" + res2.webSocket.closedCode + " unhandled=" + unhandled.length);
    }
    // 7b: format=ech با DOH_JSON_URL نامعتبر (new URL خطا) → باید 404 شود
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ Answer: [] }) });
    r = await call("format=ech با URL نامعتبر", new Request(BASE + "/" + UUID + "?format=ech&token=tok123"), { ...baseEnv, ECH_MOD: "auto", ECH_CFG: "", DOH_JSON_URL: "not a url" });
    globalThis.fetch = realFetch;
    check("URL نامعتبر در lookupEch → 404 (نه 1101)", r && r.status === 404);
    // 7c: PRX_MOD=always بدون PDR در سشن → buildTargets خطا → abort 1011
    const res3 = await worker.fetch(wsReq(), { ...baseEnv, PRX_MOD: "always", PDR: "" });
    if (res3) {
      res3.webSocket.emit("message", { data: goodHeader.buffer });
      await sleep(80);
      check("PRX_MOD=always بدون PDR → abort 1011 (نه 1101)", res3.webSocket.closedCode === 1011 || unhandled.length === 0, "code=" + res3.webSocket.closedCode);
    }
    // 7d: SUB_PTH مسیر جدا + token فقط Bearer
    r = await call("Bearer بدون query", new Request(BASE + "/" + UUID + "?format=uri", { headers: { Authorization: "Bearer tok123" } }));
    check("Bearer header → 200", r && r.status === 200);
    // 7e: method GET به مسیر WS با Upgrade وب‌سوکت ولی مسیر درست ولی env بدون IDUS → 404
    r = await call("WS با env بدون IDUS", wsReq(), { LND_MOD: "off" });
    check("WS بدون IDUS → 404 (نه 1101)", r && r.status === 404);
  }
  await sleep(100);
  check("در پایان: صفر unhandled rejection", unhandled.length === 0, unhandled.join("; "));

  console.log(`\n══════════════════════════════════`);
  console.log(`نتیجه: ${pass} پاس / ${fail} خطا`);
  console.log(`══════════════════════════════════`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
