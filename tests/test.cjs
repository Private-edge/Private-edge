// Self-contained test suite for Private edge 2 v8 (v1.1.8) — no external deps.
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "..", "src", "index.js"), "utf8");

let pass = 0;
let fail = 0;
function check(name, ok, detail = "") {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${detail}`); }
}

// --- prerequisites used by extracted functions ---
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const uuidCache = new Map();
let activeTunnels = 0;
const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const DEFAULT_DOH = "https://cloudflare-dns.com/dns-query";
const ECH_TIMEOUT_MS = 6000;
const MAX_PROXY_TARGETS = 8;
const MAX_HEADER_BYTES = 1024;
const MAX_DNS_PACKET_BYTES = 16384;
const MAX_DNS_QUERIES = 1000;
const MAX_WS_CHUNK = 1048576;
const DNS_TIMEOUT_MS = 8000;
const FALLBACK_RESOLVERS = [
  "https://1.1.1.1/dns-query",
  "https://8.8.8.8/dns-query",
  "https://9.9.9.9/dns-query",
  "https://one.one.one.one/dns-query",
  "https://dns.quad9.net/dns-query",
  "https://doh.pub/dns-query",
  "https://doh.alidns.com/dns-query",
  "https://dns.google/dns-query",
];
const resolverScore = new Map();

// --- extract function blocks (sloppy-mode eval, shared scope) ---
// Chunk A0: buildResolverList
eval(source.slice(source.indexOf("function buildResolverList"), source.indexOf("async function handleConfigEndpoint")));
// Chunk A: endpoint + WS + classes + header parse + targets
// (class declarations only live inside the eval's lexical scope, so we
//  re-expose them via globalThis for later use)
eval(source.slice(source.indexOf("async function handleConfigEndpoint"), source.indexOf("function createClientUri"))
  + "\n;globalThis.EdgeSession = EdgeSession; globalThis.DnsChannel = DnsChannel; globalThis.TcpChannel = TcpChannel;");
// Chunk B: config + security + parse + early data + uuid + helpers
eval(source.slice(source.indexOf("function createClientUri"), source.indexOf("function observeSocket")));
// Chunk C: remaining helpers (responses, landing, env)
eval(source.slice(source.indexOf("function observeSocket"), source.indexOf("function asciiReason")));
eval(source.slice(source.indexOf("function asciiReason")));

console.log("\n== 1) امنیت: بلاک شبکه خصوصی ==");
const blocked = [
  "127.0.0.1","10.0.0.1","192.168.1.5","172.16.0.1","172.31.255.255","169.254.169.254",
  "100.64.0.1","198.18.0.1","192.0.0.1","192.0.2.1","0.0.0.0","224.0.0.1",
  "localhost","db.local","api.internal","router.home.arpa","metadata.google.internal","metadata.google",
  "::","::1","fe80::1","fc00::1","fd12:3456::1","ff02::1","0:0:0:0:0:0:0:1",
  "::ffff:127.0.0.1","::ffff:10.0.0.1","::ffff:192.168.1.1","::ffff:169.254.169.254","::ffff:7f00:1",
  "::ffff:a00:1","::ffff:ac10:1","0:0:0:0:0:ffff:7f00:1","::7f00:1",
  "127.1","127.0.1","10.1","192.168.1","2130706433","0x7f000001","0177.0.0.1",
  "017700000001","0x7f.0.0.1","127.0.0.01","127.0.0.1.",
];
const allowed = [
  "8.8.8.8","1.1.1.1","9.9.9.9","example.com","edge.example.com","example.com.",
  "2001:4860:4860::8888","2606:4700:4700::1111","2001:db8::1","64:ff9b::1.2.3.4",
  "::ffff:8.8.8.8","::8.8.8.8","0x08080808","1.2","172.0.0.1",
];
let bad = 0;
for (const h of blocked) if (!isForbiddenDestination(h, {})) { console.log("  ✗ باید بلاک شود:", h); bad++; }
for (const h of allowed) if (isForbiddenDestination(h, {})) { console.log("  ✗ نباید بلاک شود:", h); bad++; }
check("همهٔ ۴۵ حالت خصوصی بلاک / ۱۵ حالت عمومی مجاز", bad === 0, `(${bad} خطا)`);

check("BLK_PRV=false محافظ را خاموش می‌کند (عمدی)", isForbiddenDestination("127.0.0.1", { BLK_PRV: "false" }) === false);
let fb = 0;
for (const v of ["", "0", "no", "TRUE ", "1", "yes", "true"]) if (!isForbiddenDestination("127.0.0.1", { BLK_PRV: v })) fb++;
check("مقادیر نامعتبر BLK_PRV fail-closed", fb === 0);
check("بدون BLK_PRV (پیش‌فرض) بلاک فعال است", isForbiddenDestination("127.0.0.1", {}) === true);
check("PUB_HST خودِ Worker بلاک می‌شود", isForbiddenDestination("edge.example.com", { PUB_HST: "edge.example.com" }) === true);

console.log("\n== 2) اعتبارسنجی ECH_CFG و envStr ==");
check("ECH_CFG معتبر", isValidEchConfig("aGVsbG8=") === true);
check("ECH_CFG نامعتبر رد", isValidEchConfig("abc!") === false);
check("envStr fallback", envStr(undefined, "x") === "x" && envStr("  a  ") === "a");

console.log("\n== 3) پارس هدر VLESS (parseTunnelHeader) ==");
const UUID = "123e4567-e89b-42d3-a456-426614174000";
function buildHeader({ cmd, port, atype, addrBytes, payload = [], opts = 0, optBytes = [] }) {
  const u = uuidToBytes(UUID);
  return new Uint8Array([0, ...u, opts, ...optBytes, cmd, (port >> 8) & 255, port & 255, atype, ...addrBytes, ...payload]);
}
const h1 = buildHeader({ cmd: 1, port: 443, atype: 1, addrBytes: [1, 2, 3, 4], payload: [0xaa, 0xbb] });
const p1 = parseTunnelHeader(h1, UUID);
check("هدر IPv4 سالم پارس می‌شود", p1 && p1.address === "1.2.3.4" && p1.command === 1 && p1.port === 443 && p1.version === 0);
check("payloadOffset درست است", p1 && h1[p1.payloadOffset] === 0xaa && h1[p1.payloadOffset + 1] === 0xbb);

const h2 = buildHeader({ cmd: 1, port: 80, atype: 2, addrBytes: [11, ...Array.from(new TextEncoder().encode("example.com"))] });
const p2 = parseTunnelHeader(h2, UUID);
check("هدر دامنه (atype=2) پارس می‌شود", p2 && p2.address === "example.com" && p2.port === 80);

const h3 = buildHeader({ cmd: 1, port: 53, atype: 3, addrBytes: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1] });
const p3 = parseTunnelHeader(h3, UUID);
check("هدر IPv6 (atype=3) پارس می‌شود", p3 && p3.address === "0:0:0:0:0:0:0:1");

let threw = false;
try { parseTunnelHeader(buildHeader({ cmd: 1, port: 443, atype: 1, addrBytes: [8, 8, 8, 8] }), "00000000-0000-4000-8000-000000000000"); } catch { threw = true; }
check("UUID اشتباه → Auth failed", threw === true);
check("هدر کوتاه → null", parseTunnelHeader(new Uint8Array(10), UUID) === null);

console.log("\n== 4) تولید کانفیگ (TLS و noTLS) ==");
const env = {
  IDUS: UUID, BLK_PRV: "true", PRX_MOD: "off", PDR: "", DBG: "false",
  DOH_URL: "https://cloudflare-dns.com/dns-query", DOH_JSON_URL: "https://cloudflare-dns.com/dns-query",
  ECH_MOD: "off", CFG_NAM: "test-edge", CON_TMO_MS: "8000", MAX_RPL_BYT: "262144",
  FPR: "chrome", LOC_SCK_PRT: "10808", LOC_MIX_PRT: "2080", ERL_DAT: "2560",
  WS_PTH: "/ws-secret-path", SUB_PTH: "/sub-secret", SUB_TKN: "tok123",
  PUB_HST: "edge.example.com", SNI: "edge.example.com", HST_HDR: "edge.example.com",
};
const url = new URL("https://edge.example.com/sub-secret?format=xray&token=tok123");

const uriTls = createClientUri(url, env, false);
check("URI TLS: security=tls + sni + fp + پورت 443",
  uriTls.startsWith("vless://" + UUID + "@edge.example.com:443?") &&
  uriTls.includes("security=tls") && uriTls.includes("sni=") && uriTls.includes("fp=chrome") &&
  uriTls.includes("path=%2Fws-secret-path%3Fed%3D2560"), uriTls);

const uriNoTls = createClientUri(url, env, true);
check("URI noTLS: security=none + بدون sni/fp + پورت 80",
  uriNoTls.startsWith("vless://" + UUID + "@edge.example.com:80?") &&
  uriNoTls.includes("security=none") && !uriNoTls.includes("sni=") && !uriNoTls.includes("fp="), uriNoTls);

const xray = createCoreConfig(url, env, false, false);
check("Xray TLS: tlsSettings + echConfigList مسیر ?ed=2560",
  xray.outbounds[0].settings.id === UUID &&
  xray.outbounds[0].streamSettings.security === "tls" &&
  xray.outbounds[0].streamSettings.tlsSettings.serverName === "edge.example.com" &&
  xray.outbounds[0].streamSettings.wsSettings.path === "/ws-secret-path?ed=2560");

const xrayNoTls = createCoreConfig(url, env, false, true);
check("Xray noTLS: security=none بدون tlsSettings",
  xrayNoTls.outbounds[0].streamSettings.security === "none" &&
  !xrayNoTls.outbounds[0].streamSettings.tlsSettings);

const xlegacy = createCoreConfig(url, env, true, false);
check("Xray legacy TLS: vnext + network ws", xlegacy.outbounds[0].settings.vnext[0].users[0].id === UUID && xlegacy.outbounds[0].streamSettings.network === "ws");

const sbTls = createSbConfig(url, env, false);
check("sing-box TLS: tls enabled + max_early_data",
  sbTls.outbounds[0].tls.enabled === true &&
  sbTls.outbounds[0].transport.max_early_data === 2560 &&
  sbTls.outbounds[0].transport.early_data_header_name === "Sec-WebSocket-Protocol");

const sbNoTls = createSbConfig(url, env, true);
check("sing-box noTLS: tls.enabled=false", sbNoTls.outbounds[0].tls.enabled === false);

check("effectiveConfigName پاک‌سازی", effectiveConfigName({ CFG_NAM: "a/b*c d" }) === "a-b-c-d" && effectiveConfigName({}) === "private-edge");

console.log("\n== 5) endpoint خصوصی (handleConfigEndpoint) ==");
async function bodyOf(res) { return { status: res.status, text: await res.text(), ct: res.headers.get("Content-Type"), ptitle: res.headers.get("Profile-Title") }; }

(async () => {
  const r1 = await bodyOf(await handleConfigEndpoint(new Request("https://edge.example.com/sub-secret?format=uri&token=tok123"), env, new URL("https://edge.example.com/sub-secret?format=uri&token=tok123")));
  check("format=uri → URI + newline", r1.text === createClientUri(url, env, false) + "\n");

  const r2 = await bodyOf(await handleConfigEndpoint(new Request("https://edge.example.com/sub-secret?format=notls&token=tok123"), env, new URL("https://edge.example.com/sub-secret?format=notls&token=tok123")));
  check("format=notls → URI بدون TLS", r2.text === createClientUri(url, env, true) + "\n");

  const r3 = await bodyOf(await handleConfigEndpoint(new Request("https://edge.example.com/sub-secret?format=uri&notls=1&token=tok123"), env, new URL("https://edge.example.com/sub-secret?format=uri&notls=1&token=tok123")));
  check("?notls=1 → URI بدون TLS", r3.text === createClientUri(url, env, true) + "\n");

  const r4 = await bodyOf(await handleConfigEndpoint(new Request("https://edge.example.com/sub-secret?format=uri&security=none&token=tok123"), env, new URL("https://edge.example.com/sub-secret?format=uri&security=none&token=tok123")));
  check("?security=none → URI بدون TLS", r4.text === createClientUri(url, env, true) + "\n");

  const r5 = await bodyOf(await handleConfigEndpoint(new Request("https://edge.example.com/sub-secret?format=sub&token=tok123"), env, new URL("https://edge.example.com/sub-secret?format=sub&token=tok123")));
  check("format=sub → base64 استاندارد", r5.text === Buffer.from(createClientUri(url, env, false) + "\n").toString("base64"));

  const r6 = await bodyOf(await handleConfigEndpoint(new Request("https://edge.example.com/sub-secret?format=core&token=tok123"), env, new URL("https://edge.example.com/sub-secret?format=core&token=tok123")));
  check("format=core → JSON معتبر + Profile-Title", JSON.parse(r6.text).outbounds[0].protocol === "vless" && r6.ptitle === "base64:" + Buffer.from("test-edge").toString("base64"));

  const r7 = await bodyOf(await handleConfigEndpoint(new Request("https://edge.example.com/sub-secret?format=sb&token=tok123"), env, new URL("https://edge.example.com/sub-secret?format=sb&token=tok123")));
  check("format=sb → sing-box JSON", JSON.parse(r7.text).outbounds[0].type === "vless");

  const r8 = await bodyOf(await handleConfigEndpoint(new Request("https://edge.example.com/sub-secret?format=zzz&token=tok123"), env, new URL("https://edge.example.com/sub-secret?format=zzz&token=tok123")));
  check("format ناشناخته → 404", r8.status === 404);

  // ECH fixed
  const echEnv = { ...env, ECH_MOD: "auto", ECH_CFG: "QUJDREVGRw==" };
  const r9 = await bodyOf(await handleConfigEndpoint(new Request("https://edge.example.com/sub-secret?format=ech&token=tok123"), echEnv, new URL("https://edge.example.com/sub-secret?format=ech&token=tok123")));
  const j9 = JSON.parse(r9.text);
  check("ECH fixed → echConfigList آرایه", Array.isArray(j9.echConfigList) && j9.echConfigList[0] === "QUJDREVGRw==" && j9.mode === "fixed");

  // ECH dns (mock fetch)
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ Answer: [{ type: 65, data: 'ech="QUJD"' }, { type: 1, data: "1.2.3.4" }] }) });
  try {
    const r10 = await bodyOf(await handleConfigEndpoint(new Request("https://edge.example.com/sub-secret?format=ech&token=tok123"), { ...env, ECH_MOD: "auto", ECH_CFG: "" }, new URL("https://edge.example.com/sub-secret?format=ech&token=tok123")));
    const j10 = JSON.parse(r10.text);
    check("ECH dns → فقط type=65", j10.mode === "dns" && JSON.stringify(j10.echConfigList) === JSON.stringify(["QUJD"]));
  } finally { globalThis.fetch = realFetch; }

  // DoH خراب → rejection (مهارشده در route)
  globalThis.fetch = async () => ({ ok: false });
  let rejected = false;
  try { await handleConfigEndpoint(new Request("https://edge.example.com/sub-secret?format=ech&token=tok123"), { ...env, ECH_MOD: "auto", ECH_CFG: "" }, new URL("https://edge.example.com/sub-secret?format=ech&token=tok123")); } catch { rejected = true; }
  globalThis.fetch = realFetch;
  check("DoH خراب → rejection (مهارشده)", rejected === true);

  console.log("\n== 6) احراز هویت (isAuthorized با url) ==");
  check("token در query معتبر", isAuthorized(new Request("https://x.example.com/s?token=tok123"), "tok123", new URL("https://x.example.com/s?token=tok123")) === true);
  check("token نادرست رد", isAuthorized(new Request("https://x.example.com/s?token=wrong"), "tok123", new URL("https://x.example.com/s?token=wrong")) === false);
  check("Bearer معتبر", isAuthorized(new Request("https://x.example.com/s", { headers: { Authorization: "Bearer tok123" } }), "tok123", new URL("https://x.example.com/s")) === true);
  check("بدون token رد", isAuthorized(new Request("https://x.example.com/s"), "tok123", new URL("https://x.example.com/s")) === false);
  check("query token بیش از ۱۰۲۴ → رد", isAuthorized(new Request("https://x.example.com/s?token=" + "a".repeat(2000)), "tok123", new URL("https://x.example.com/s?token=" + "a".repeat(2000))) === false);
  check("مقایسه constant-time", constantStringEqual("abc", "abc") === true && constantStringEqual("abc", "abcd") === false);

  console.log("\n== 7) early data (decodeEarlyData) ==");
  const enc = (s) => Buffer.from(s).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const d1 = decodeEarlyData(enc("hello"), 2560);
  check("decode صحیح base64url", d1 !== null && String.fromCharCode(...d1) === "hello");
  check("maxBytes=0 → null (بدون 400!)", decodeEarlyData(enc("hello"), 0) === null);
  check("کاراکتر نامعتبر → null", decodeEarlyData("!!not-base64!!", 2560) === null);
  check("بیش از maxBytes → null", decodeEarlyData(enc("hello"), 4) === null);
  check("خالی → Uint8Array(0)", decodeEarlyData("", 2560).byteLength === 0);

  console.log("\n== 8) targets (buildTargets / isAllowedTarget / parseProxyTarget) ==");
  const t1 = buildTargets("example.com", 443, { PRX_MOD: "fallback", PDR: "10.0.0.1,8.8.8.8,203.0.113.10", BLK_PRV: "true" }, "");
  const hs = t1.map((t) => t.hostname);
  check("PDR خصوصی حذف می‌شود", !hs.includes("10.0.0.1") && hs.includes("8.8.8.8") && hs.includes("203.0.113.10") && hs.includes("example.com"));
  const t2 = buildTargets("example.com", 443, { PRX_MOD: "fallback", PDR: "1.2.3.4:25", BLK_PRV: "true" }, "");
  check("PDR پورت ۲۵ حذف", t2.every((t) => t.port !== 25));
  check("isAllowedTarget پورت ۰", isAllowedTarget("1.2.3.4", 0, {}, "") === false);
  check("isAllowedTarget پورت ۲۵", isAllowedTarget("1.2.3.4", 25, {}, "") === false);
  check("isAllowedTarget لوپ‌بک", isAllowedTarget("127.0.0.1", 80, {}, "") === false);
  check("parseProxyTarget [v6]:port", JSON.stringify(parseProxyTarget("[2001:db8::1]:8443", 80)) === JSON.stringify({ hostname: "2001:db8::1", port: 8443 }));

  console.log("\n== 9) DoH fallback (buildResolverList + DnsChannel) ==");
  // buildResolverList: اول DOH_URL، بعد DOH_FBK_URL، بعد built-in — بدون تکرار
  const rl1 = buildResolverList({ DOH_URL: "https://cloudflare-dns.com/dns-query", DOH_FBK_URL: "https://dns.google/dns-query" });
  check("فهرست: primary + fallback دلخواه + بدون تکرار", rl1.length === 9 && rl1[0] === "https://cloudflare-dns.com/dns-query" && rl1[1] === "https://dns.google/dns-query" && rl1.length === new Set(rl1).size, JSON.stringify(rl1));
  const rl2 = buildResolverList({});
  check("بدون env → پیش‌فرض + fallback ها", rl2.length === 9 && rl2[0] === "https://cloudflare-dns.com/dns-query", JSON.stringify(rl2));
  const rl3 = buildResolverList({ DOH_FBK_URL: "https://one.one.one.one/dns-query" });
  check("fallback دلخواه → ۹ گزینه بدون تکرار", rl3.length === 9 && rl3[1] === "https://one.one.one.one/dns-query" && rl3.length === new Set(rl3).size, JSON.stringify(rl3));
  const rl4 = buildResolverList({ DOH_URL: "https://dns.google/dns-query" });
  check("DOH_URL تکراری → بدون تکرار", rl4.length === 8, JSON.stringify(rl4));

  // DnsChannel: fetch اول fail → باید به دومی برود و پاسخ بدهد
  const realFetch2 = globalThis.fetch;
  const dnsPacket = new Uint8Array([0, 12, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const sent2 = [];
  const ws2 = {
    readyState: 1,
    send: (data) => { sent2.push(data); },
  };
  let fetchCalls = 0;
  globalThis.fetch = async (url) => {
    fetchCalls++;
    if (fetchCalls === 1) throw new Error("first resolver down");
    return { ok: true, arrayBuffer: async () => new Uint8Array([0x81, 0x80, 0, 1, 0, 1, 0, 0, 0, 0]).buffer };
  };
  try {
    const dc = new DnsChannel(ws2, new Uint8Array([0, 0]), ["https://resolver-a.example/dns-query", "https://resolver-b.example/dns-query"], 8000);
    await dc.write(dnsPacket);
    check("fallback: اولی fail → دومی جواب می‌دهد", fetchCalls === 2 && sent2.length === 1 && sent2[0].byteLength > 0, `calls=${fetchCalls}`);
  } finally {
    globalThis.fetch = realFetch2;
  }

  // DnsChannel: همه fail → خطا
  const ws3 = { readyState: 1, send: () => {} };
  let fetchCalls3 = 0;
  globalThis.fetch = async () => { fetchCalls3++; throw new Error("down"); };
  try {
    const dc3 = new DnsChannel(ws3, new Uint8Array([0, 0]), ["https://a.example/q", "https://b.example/q"], 8000);
    let threw = false;
    try { await dc3.write(dnsPacket); } catch { threw = true; }
    check("همهٔ resolver ها fail → خطا (و fallback امتحان شده)", threw === true && fetchCalls3 === 2, `calls=${fetchCalls3}`);
  } finally {
    globalThis.fetch = realFetch2;
  }

  console.log(`\n══════════════════════════════════`);
  console.log(`نتیجه: ${pass} پاس / ${fail} خطا`);
  console.log(`══════════════════════════════════`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
