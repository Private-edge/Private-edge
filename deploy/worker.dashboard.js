// src/index.js
import { connect as openTcpSocket } from "cloudflare:sockets";
var encoder = new TextEncoder(), decoder = new TextDecoder("utf-8", { fatal: !0 }), DEFAULT_DOH = "https://cloudflare-dns.com/dns-query", MAX_HEADER_BYTES = 1024, MAX_DNS_PACKET_BYTES = 16384, MAX_DNS_QUERIES = 1e3, MAX_WS_CHUNK = 1048576, MAX_PROXY_TARGETS = 8, DNS_TIMEOUT_MS = 8e3, ECH_TIMEOUT_MS = 6e3, uuidCache = /* @__PURE__ */ new Map(), activeTunnels = 0, HTML_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
}, index_default = {
  async fetch(request, env) {
    try {
      return await route(request, env);
    } catch (err) {
      try {
        logDebug(env, err);
      } catch {
      }
      try {
        return notFound();
      } catch {
        return new Response(`Not Found
`, { status: 404 });
      }
    }
  }
};
async function route(request, env) {
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return notFound();
  }
  if ((request.headers.get("Upgrade") || "").toLowerCase() === "websocket") {
    try {
      let wsPath = effectiveWsPath(env);
      if (url.pathname === wsPath)
        return validateRuntime(env), acceptTunnelSocket(request, env, url);
    } catch (err) {
      logDebug(env, err);
    }
    return notFound();
  }
  if (request.method === "GET")
    try {
      let subPath = effectiveSubPath(env);
      if (url.pathname === subPath && (!env.SUB_TKN || isAuthorized(request, env.SUB_TKN, url)))
        return validateRuntime(env), await handleConfigEndpoint(request, env, url);
    } catch (err) {
      logDebug(env, err);
    }
  if ((request.method === "GET" || request.method === "HEAD") && shouldShowLanding(request, env, url.pathname))
    try {
      return landingResponse(request, env);
    } catch (err) {
      logDebug(env, err);
    }
  return notFound();
}
function validateRuntime(env) {
  uuidToBytes(env.IDUS || ""), effectiveWsPath(env), effectiveSubPath(env);
  let blockPrivate = (envStr(env.BLK_PRV) || "true").toLowerCase();
  if (blockPrivate !== "true" && blockPrivate !== "false")
    throw new Error("Invalid protection mode");
  let proxyMode = (envStr(env.PRX_MOD) || "fallback").toLowerCase();
  if (!["always", "off", "fallback"].includes(proxyMode))
    throw new Error("Invalid relay mode");
  let doh = new URL(envStr(env.DOH_URL) || DEFAULT_DOH);
  if (doh.protocol !== "https:") throw new Error("Invalid resolver");
  if (isPrivateHostname(doh.hostname)) throw new Error("Invalid resolver host");
  let dohFbk = envStr(env.DOH_FBK_URL);
  if (dohFbk) {
    let fbk = new URL(dohFbk);
    if (fbk.protocol !== "https:") throw new Error("Invalid fallback resolver");
    if (isPrivateHostname(fbk.hostname))
      throw new Error("Invalid fallback resolver host");
  }
  let dohJson = new URL(envStr(env.DOH_JSON_URL) || DEFAULT_DOH);
  if (dohJson.protocol !== "https:") throw new Error("Invalid resolver");
  if (isPrivateHostname(dohJson.hostname))
    throw new Error("Invalid resolver host");
  if (env.ECH_CFG && !isValidEchConfig(env.ECH_CFG))
    throw new Error("Invalid extension config");
}
var FALLBACK_RESOLVERS = [
  "https://1.1.1.1/dns-query",
  "https://8.8.8.8/dns-query",
  "https://9.9.9.9/dns-query",
  "https://one.one.one.one/dns-query",
  "https://dns.quad9.net/dns-query",
  "https://doh.pub/dns-query",
  "https://doh.alidns.com/dns-query",
  "https://dns.google/dns-query"
], resolverScore = /* @__PURE__ */ new Map();
function buildResolverList(env) {
  let list = [], pushIfNew = (value) => {
    let url = envStr(value);
    url && !list.includes(url) && list.push(url);
  };
  pushIfNew(env.DOH_URL || DEFAULT_DOH), pushIfNew(env.DOH_FBK_URL);
  for (let fallback of FALLBACK_RESOLVERS) pushIfNew(fallback);
  let best = null, bestScore = 0;
  for (let [url, score] of resolverScore)
    score > bestScore && (best = url, bestScore = score);
  return best && list.includes(best) && (list.splice(list.indexOf(best), 1), list.unshift(best)), list.length ? list : [DEFAULT_DOH];
}
function noteResolverSuccess(url) {
  try {
    if (resolverScore.set(url, (resolverScore.get(url) || 0) + 1), resolverScore.size > 16) {
      let sorted = [...resolverScore.entries()].sort((a, b) => a[1] - b[1]);
      for (let i = 0; i < sorted.length - 8; i++) resolverScore.delete(sorted[i][0]);
    }
  } catch {
  }
}
async function handleConfigEndpoint(request, env, url) {
  let format = envStr(url.searchParams.get("format"), "sub").toLowerCase(), noTls = format === "notls" || envStr(url.searchParams.get("security"), "").toLowerCase() === "none" || envStr(url.searchParams.get("notls"), "") === "1", configName = effectiveConfigName(env), baseHeaders = {
    "Cache-Control": "no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Profile-Title": "base64:" + base64Encode(configName)
  };
  if (format === "ech")
    return jsonResponse(await lookupEch(env, url), baseHeaders);
  let uri = createClientUri(url, env, noTls);
  if (format === "uri" || format === "notls" || format === "link")
    return textResponse(uri + `
`, baseHeaders);
  if (format === "core" || format === "json" || format === "legacy" || format === "modern" || format === "core-modern") {
    let modern = format === "modern" || format === "core-modern" || envStr(url.searchParams.get("modern"), "") === "1";
    return jsonResponse(createCoreConfig(url, env, !modern, noTls), baseHeaders);
  }
  return format === "sb" || format === "sing" || format === "singbox" || format === "sing-box" ? jsonResponse(createSbConfig(url, env, noTls), baseHeaders) : format === "sub" ? textResponse(base64Encode(uri + `
`), baseHeaders) : notFound();
}
function acceptTunnelSocket(request, env, url) {
  let subprotocol = (request.headers.get("Sec-WebSocket-Protocol") || "").split(",", 1)[0].trim(), earlyData = decodeEarlyData(subprotocol, 8192), maxTunnels = clampNumber(env.MAX_TUN, 1, 256, 16);
  if (activeTunnels >= maxTunnels)
    return notFound();
  let released = !1, release = () => {
    released || (released = !0, activeTunnels = Math.max(0, activeTunnels - 1));
  };
  activeTunnels++;
  try {
    let pair = new WebSocketPair(), [client, server] = Object.values(pair);
    server.accept(), server.binaryType = "arraybuffer";
    let session = new EdgeSession(server, env, url.hostname), enqueue = makeEnqueue(session, isDebugEnabled(env));
    server.addEventListener("message", (event) => {
      try {
        enqueue(event.data);
      } catch {
      }
    }), server.addEventListener("close", () => {
      release();
      try {
        session.shutdown();
      } catch {
      }
    }), server.addEventListener("error", () => {
      release();
      try {
        session.shutdown();
      } catch {
      }
    });
    let responseInit = {
      status: 101,
      webSocket: client
    };
    subprotocol && (responseInit.headers = {
      "Sec-WebSocket-Protocol": subprotocol
    });
    let response;
    try {
      response = new Response(null, responseInit);
    } catch (err) {
      release();
      try {
        session.shutdown(), safeClose(server, 1011, "upgrade failed");
      } catch {
      }
      throw err;
    }
    return earlyData && earlyData.byteLength > 0 && enqueue(earlyData), response;
  } catch (err) {
    throw release(), err;
  }
}
function makeEnqueue(session, debug) {
  let chain = Promise.resolve();
  return (data) => {
    chain = chain.then(() => session.push(data)).catch((err) => {
      try {
        debug && console.error("session error", err);
      } catch {
      }
      try {
        let reason = debug ? asciiReason(err?.message || "session error") : "upstream error";
        session.abort(1011, reason);
      } catch {
      }
    });
  };
}
var EdgeSession = class {
  constructor(webSocket, env, requestHost) {
    this.webSocket = webSocket, this.env = env, this.requestHost = requestHost, this.headerBuffer = new Uint8Array(0), this.mode = "header", this.relay = null;
  }
  async push(data) {
    if (this.webSocket.readyState !== 1) return;
    let chunk = await asUint8Array(data);
    if (chunk.byteLength) {
      if (this.mode === "header") {
        this.headerBuffer = this.headerBuffer.byteLength ? concatBytes(this.headerBuffer, chunk) : chunk;
        let parsed = parseTunnelHeader(this.headerBuffer, this.env.IDUS);
        if (!parsed) {
          if (this.headerBuffer.byteLength > MAX_HEADER_BYTES)
            throw new Error("Incomplete header");
          return;
        }
        if (isForbiddenDestination(parsed.address, this.env, this.requestHost))
          throw new Error("Destination denied");
        if (parsed.port === 25 || parsed.port < 1 || parsed.port > 65535)
          throw new Error("Port denied");
        let payload = this.headerBuffer.subarray(parsed.payloadOffset);
        this.headerBuffer = new Uint8Array(0);
        let responseHeader = Uint8Array.of(parsed.version, 0);
        if (parsed.command === 1) {
          this.mode = "tcp", this.relay = new TcpChannel(
            this.webSocket,
            responseHeader,
            parsed.address,
            parsed.port,
            this.env,
            this.requestHost
          ), await this.relay.start(payload);
          return;
        }
        if (parsed.command === 2 && parsed.port === 53) {
          this.mode = "dns", this.relay = new DnsChannel(
            this.webSocket,
            responseHeader,
            buildResolverList(this.env),
            clampNumber(this.env.DNS_TMO_MS, 1e3, 3e4, DNS_TIMEOUT_MS)
          ), await this.relay.write(payload);
          return;
        }
        throw new Error("Unsupported request");
      }
      if (!this.relay) throw new Error("Relay missing");
      await this.relay.write(chunk);
    }
  }
  abort(code, reason) {
    try {
      this.shutdown();
    } catch {
    }
    safeClose(this.webSocket, code, reason);
  }
  shutdown() {
    if (this.relay)
      try {
        this.relay.close();
      } catch {
      }
  }
}, DnsChannel = class {
  constructor(webSocket, responseHeader, resolverUrls, timeoutMs) {
    this.webSocket = webSocket, this.responseHeader = responseHeader, this.resolverUrls = resolverUrls, this.timeoutMs = timeoutMs, this.buffer = new Uint8Array(0), this.headerSent = !1, this.closed = !1, this.queryCount = 0, this.controller = null;
  }
  async write(chunk) {
    if (!this.closed)
      for (this.buffer = concatBytes(this.buffer, chunk); this.buffer.byteLength >= 2; ) {
        let packetLength = this.buffer[0] << 8 | this.buffer[1];
        if (packetLength < 12 || packetLength > MAX_DNS_PACKET_BYTES)
          throw new Error("Invalid packet");
        if (this.buffer.byteLength < packetLength + 2) return;
        let packet = this.buffer.slice(2, packetLength + 2);
        if (this.buffer = this.buffer.slice(packetLength + 2), ++this.queryCount > MAX_DNS_QUERIES)
          throw new Error("Query limit exceeded");
        let answer = null, lastError = null;
        for (let resolverUrl of this.resolverUrls) {
          if (this.closed) return;
          let controller = new AbortController();
          this.controller = controller;
          let timer = setTimeout(() => controller.abort(), this.timeoutMs);
          try {
            let response = await fetch(resolverUrl, {
              method: "POST",
              headers: {
                Accept: "application/dns-message",
                "Content-Type": "application/dns-message"
              },
              body: packet,
              redirect: "error",
              signal: controller.signal
            });
            if (!response.ok) {
              lastError = new Error("Resolver request failed");
              continue;
            }
            let bytes = new Uint8Array(await response.arrayBuffer());
            if (!bytes.byteLength || bytes.byteLength > 65535) {
              lastError = new Error("Invalid resolver answer");
              continue;
            }
            answer = bytes, noteResolverSuccess(resolverUrl);
            break;
          } catch (err) {
            lastError = err instanceof Error ? err : new Error("Resolver error");
          } finally {
            clearTimeout(timer), this.controller = null;
          }
        }
        if (answer === null)
          throw lastError || new Error("Resolver request failed");
        if (this.closed) return;
        let lengthPrefix = Uint8Array.of(
          answer.byteLength >> 8,
          answer.byteLength & 255
        ), outgoing = this.headerSent ? concatBytes(lengthPrefix, answer) : concatBytes(this.responseHeader, lengthPrefix, answer);
        if (this.headerSent = !0, !safeSend(this.webSocket, outgoing))
          throw new Error("Connection closed");
      }
  }
  close() {
    this.closed = !0;
    try {
      this.controller && this.controller.abort();
    } catch {
    }
    this.buffer = new Uint8Array(0);
  }
}, TcpChannel = class {
  constructor(webSocket, responseHeader, address, port, env, requestHost) {
    this.webSocket = webSocket, this.responseHeader = responseHeader, this.targets = buildTargets(address, port, env, requestHost), this.connectTimeout = clampNumber(env.CON_TMO_MS, 1e3, 3e4, 8e3), this.maxReplayBytes = clampNumber(env.MAX_RPL_BYT, 16384, 1048576, 262144), this.targetIndex = -1, this.socket = null, this.writer = null, this.generation = 0, this.switching = null, this.gotRemoteData = !1, this.headerSent = !1, this.closed = !1, this.retryAllowed = !0, this.replay = [], this.replayBytes = 0, this.sequence = 0, this.sentSequence = 0;
  }
  async start(initialPayload) {
    let seq = this.remember(initialPayload);
    await this.beginSwitch(), !this.closed && initialPayload.byteLength && seq === null && this.writer && await this.writer.write(initialPayload);
  }
  async write(chunk) {
    if (this.closed) return;
    let seq = this.gotRemoteData ? null : this.remember(chunk), pendingSwitch = this.switching;
    if (pendingSwitch && await pendingSwitch, this.closed || seq !== null && seq <= this.sentSequence) return;
    let writer = this.writer, generation = this.generation;
    if (!writer) throw new Error("No writer");
    try {
      await writer.write(chunk), seq !== null && (this.sentSequence = Math.max(this.sentSequence, seq));
    } catch {
      if (this.closed) return;
      if (this.webSocket.readyState !== 1) {
        this.close();
        return;
      }
      if (this.gotRemoteData || !this.retryAllowed) {
        this.close(), safeClose(this.webSocket, 1e3, "done");
        return;
      }
      await this.scheduleNext(generation);
    }
  }
  remember(chunk) {
    if (!chunk.byteLength) return this.sequence;
    if (!this.retryAllowed || this.replayBytes + chunk.byteLength > this.maxReplayBytes)
      return this.retryAllowed = !1, null;
    let seq = ++this.sequence;
    return this.replay.push({ seq, data: chunk }), this.replayBytes += chunk.byteLength, seq;
  }
  beginSwitch() {
    return this.switching ? this.switching : (this.switching = this.activateNextTarget().finally(() => {
      this.switching = null;
    }), this.switching);
  }
  async activateNextTarget() {
    for (this.disposeActiveSocket(); ++this.targetIndex < this.targets.length; ) {
      if (this.closed) return;
      let target = this.targets[this.targetIndex], socket;
      try {
        if (socket = openTcpSocket(
          { hostname: target.hostname, port: target.port },
          { allowHalfOpen: !0, secureTransport: "off" }
        ), observeSocket(socket), await withTimeout(
          socket.opened,
          this.connectTimeout,
          () => closeSocketQuietly(socket)
        ), this.closed) {
          await closeSocketAndWait(socket);
          return;
        }
        let writer = socket.writable.getWriter(), generation = ++this.generation;
        this.socket = socket, this.writer = writer;
        let snapshot = this.replay.slice();
        if (snapshot.length && (await writer.write(
          concatByteList(snapshot.map((entry) => entry.data))
        ), this.sentSequence = snapshot[snapshot.length - 1].seq), this.closed) {
          this.disposeActiveSocket();
          return;
        }
        this.pumpRemote(socket, generation).catch(() => {
          try {
            !this.closed && generation === this.generation && (this.close(), safeClose(this.webSocket, 1011, "read failed"));
          } catch {
          }
        });
        return;
      } catch {
        socket && await closeSocketAndWait(socket), this.socket = null, this.writer = null;
      }
    }
    throw this.closed = !0, safeClose(this.webSocket, 1011, "unavailable"), new Error("No upstream available");
  }
  async scheduleNext(generation) {
    if (!(this.closed || generation !== this.generation)) {
      if (this.gotRemoteData || !this.retryAllowed)
        throw this.close(), safeClose(this.webSocket, 1011, "closed"), new Error("Upstream closed");
      await this.beginSwitch();
    }
  }
  async pumpRemote(socket, generation) {
    let reader = socket.readable.getReader();
    try {
      for (; !this.closed; ) {
        let { value, done } = await reader.read();
        if (done) break;
        if (generation !== this.generation) return;
        let chunk = value instanceof Uint8Array ? value : new Uint8Array(value);
        if (!chunk.byteLength) continue;
        this.gotRemoteData = !0, this.replay = [], this.replayBytes = 0;
        let outgoing = this.headerSent ? chunk : concatBytes(this.responseHeader, chunk);
        if (this.headerSent = !0, !safeSend(this.webSocket, outgoing))
          throw new Error("Connection closed");
      }
    } catch {
      this.webSocket.readyState !== 1 && (this.closed = !0);
    } finally {
      try {
        reader.releaseLock();
      } catch {
      }
    }
    if (!(this.closed || generation !== this.generation)) {
      if (this.gotRemoteData) {
        this.close(), safeClose(this.webSocket, 1e3, "done");
        return;
      }
      try {
        await this.scheduleNext(generation);
      } catch {
      }
    }
  }
  disposeActiveSocket() {
    let writer = this.writer, socket = this.socket;
    this.writer = null, this.socket = null, writer && abortWriterQuietly(writer), socket && closeSocketQuietly(socket);
  }
  close() {
    this.closed || (this.closed = !0, this.generation++, this.disposeActiveSocket(), this.replay = [], this.replayBytes = 0);
  }
};
function parseTunnelHeader(data, configuredUuid) {
  if (data.byteLength < 18) return null;
  let version = data[0];
  if (version !== 0) throw new Error("Unsupported tunnel version");
  let expectedUuid = uuidToBytes(configuredUuid);
  if (!constantBytesEqual(data.subarray(1, 17), expectedUuid))
    throw new Error("Authentication failed");
  let offset = 18 + data[17];
  if (data.byteLength < offset + 4) return null;
  let command = data[offset++], port = data[offset] << 8 | data[offset + 1];
  offset += 2;
  let addressType = data[offset++], address;
  if (addressType === 1) {
    if (data.byteLength < offset + 4) return null;
    address = Array.from(data.subarray(offset, offset + 4)).join("."), offset += 4;
  } else if (addressType === 2) {
    if (data.byteLength < offset + 1) return null;
    let length = data[offset++];
    if (!length || data.byteLength < offset + length) return null;
    address = decoder.decode(data.subarray(offset, offset + length)), offset += length;
  } else if (addressType === 3) {
    if (data.byteLength < offset + 16) return null;
    let groups = [];
    for (let i = 0; i < 16; i += 2)
      groups.push((data[offset + i] << 8 | data[offset + i + 1]).toString(16));
    address = groups.join(":"), offset += 16;
  } else
    throw new Error("Unsupported address type");
  return { version, command, port, address, payloadOffset: offset };
}
function buildTargets(address, port, env, requestHost) {
  let mode = envStr(env.PRX_MOD, "fallback").toLowerCase(), proxies = String(env.PDR || "").split(",").map((value) => value.trim()).filter(Boolean).slice(0, MAX_PROXY_TARGETS).map((value) => {
    try {
      return parseProxyTarget(value, port);
    } catch {
      return null;
    }
  }).filter(
    (target) => target && isAllowedTarget(target.hostname, target.port, env, requestHost)
  ), targets;
  if (mode === "always") {
    if (!proxies.length) throw new Error("Relay mode requires targets");
    targets = proxies;
  } else mode === "off" ? targets = [{ hostname: address, port }] : targets = [{ hostname: address, port }, ...proxies];
  let seen = /* @__PURE__ */ new Set();
  return targets.filter((target) => {
    if (!isAllowedTarget(target.hostname, target.port, env, requestHost))
      return !1;
    let key = target.hostname.toLowerCase() + "|" + target.port;
    return seen.has(key) ? !1 : (seen.add(key), !0);
  });
}
function isAllowedTarget(hostname, port, env, requestHost) {
  return !Number.isInteger(port) || port < 1 || port > 65535 || port === 25 ? !1 : !isForbiddenDestination(hostname, env, requestHost);
}
function parseProxyTarget(value, defaultPort) {
  let hostname = value, port = defaultPort;
  if (value.startsWith("[")) {
    let end = value.indexOf("]");
    if (end < 0) throw new Error("Invalid target");
    hostname = value.slice(1, end), value[end + 1] === ":" && (port = Number(value.slice(end + 2)));
  } else if ((value.match(/:/g) || []).length === 1) {
    let split = value.lastIndexOf(":"), possiblePort = Number(value.slice(split + 1));
    if (!Number.isInteger(possiblePort) || possiblePort < 1 || possiblePort > 65535)
      throw new Error("Invalid target");
    hostname = value.slice(0, split), port = possiblePort;
  }
  if (!hostname || !Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("Invalid target");
  return { hostname, port };
}
function createClientUri(url, env, noTls) {
  let publicHost = envStr(env.PUB_HST) || url.hostname, port = clampNumber(env.PUB_PRT, 1, 65535, noTls ? 80 : 443), hostHeader = envStr(env.HST_HDR) || publicHost, path = socketPathWithEarlyData(env), name = effectiveConfigName(env), params = new URLSearchParams({
    encryption: "none",
    security: noTls ? "none" : "tls",
    type: "ws",
    host: hostHeader,
    path
  });
  return noTls || (params.set("sni", envStr(env.SNI) || publicHost), params.set("fp", envStr(env.FPR, "chrome"))), "vless://" + env.IDUS + "@" + formatUriHost(publicHost) + ":" + port + "?" + params.toString() + "#" + encodeURIComponent(name);
}
function createCoreConfig(url, env, legacy, noTls) {
  let publicHost = envStr(env.PUB_HST) || url.hostname, port = clampNumber(env.PUB_PRT, 1, 65535, noTls ? 80 : 443), hostHeader = envStr(env.HST_HDR) || publicHost, configName = effectiveConfigName(env), wsSettings = {
    path: socketPathWithEarlyData(env),
    host: hostHeader
  }, settings = legacy ? {
    vnext: [
      {
        address: publicHost,
        port,
        users: [{ id: env.IDUS, encryption: "none" }]
      }
    ]
  } : {
    address: publicHost,
    port,
    id: env.IDUS,
    encryption: "none"
  }, streamSettings;
  if (noTls)
    streamSettings = legacy ? { network: "ws", security: "none", wsSettings } : { method: "websocket", security: "none", wsSettings };
  else {
    let sni = envStr(env.SNI) || publicHost, tlsSettings = {
      serverName: sni,
      allowInsecure: !1,
      fingerprint: envStr(env.FPR, "chrome"),
      alpn: ["http/1.1"]
    }, ech = echValue(env, sni);
    ech && (tlsSettings.echConfigList = ech), streamSettings = legacy ? { network: "ws", security: "tls", tlsSettings, wsSettings } : { method: "websocket", security: "tls", tlsSettings, wsSettings };
  }
  return {
    log: { loglevel: "warning" },
    dns: {
      queryStrategy: "UseIP",
      servers: [envStr(env.DOH_URL, DEFAULT_DOH)]
    },
    inbounds: [
      {
        tag: "socks-in",
        listen: "127.0.0.1",
        port: clampNumber(env.LOC_SCK_PRT, 1, 65535, 10808),
        protocol: "socks",
        settings: { udp: !1 },
        sniffing: { enabled: !0, destOverride: ["http", "tls"] }
      }
    ],
    outbounds: [
      { tag: configName, protocol: "vless", settings, streamSettings },
      { tag: "direct", protocol: "freedom" },
      { tag: "block", protocol: "blackhole" }
    ],
    routing: {
      domainStrategy: "IPIfNonMatch",
      rules: [
        { type: "field", ip: ["geoip:private"], outboundTag: "block" },
        { type: "field", protocol: ["bittorrent"], outboundTag: "block" }
      ]
    }
  };
}
function createSbConfig(url, env, noTls) {
  let publicHost = envStr(env.PUB_HST) || url.hostname, port = clampNumber(env.PUB_PRT, 1, 65535, noTls ? 80 : 443), hostHeader = envStr(env.HST_HDR) || publicHost, configName = effectiveConfigName(env), earlyData = clampNumber(env.ERL_DAT, 0, 8192, 2560), transport = {
    type: "ws",
    path: effectiveWsPath(env),
    headers: { Host: hostHeader }
  };
  earlyData > 0 && (transport.max_early_data = earlyData, transport.early_data_header_name = "Sec-WebSocket-Protocol");
  let tls;
  if (noTls)
    tls = { enabled: !1 };
  else {
    let sni = envStr(env.SNI) || publicHost;
    tls = {
      enabled: !0,
      server_name: sni,
      insecure: !1,
      alpn: ["http/1.1"],
      utls: {
        enabled: !0,
        fingerprint: envStr(env.FPR, "chrome")
      }
    }, envStr(env.ECH_MOD, "off").toLowerCase() !== "off" && (tls.ech = env.ECH_CFG ? { enabled: !0, config: [env.ECH_CFG] } : { enabled: !0, query_server_name: envStr(env.ECH_LKP_HST) || sni });
  }
  return {
    log: { level: "warn", timestamp: !0 },
    dns: {
      servers: [
        {
          type: "https",
          tag: "cloudflare-doh",
          server: "1.1.1.1",
          server_port: 443,
          path: "/dns-query",
          tls: { enabled: !0, server_name: "cloudflare-dns.com" }
        }
      ],
      strategy: "prefer_ipv4"
    },
    inbounds: [
      {
        type: "mixed",
        tag: "mixed-in",
        listen: "127.0.0.1",
        listen_port: clampNumber(env.LOC_MIX_PRT, 1, 65535, 2080)
      }
    ],
    outbounds: [
      {
        type: "vless",
        tag: configName,
        server: publicHost,
        server_port: port,
        uuid: env.IDUS,
        network: "tcp",
        tls,
        transport
      },
      { type: "direct", tag: "direct" },
      { type: "block", tag: "block" }
    ],
    route: {
      rules: [{ network: "udp", action: "reject" }],
      final: configName,
      auto_detect_interface: !0
    }
  };
}
function effectiveConfigName(env) {
  return envStr(env.CFG_NAM, "private-edge").replace(/[^\w.-]+/g, "-").slice(0, 64) || "private-edge";
}
function socketPathWithEarlyData(env) {
  let path = effectiveWsPath(env), earlyData = clampNumber(env.ERL_DAT, 0, 8192, 2560);
  return earlyData > 0 ? path + "?ed=" + earlyData : path;
}
function echValue(env, sni) {
  if (envStr(env.ECH_MOD, "off").toLowerCase() === "off") return "";
  if (env.ECH_CFG) return env.ECH_CFG;
  let doh = envStr(env.ECH_DOH_URL, envStr(env.DOH_URL, DEFAULT_DOH));
  return (envStr(env.ECH_LKP_HST) || sni) + "+" + doh;
}
async function lookupEch(env, url) {
  let publicHost = envStr(env.PUB_HST) || url.hostname, lookupHost = envStr(env.ECH_LKP_HST) || envStr(env.SNI) || publicHost;
  if (env.ECH_CFG)
    return {
      host: lookupHost,
      mode: "fixed",
      published: null,
      echConfigList: [env.ECH_CFG],
      value: env.ECH_CFG
    };
  let endpoint = new URL(envStr(env.DOH_JSON_URL, DEFAULT_DOH));
  endpoint.searchParams.set("name", lookupHost), endpoint.searchParams.set("type", "HTTPS");
  let response = await fetchWithTimeout(
    endpoint,
    { headers: { Accept: "application/dns-json" } },
    ECH_TIMEOUT_MS
  );
  if (!response.ok) throw new Error("Lookup failed");
  let json = await response.json(), answers = Array.isArray(json.Answer) ? json.Answer.filter((answer) => answer.type === 65) : [], configs = [];
  for (let answer of answers) {
    let match = String(answer.data || "").match(
      /\bech=(?:"([^"]+)"|([^\s]+))/i
    ), config = match && (match[1] || match[2]);
    config && configs.push(config);
  }
  return {
    host: lookupHost,
    mode: "dns",
    published: configs.length > 0,
    echConfigList: configs,
    value: echValue(env, lookupHost),
    answers
  };
}
async function fetchWithTimeout(url, init, milliseconds) {
  let controller = new AbortController(), timer = setTimeout(() => controller.abort(), milliseconds);
  try {
    let finalInit = { ...init, signal: controller.signal };
    return "redirect" in finalInit || (finalInit.redirect = "error"), await fetch(url, finalInit);
  } finally {
    clearTimeout(timer);
  }
}
function isAuthorized(request, expectedToken, url) {
  if (!expectedToken) return !1;
  let queryToken = String(url.searchParams.get("token") || "");
  if (queryToken.length > 1024) return !1;
  let authorization = request.headers.get("Authorization") || "";
  if (authorization.length > 2048) return !1;
  let bearerToken = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "";
  return constantStringEqual(queryToken, expectedToken) || constantStringEqual(bearerToken, expectedToken);
}
function isForbiddenDestination(address, env, requestHost = "") {
  let host = normalizeHostname(address), publicHost = normalizeHostname(env.PUB_HST || requestHost);
  return publicHost && host === publicHost ? !0 : envStr(env.BLK_PRV, "true").toLowerCase() === "false" ? !1 : isPrivateHostname(host);
}
function normalizeHostname(value) {
  return String(value || "").toLowerCase().trim().replace(/^\[|\]$/g, "").replace(/\.$/, "");
}
function isPrivateHostname(host) {
  let value = normalizeHostname(host);
  if (!value) return !1;
  if (value === "localhost" || value.endsWith(".localhost") || value.endsWith(".local") || value.endsWith(".internal") || value.endsWith(".home.arpa") || value === "metadata.google.internal" || value === "metadata.google")
    return !0;
  let ipv4 = parseIpv4(value);
  if (ipv4) return isPrivateIpv4(ipv4);
  if (value.includes(":")) {
    let ipv6 = parseIpv6(value);
    if (ipv6) return isPrivateIpv6(ipv6);
  }
  return !1;
}
function isPrivateIpv4([a, b]) {
  return a === 0 || a === 10 || a === 127 || a === 100 && b >= 64 && b <= 127 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && (b === 0 || b === 168) || a === 198 && (b === 18 || b === 19) || a >= 224;
}
function isPrivateIpv6(groups) {
  return groups.every((group) => group === 0) || groups[0] === 0 && groups[1] === 0 && groups[2] === 0 && groups[3] === 0 && groups[4] === 0 && groups[5] === 0 && groups[6] === 0 && groups[7] === 1 || (groups[0] & 65024) === 64512 || (groups[0] & 65472) === 65152 || (groups[0] & 65280) === 65280 ? !0 : groups[0] === 0 && groups[1] === 0 && groups[2] === 0 && groups[3] === 0 && groups[4] === 0 && groups[5] === 65535 ? isPrivateIpv4([
    groups[6] >>> 8 & 255,
    groups[6] & 255,
    groups[7] >>> 8 & 255,
    groups[7] & 255
  ]) : groups[0] === 0 && groups[1] === 0 && groups[2] === 0 && groups[3] === 0 && groups[4] === 0 && groups[5] === 0 ? isPrivateIpv4([
    groups[6] >>> 8 & 255,
    groups[6] & 255,
    groups[7] >>> 8 & 255,
    groups[7] & 255
  ]) : !1;
}
function parseIpv4(value) {
  let raw = String(value || "").trim();
  if (!raw || /[\s/]/.test(raw)) return null;
  let parsePart = (part) => /^0x[0-9a-f]+$/i.test(part) ? Number.parseInt(part.slice(2), 16) : /^0[0-7]+$/.test(part) && part.length > 1 ? Number.parseInt(part.slice(1), 8) : /^\d+$/.test(part) ? Number(part) : NaN, parts = raw.split(".");
  if (parts.length === 1) {
    let number = parsePart(raw);
    return !Number.isInteger(number) || number < 0 || number > 4294967295 ? null : [
      number >>> 24 & 255,
      number >>> 16 & 255,
      number >>> 8 & 255,
      number & 255
    ];
  }
  if (parts.length < 2 || parts.length > 4) return null;
  let numbers = parts.map(parsePart);
  for (let i = 0; i < numbers.length - 1; i++)
    if (!Number.isInteger(numbers[i]) || numbers[i] < 0 || numbers[i] > 255)
      return null;
  let last = numbers[numbers.length - 1], trailing = 4 - (numbers.length - 1);
  if (!Number.isInteger(last) || last < 0 || last >= Math.pow(2, 8 * trailing))
    return null;
  let output = numbers.slice(0, -1);
  for (let i = trailing - 1; i >= 0; i--)
    output.push(last >>> 8 * i & 255);
  return output;
}
function parseIpv6(value) {
  let raw = String(value || "").trim().toLowerCase();
  if (!raw || raw.includes(" ") || raw.includes("%")) return null;
  if (raw.includes(".")) {
    let lastColon = raw.lastIndexOf(":");
    if (lastColon < 0) return null;
    let ipv4 = parseIpv4(raw.slice(lastColon + 1));
    if (!ipv4) return null;
    let hi = (ipv4[0] << 8 | ipv4[1]).toString(16), lo = (ipv4[2] << 8 | ipv4[3]).toString(16);
    raw = raw.slice(0, lastColon) + ":" + hi + ":" + lo;
  }
  let sides = raw.split("::");
  if (sides.length > 2) return null;
  let parseGroup = (part) => /^[0-9a-f]{1,4}$/.test(part) ? Number.parseInt(part, 16) : -1;
  if (sides.length === 1) {
    if (raw.endsWith(":")) return null;
    let groups = raw.split(":").map(parseGroup);
    return groups.length !== 8 || groups.some((group) => group < 0) ? null : groups;
  }
  let head = sides[0] ? sides[0].split(":").filter(Boolean) : [], tail = sides[1] ? sides[1].split(":").filter(Boolean) : [];
  if (head.length + tail.length > 7) return null;
  let headGroups = head.map(parseGroup), tailGroups = tail.map(parseGroup);
  if (headGroups.some((group) => group < 0) || tailGroups.some((group) => group < 0))
    return null;
  let missing = 8 - head.length - tail.length;
  return missing < 1 ? null : [...headGroups, ...new Array(missing).fill(0), ...tailGroups];
}
function isValidEchConfig(value) {
  let text = String(value || "").trim();
  return text.length >= 4 && text.length <= 65536 && /^[A-Za-z0-9+/_-]+={0,2}$/.test(text);
}
function decodeEarlyData(header, maxBytes) {
  let value = String(header || "").split(",", 1)[0].trim();
  if (!value) return new Uint8Array(0);
  if (maxBytes <= 0 || value.length > 8192 || !/^[A-Za-z0-9+/_-]+={0,2}$/.test(value) || Math.floor(value.length * 3 / 4) > maxBytes) return null;
  try {
    let normalized = value.replace(/-/g, "+").replace(/_/g, "/"), padded = normalized + "=".repeat((4 - normalized.length % 4) % 4), binary = atob(padded);
    if (binary.length > maxBytes) return null;
    let output = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++)
      output[i] = binary.charCodeAt(i);
    return output;
  } catch {
    return null;
  }
}
async function asUint8Array(value) {
  if (value instanceof ArrayBuffer) {
    if (value.byteLength > MAX_WS_CHUNK) throw new Error("Message too large");
    return new Uint8Array(value);
  }
  if (ArrayBuffer.isView(value)) {
    if (value.byteLength > MAX_WS_CHUNK) throw new Error("Message too large");
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  if (value instanceof Blob) {
    if (value.size > MAX_WS_CHUNK) throw new Error("Message too large");
    return new Uint8Array(await value.arrayBuffer());
  }
  throw new Error("Binary frames required");
}
function uuidToBytes(uuid) {
  let key = String(uuid || "").trim().toLowerCase(), cached = uuidCache.get(key);
  if (cached) return cached;
  let compact = key.replace(/-/g, "");
  if (!/^[0-9a-f]{32}$/.test(compact))
    throw new Error("Invalid identity");
  let output = new Uint8Array(16);
  for (let i = 0; i < 16; i++)
    output[i] = Number.parseInt(compact.slice(i * 2, i * 2 + 2), 16);
  if (uuidCache.size >= 32) {
    let oldest = uuidCache.keys().next().value;
    oldest !== void 0 && uuidCache.delete(oldest);
  }
  return uuidCache.set(key, output), output;
}
function effectiveWsPath(env) {
  if (env.WS_PTH) return normalizePath(env.WS_PTH);
  let id = String(env.IDUS || "").trim();
  if (!id) throw new Error("Identity is required");
  return normalizePath("/" + id);
}
function effectiveSubPath(env) {
  return env.SUB_PTH ? normalizePath(env.SUB_PTH) : effectiveWsPath(env);
}
function normalizePath(value) {
  let path = String(value || "").trim().split("?", 1)[0];
  if (!path || path === "/")
    throw new Error("A non-root path is required");
  return path.startsWith("/") ? path : "/" + path;
}
function formatUriHost(host) {
  return host.includes(":") && !host.startsWith("[") ? "[" + host + "]" : host;
}
function constantBytesEqual(left, right) {
  if (left.byteLength !== right.byteLength) return !1;
  let diff = 0;
  for (let i = 0; i < left.byteLength; i++)
    diff |= left[i] ^ right[i];
  return diff === 0;
}
function constantStringEqual(left, right) {
  let a = encoder.encode(String(left)), b = encoder.encode(String(right)), length = Math.max(a.byteLength, b.byteLength), diff = a.byteLength ^ b.byteLength;
  for (let i = 0; i < length; i++)
    diff |= (a[i] || 0) ^ (b[i] || 0);
  return diff === 0;
}
function concatBytes(...arrays) {
  return concatByteList(arrays);
}
function concatByteList(arrays) {
  let length = arrays.reduce((sum, value) => sum + value.byteLength, 0), output = new Uint8Array(length), offset = 0;
  for (let value of arrays)
    output.set(value, offset), offset += value.byteLength;
  return output;
}
function base64Encode(value) {
  let bytes = encoder.encode(value), binary = "";
  for (let i = 0; i < bytes.byteLength; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
function clampNumber(value, min, max, fallback) {
  let number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? Math.trunc(number) : fallback;
}
function withTimeout(promise, milliseconds, onTimeout) {
  let timer, timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      try {
        onTimeout();
      } catch {
      }
      reject(new Error("Timeout"));
    }, milliseconds);
  });
  try {
    Promise.resolve(promise).catch(() => {
    });
  } catch {
  }
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
function observeSocket(socket) {
  try {
    let closed = socket?.closed;
    closed && typeof closed.catch == "function" && closed.catch(() => {
    });
  } catch {
  }
}
function closeSocketQuietly(socket) {
  try {
    let result = socket?.close();
    result && typeof result.catch == "function" && result.catch(() => {
    });
  } catch {
  }
}
async function closeSocketAndWait(socket) {
  try {
    await socket?.close();
  } catch {
  }
}
function abortWriterQuietly(writer) {
  try {
    let result = writer?.abort();
    result && typeof result.catch == "function" && result.catch(() => {
    });
  } catch {
  }
}
function safeSend(webSocket, data) {
  try {
    return webSocket.readyState !== 1 ? !1 : (webSocket.send(data), !0);
  } catch {
    return !1;
  }
}
function asciiReason(reason) {
  return String(reason ?? "").replace(/[^\x20-\x7E]/g, " ").slice(0, 100);
}
function safeClose(webSocket, code, reason) {
  try {
    (webSocket.readyState === 0 || webSocket.readyState === 1) && webSocket.close(code, asciiReason(reason));
  } catch {
  }
}
function isDebugEnabled(env) {
  try {
    return envStr(env.DBG, "false").toLowerCase() === "true";
  } catch {
    return !1;
  }
}
function logDebug(env, err) {
  try {
    isDebugEnabled(env) && console.error(err);
  } catch {
  }
}
function envStr(value, fallback = "") {
  return String(value ?? fallback).trim();
}
function textResponse(body, extraHeaders = {}, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      ...extraHeaders
    }
  });
}
function jsonResponse(data, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      ...extraHeaders
    }
  });
}
function notFound() {
  try {
    return textResponse(`Not Found
`, {}, 404);
  } catch {
    return new Response(`Not Found
`, { status: 404 });
  }
}
function shouldShowLanding(request, env, pathname) {
  if (request.method !== "GET" && request.method !== "HEAD") return !1;
  let mode = envStr(env.LND_MOD, "all").toLowerCase();
  return mode === "off" || mode === "404" || mode === "false" ? !1 : mode === "root" ? pathname === "/" || pathname === "/index.html" : !0;
}
function landingResponse(request, env) {
  let html = landingHtml(env);
  return new Response(request.method === "HEAD" ? null : html, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=300",
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY"
    }
  });
}
function landingHtml(env) {
  let appName = escapeHtml(env.APP_NAM || "LumaDesk"), tagline = escapeHtml(
    env.APP_TAG || "Build beautiful apps, right in your browser."
  ), description = escapeHtml(
    env.APP_DSC || "A visual app builder for modern teams \u2014 design, code, preview and ship to the edge in minutes. No installs, no servers, no limits."
  ), badge = escapeHtml(env.APP_BDG || "App Studio"), status = escapeHtml(env.APP_STS || "All systems operational"), accent = safeColor(env.APP_ACC || "#7567f8"), accent2 = safeColor(env.APP_ACC_2 || "#30b9a4");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#070b1a">
<meta name="description" content="${description}">
<title>${appName} \u2014 Build beautiful apps</title>
<style>
:root{
  --ink:#eef1ff; --muted:#98a1c6; --line:rgba(255,255,255,.10);
  --wash:#070b1a; --panel:rgba(255,255,255,.045);
  --accent:${accent}; --accent2:${accent2};
  --shadow:0 24px 80px rgba(0,0,0,.45);
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;color:var(--ink);
  font:16px/1.65 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;
  background:
    radial-gradient(1100px 560px at 12% -6%, color-mix(in srgb,var(--accent) 26%, transparent), transparent 60%),
    radial-gradient(950px 520px at 96% 6%, color-mix(in srgb,var(--accent2) 22%, transparent), transparent 55%),
    radial-gradient(1300px 800px at 50% 118%, color-mix(in srgb,var(--accent) 13%, transparent), transparent 62%),
    var(--wash);
  background-attachment:fixed;
}
a{color:inherit;text-decoration:none}
.shell{width:min(1140px,calc(100% - 40px));margin:auto}
.grad{background:linear-gradient(135deg,var(--accent),var(--accent2));
  -webkit-background-clip:text;background-clip:text;color:transparent}

/* ---------- nav ---------- */
.nav{position:sticky;top:0;z-index:50;border-bottom:1px solid var(--line);
  background:color-mix(in srgb,var(--wash) 74%, transparent);backdrop-filter:blur(14px)}
.nav .shell{height:72px;display:flex;align-items:center;justify-content:space-between}
.brand{display:flex;align-items:center;gap:12px;font-weight:800;font-size:17px;letter-spacing:-.02em}
.mark{display:grid;place-items:center;width:38px;height:38px;border-radius:12px;
  background:linear-gradient(140deg,var(--accent),var(--accent2));
  box-shadow:0 8px 26px color-mix(in srgb,var(--accent) 45%, transparent)}
.mark svg{width:20px;fill:none;stroke:#fff;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
.links{display:flex;align-items:center;gap:28px;color:var(--muted);font-size:14px}
.links a:hover{color:var(--ink)}
.pill{padding:10px 18px;border-radius:999px;font-weight:700;font-size:14px;color:#fff!important;
  background:linear-gradient(140deg,var(--accent),var(--accent2));
  box-shadow:0 10px 30px color-mix(in srgb,var(--accent) 35%, transparent)}

/* ---------- hero ---------- */
.hero{display:grid;grid-template-columns:1fr 1.06fr;gap:64px;align-items:center;padding:88px 0 96px}
.eyebrow{display:inline-flex;align-items:center;gap:9px;padding:8px 13px;border:1px solid var(--line);
  border-radius:999px;background:var(--panel);color:var(--muted);font-size:12.5px;font-weight:650}
.dot{width:8px;height:8px;border-radius:50%;background:#2fe0a0;box-shadow:0 0 0 4px rgba(47,224,160,.16);
  animation:pulse 2.2s ease-in-out infinite}
@keyframes pulse{50%{box-shadow:0 0 0 7px rgba(47,224,160,.05)}}
.hero h1{margin:22px 0 16px;font-size:clamp(40px,5.4vw,64px);line-height:1.04;letter-spacing:-.05em;font-weight:800}
.hero p{margin:0;max-width:520px;color:var(--muted);font-size:17.5px}
.actions{display:flex;gap:12px;margin-top:30px;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;gap:9px;padding:13px 22px;border-radius:13px;font-weight:700;font-size:15px}
.btn.primary{color:#fff;background:linear-gradient(135deg,var(--accent),var(--accent2));
  box-shadow:0 14px 38px color-mix(in srgb,var(--accent) 40%, transparent)}
.btn.ghost{border:1px solid var(--line);background:var(--panel);color:var(--ink)}
.btn svg{width:16px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.trust{display:flex;align-items:center;gap:16px;margin-top:42px;color:var(--muted);font-size:12.5px;flex-wrap:wrap}
.trust b{color:color-mix(in srgb,var(--ink) 82%, transparent);font-weight:700}

/* ---------- builder mockup ---------- */
.stage{position:relative}
.window{border:1px solid rgba(255,255,255,.14);border-radius:22px;background:rgba(13,17,34,.82);
  box-shadow:var(--shadow);overflow:hidden;backdrop-filter:blur(18px)}
.bar{display:flex;align-items:center;gap:7px;height:46px;padding:0 16px;border-bottom:1px solid var(--line)}
.bar i{width:9px;height:9px;border-radius:50%;background:#3a415e}
.bar i:nth-child(1){background:#ff5f57}.bar i:nth-child(2){background:#febc2e}.bar i:nth-child(3){background:#28c840}
.bar b{margin-left:10px;font-size:12px;color:var(--muted);font-weight:600}
.work{display:grid;grid-template-columns:150px 1fr 138px;min-height:392px}
.tray{padding:16px 12px;border-right:1px solid var(--line);background:rgba(255,255,255,.02)}
.tray small,.insp small{display:block;padding:0 8px 10px;color:#77809f;font-size:9.5px;font-weight:800;letter-spacing:.12em}
.chip{display:flex;align-items:center;gap:8px;margin:4px 0;padding:8px 10px;border-radius:9px;
  color:var(--muted);font-size:11.5px;border:1px solid transparent}
.chip i{width:7px;height:7px;border-radius:2.5px;background:#3c4468}
.chip.on{background:color-mix(in srgb,var(--accent) 16%, transparent);border-color:color-mix(in srgb,var(--accent) 40%, transparent);color:var(--ink);font-weight:650}
.chip.on i{background:var(--accent)}
.canvas{padding:18px;background:radial-gradient(420px 220px at 30% 0%, color-mix(in srgb,var(--accent) 9%, transparent), transparent 70%)}
.herocard{border:1px solid var(--line);border-radius:16px;padding:22px;background:linear-gradient(150deg,rgba(255,255,255,.07),rgba(255,255,255,.02))}
.tag{display:inline-block;padding:4px 10px;border-radius:999px;font-size:9.5px;font-weight:800;letter-spacing:.08em;
  color:var(--accent2);background:color-mix(in srgb,var(--accent2) 14%, transparent)}
.bigline{height:15px;border-radius:8px;background:rgba(255,255,255,.16);margin:13px 0 0;width:88%}
.bigline.w70{width:62%;height:10px;margin-top:9px;background:rgba(255,255,255,.09)}
.row{display:flex;gap:9px;margin-top:18px}
.btn2{padding:8px 15px;border-radius:9px;font-size:11px;font-weight:700}
.btn2.g{color:#fff;background:linear-gradient(135deg,var(--accent),var(--accent2))}
.btn2.o{border:1px solid var(--line);color:var(--muted)}
.cards3{display:grid;grid-template-columns:repeat(3,1fr);gap:11px;margin-top:14px}
.tcard{border:1px solid var(--line);border-radius:13px;padding:13px;background:rgba(255,255,255,.03)}
.ic{width:22px;height:22px;border-radius:7px;background:color-mix(in srgb,var(--accent) 60%, #151a33)}
.ic.ic2{background:color-mix(in srgb,var(--accent2) 55%, #151a33)}
.ic.ic3{background:#3a415e}
.l{height:7px;border-radius:5px;background:rgba(255,255,255,.13);margin-top:10px}
.l.w60{width:60%}.l.w80{width:82%}
.insp{padding:16px 12px;border-left:1px solid var(--line);background:rgba(255,255,255,.02)}
.prop{display:flex;justify-content:space-between;align-items:center;padding:7px 8px;border-radius:8px;font-size:10.5px}
.prop span{color:#77809f}
.prop b{font-weight:650;color:var(--ink)}
.swatches{display:flex;gap:7px;padding:10px 8px}
.swatches i{width:16px;height:16px;border-radius:6px}
.swatches i:nth-child(1){background:var(--accent)}
.swatches i:nth-child(2){background:var(--accent2)}
.swatches i:nth-child(3){background:#2fe0a0}
.swatches i:nth-child(4){background:#ffb454}
.slid{height:5px;border-radius:4px;background:#2a3050;margin:8px;position:relative}
.slid:after{content:"";position:absolute;inset:0 45% 0 0;border-radius:4px;background:linear-gradient(90deg,var(--accent),var(--accent2))}
.float{position:absolute;display:flex;align-items:center;gap:8px;padding:10px 15px;border-radius:12px;
  border:1px solid var(--line);background:rgba(16,20,40,.92);font-size:12px;font-weight:650;
  box-shadow:0 14px 40px rgba(0,0,0,.5);backdrop-filter:blur(10px)}
.float .ok{width:7px;height:7px;border-radius:50%;background:#2fe0a0}
.f1{top:-18px;right:-8px;animation:floaty 5s ease-in-out infinite}
.f2{bottom:34px;left:-26px;color:#b9c2ff;animation:floaty 6s ease-in-out 1s infinite}
@keyframes floaty{50%{transform:translateY(-10px)}}

/* ---------- features ---------- */
.features{padding:84px 0;border-top:1px solid var(--line)}
.sec{text-align:center;max-width:640px;margin:0 auto 48px}
.sec h2{margin:0 0 10px;font-size:clamp(28px,3.6vw,40px);letter-spacing:-.04em}
.sec p{margin:0;color:var(--muted);font-size:16px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.card{padding:26px;border:1px solid var(--line);border-radius:18px;background:var(--panel);
  transition:transform .25s ease,border-color .25s ease,background .25s ease}
.card:hover{transform:translateY(-5px);border-color:color-mix(in srgb,var(--accent) 45%, transparent);
  background:rgba(255,255,255,.07)}
.icn{display:grid;place-items:center;width:44px;height:44px;border-radius:13px;margin-bottom:18px;
  background:color-mix(in srgb,var(--accent) 15%, transparent);color:var(--accent)}
.icn svg{width:21px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.icn.g2{background:color-mix(in srgb,var(--accent2) 14%, transparent);color:var(--accent2)}
.card h3{margin:0 0 7px;font-size:16.5px}
.card p{margin:0;color:var(--muted);font-size:13.5px;line-height:1.6}

/* ---------- steps ---------- */
.steps{padding:70px 0 84px;border-top:1px solid var(--line)}
.stepsrow{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;counter-reset:step}
.stp{padding:24px;border:1px solid var(--line);border-radius:18px;background:var(--panel);position:relative}
.stp:before{counter-increment:step;content:"0" counter(step);
  font-size:13px;font-weight:800;letter-spacing:.08em;color:var(--accent2)}
.stp h3{margin:12px 0 6px;font-size:16px}
.stp p{margin:0;color:var(--muted);font-size:13.5px}

/* ---------- cta ---------- */
.cta{padding:10px 0 90px}
.ctabox{position:relative;overflow:hidden;border:1px solid rgba(255,255,255,.14);border-radius:26px;padding:58px 40px;
  background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 26%, #10142c),color-mix(in srgb,var(--accent2) 20%, #10142c))}
.ctabox:before{content:"";position:absolute;width:420px;height:420px;border-radius:50%;
  background:color-mix(in srgb,var(--accent) 30%, transparent);filter:blur(70px);top:-160px;right:-80px}
.ctabox h2{margin:0 0 10px;font-size:clamp(26px,3.4vw,38px);letter-spacing:-.04em;position:relative}
.ctabox p{margin:0 0 26px;color:rgba(238,241,255,.8);position:relative}
.ctabox .btn{position:relative;color:#10142c;background:#fff}

/* ---------- footer ---------- */
.footer{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;
  padding:26px 0 44px;border-top:1px solid var(--line);color:var(--muted);font-size:13px}
.health{display:flex;align-items:center;gap:9px}

@media(max-width:960px){
  .hero{grid-template-columns:1fr;gap:56px;padding:56px 0 72px}
  .grid,.stepsrow{grid-template-columns:1fr 1fr}
  .work{grid-template-columns:118px 1fr}
  .insp{display:none}
}
@media(max-width:640px){
  .shell{width:min(100% - 28px,1140px)}
  .links a:not(.pill){display:none}
  .grid,.stepsrow{grid-template-columns:1fr}
  .work{grid-template-columns:1fr}
  .tray{display:none}
  .f1{right:4px;top:-14px}
  .f2{left:4px}
}
@media(prefers-reduced-motion:reduce){
  *{animation:none!important;transition:none!important}
}
</style>
</head>
<body>
<header class="nav">
  <div class="shell">
    <a class="brand" href="/" aria-label="${appName} home"><span class="mark"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 13 4 4 8-10"/></svg></span>${appName}</a>
    <nav class="links">
      <a href="#features">Features</a>
      <a href="#steps">How it works</a>
      <a class="pill" href="#cta">Start building</a>
    </nav>
  </div>
</header>

<main>
  <section class="shell hero">
    <div>
      <span class="eyebrow"><span class="dot"></span>${badge}</span>
      <h1>${tagline}</h1>
      <p>${description}</p>
      <div class="actions">
        <a class="btn primary" href="#cta"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Create your app</a>
        <a class="btn ghost" href="#features"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>Watch demo</a>
      </div>
      <div class="trust">
        <span><b>12k+</b> apps shipped</span>
        <span><b>190</b> edge regions</span>
        <span><b>99.99%</b> uptime</span>
      </div>
    </div>

    <div class="stage" aria-hidden="true">
      <div class="window">
        <div class="bar"><i></i><i></i><i></i><b>untitled-app.sprint</b></div>
        <div class="work">
          <aside class="tray">
            <small>COMPONENTS</small>
            <div class="chip on"><i></i>Button</div>
            <div class="chip"><i></i>Card</div>
            <div class="chip"><i></i>Input</div>
            <div class="chip"><i></i>Chart</div>
            <div class="chip"><i></i>List</div>
            <div class="chip"><i></i>Nav bar</div>
          </aside>
          <div class="canvas">
            <div class="herocard">
              <span class="tag">LAUNCHING SOON</span>
              <div class="bigline"></div>
              <div class="bigline w70"></div>
              <div class="row"><span class="btn2 g">Get started</span><span class="btn2 o">Watch demo</span></div>
            </div>
            <div class="cards3">
              <div class="tcard"><div class="ic"></div><div class="l w60"></div><div class="l w80"></div></div>
              <div class="tcard"><div class="ic ic2"></div><div class="l w60"></div><div class="l w80"></div></div>
              <div class="tcard"><div class="ic ic3"></div><div class="l w60"></div><div class="l w80"></div></div>
            </div>
          </div>
          <aside class="insp">
            <small>INSPECTOR</small>
            <div class="prop"><span>Type</span><b>Hero card</b></div>
            <div class="prop"><span>Radius</span><b>18px</b></div>
            <div class="prop"><span>Theme</span><b>Dark</b></div>
            <div class="swatches"><i></i><i></i><i></i><i></i></div>
            <div class="slid"></div>
          </aside>
        </div>
      </div>
      <div class="float f1"><span class="ok"></span>Build passed in 0.8s</div>
      <div class="float f2">&#9650; Deployed to edge</div>
    </div>
  </section>

  <section class="features" id="features">
    <div class="shell">
      <div class="sec">
        <h2>Everything you need to <span class="grad">ship apps</span></h2>
        <p>From the first wireframe to the final deploy \u2014 one workspace for the whole journey.</p>
      </div>
      <div class="grid">
        <article class="card">
          <span class="icn"><svg viewBox="0 0 24 24"><path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/></svg></span>
          <h3>Visual builder</h3>
          <p>Drag, drop and style components on a live canvas. The code updates itself as you design.</p>
        </article>
        <article class="card">
          <span class="icn g2"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span>
          <h3>Live preview</h3>
          <p>See every change instantly on phone, tablet and desktop \u2014 before a single deploy.</p>
        </article>
        <article class="card">
          <span class="icn"><svg viewBox="0 0 24 24"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg></span>
          <h3>Clean code</h3>
          <p>Hand-tuned output: readable, modern and framework-free. Take it anywhere you like.</p>
        </article>
        <article class="card">
          <span class="icn g2"><svg viewBox="0 0 24 24"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/></svg></span>
          <h3>Edge deploy</h3>
          <p>Publish to 190+ regions in one click. Your app is live before your coffee cools.</p>
        </article>
        <article class="card">
          <span class="icn"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
          <h3>Team sync</h3>
          <p>Invite your team, share projects and review changes together in real time.</p>
        </article>
        <article class="card">
          <span class="icn g2"><svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span>
          <h3>Private by default</h3>
          <p>Your projects stay yours. End-to-end protection and no third-party tracking.</p>
        </article>
      </div>
    </div>
  </section>

  <section class="steps" id="steps">
    <div class="shell">
      <div class="sec">
        <h2>From idea to live in <span class="grad">three steps</span></h2>
        <p>No tutorials required. If you can use a browser, you can build an app.</p>
      </div>
      <div class="stepsrow">
        <div class="stp">
          <h3>Design</h3>
          <p>Pick a template or start blank. Compose screens with the visual builder.</p>
        </div>
        <div class="stp">
          <h3>Connect</h3>
          <p>Add data, logic and APIs with simple blocks \u2014 or drop into code mode.</p>
        </div>
        <div class="stp">
          <h3>Ship</h3>
          <p>One click publishes your app to the edge with HTTPS and a custom domain.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="cta" id="cta">
    <div class="shell">
      <div class="ctabox">
        <h2>Ready to build something great?</h2>
        <p>Join thousands of makers shipping apps every day. It&rsquo;s free to start.</p>
        <a class="btn" href="/">Start building &rarr;</a>
      </div>
    </div>
  </section>
</main>

<footer class="shell footer">
  <span>&copy; 2026 ${appName}. Thoughtful tools for focused work.</span>
  <span class="health"><span class="dot"></span>${status}</span>
</footer>
</body>
</html>`;
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => HTML_ESCAPES[character] || "");
}
function safeColor(value) {
  let color = String(value).trim();
  return /^(#[0-9a-f]{3,8}|(?:rgb|hsl)a?\([\d\s.,%]+\))$/i.test(color) ? color : "#7567f8";
}
export {
  index_default as default
};
