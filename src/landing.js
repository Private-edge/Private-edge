const htmlEscapePattern = /[&<>"]/g;
const htmlEscapes = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };

export function shouldShowLanding(request, env, pathname) {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  const mode = String(env.LND_MOD || "all").toLowerCase();
  if (mode === "off" || mode === "404" || mode === "false") return false;
  if (mode === "root") return pathname === "/" || pathname === "/index.html";
  return true;
}

export function landingResponse(request, env) {
  const html = renderLandingHtml(env);
  return new Response(request.method === "HEAD" ? null : html, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=300",
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
    },
  });
}

export function renderLandingHtml(env = {}) {
  const appName = escapeHtml(env.APP_NAM || "LumaDesk");
  const tagline = escapeHtml(env.APP_TAG || "A calmer place to get meaningful work done.");
  const description = escapeHtml(
    env.APP_DSC ||
      "A lightweight workspace for daily focus, clear priorities, and progress you can actually see.",
  );
  const badge = escapeHtml(env.APP_BDG || "Personal workspace");
  const status = escapeHtml(env.APP_STS || "All systems operational");
  const accent = safeColor(env.APP_ACC || "#7567f8");
  const accent2 = safeColor(env.APP_ACC_2 || "#30b9a4");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="theme-color" content="#f7f7fb">
  <meta name="description" content="${description}">
  <title>${appName} — Focus workspace</title>
  <style>
    :root{--ink:#1e2030;--muted:#73758a;--line:#e7e7ef;--paper:#fff;--wash:#f7f7fb;--accent:${accent};--accent2:${accent2};--shadow:0 18px 60px rgba(32,35,58,.10)}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--wash);color:var(--ink);font:15px/1.55 ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
    a{color:inherit;text-decoration:none}.shell{width:min(1120px,calc(100% - 32px));margin:auto}.nav{height:74px;display:flex;align-items:center;justify-content:space-between}.brand{display:flex;align-items:center;gap:11px;font-weight:780;letter-spacing:-.02em}.mark{display:grid;place-items:center;width:34px;height:34px;border-radius:11px;background:linear-gradient(140deg,var(--accent),var(--accent2));box-shadow:0 8px 22px color-mix(in srgb,var(--accent) 24%,transparent)}.mark svg{width:19px;fill:none;stroke:#fff;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}.navlinks{display:flex;align-items:center;gap:26px;color:var(--muted);font-size:14px}.navlinks a:hover{color:var(--ink)}.pill{padding:9px 14px;border:1px solid var(--line);border-radius:999px;background:rgba(255,255,255,.7);color:var(--ink)!important}
    .hero{display:grid;grid-template-columns:1fr 1.08fr;gap:70px;align-items:center;padding:70px 0 92px}.eyebrow{display:inline-flex;align-items:center;gap:8px;padding:7px 11px;border:1px solid var(--line);border-radius:999px;background:#fff;color:var(--muted);font-size:12px;font-weight:650}.dot{width:7px;height:7px;border-radius:50%;background:#29b982;box-shadow:0 0 0 4px #dff7ee}.hero h1{max-width:600px;margin:20px 0 17px;font-size:clamp(42px,5.8vw,70px);line-height:1.02;letter-spacing:-.055em}.hero p{max-width:540px;margin:0;color:var(--muted);font-size:18px}.actions{display:flex;gap:11px;margin-top:28px}.button{padding:12px 17px;border-radius:12px;border:1px solid var(--line);background:#fff;font-weight:700}.button.primary{border-color:var(--accent);background:var(--accent);color:#fff;box-shadow:0 10px 24px color-mix(in srgb,var(--accent) 24%,transparent)}
    .app{position:relative;padding:13px;border:1px solid rgba(255,255,255,.85);border-radius:26px;background:rgba(255,255,255,.68);box-shadow:var(--shadow);backdrop-filter:blur(16px)}.app:before{content:"";position:absolute;z-index:-1;inset:-44px -35px;background:radial-gradient(circle at 30% 30%,color-mix(in srgb,var(--accent) 22%,transparent),transparent 55%),radial-gradient(circle at 75% 80%,color-mix(in srgb,var(--accent2) 17%,transparent),transparent 48%);filter:blur(10px)}.window{overflow:hidden;border:1px solid var(--line);border-radius:18px;background:var(--paper)}.topbar{height:48px;display:flex;align-items:center;gap:7px;padding:0 16px;border-bottom:1px solid var(--line)}.topbar i{width:8px;height:8px;border-radius:50%;background:#dedee8}.topbar strong{margin-left:7px;font-size:12px}.board{display:grid;grid-template-columns:148px 1fr;min-height:385px}.side{padding:18px 12px;background:#fafafd;border-right:1px solid var(--line)}.side small{display:block;padding:0 8px 9px;color:#a0a1b0;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em}.item{display:flex;align-items:center;gap:9px;margin:3px 0;padding:8px;border-radius:8px;color:var(--muted);font-size:11px}.item.active{background:#eeecff;color:var(--accent);font-weight:750}.ico{width:8px;height:8px;border:1.5px solid currentColor;border-radius:3px}.main{padding:25px}.mainhead{display:flex;justify-content:space-between;align-items:start}.mainhead h2{margin:0;font-size:18px;letter-spacing:-.02em}.mainhead p{margin:3px 0 0;color:var(--muted);font-size:10px}.avatar{display:grid;place-items:center;width:29px;height:29px;border-radius:50%;background:#eceaff;color:var(--accent);font-size:10px;font-weight:800}.focus{display:flex;justify-content:space-between;align-items:center;margin-top:19px;padding:17px;border-radius:14px;background:linear-gradient(120deg,#28293b,#393b55);color:#fff}.focus span{color:#bfc1d1;font-size:9px}.focus strong{display:block;margin-top:3px;font-size:14px}.timer{font:750 25px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:-.06em}.sectiontitle{display:flex;justify-content:space-between;margin:20px 1px 9px;font-size:10px;font-weight:800}.sectiontitle span{color:var(--muted);font-weight:600}.task{display:grid;grid-template-columns:18px 1fr auto;gap:9px;align-items:center;padding:11px 9px;border-top:1px solid var(--line);font-size:10px}.check{width:15px;height:15px;border:1.5px solid #d5d5df;border-radius:5px}.task b{display:block;font-size:11px}.task em{color:var(--muted);font-style:normal}.tag{padding:3px 7px;border-radius:999px;background:#eef8f5;color:#229781;font-size:8px;font-weight:800}.tag.purple{background:#f0efff;color:var(--accent)}
    .features{padding:74px 0;border-top:1px solid var(--line)}.features h2{margin:0 0 8px;text-align:center;font-size:34px;letter-spacing:-.04em}.lead{text-align:center;color:var(--muted);margin:0 auto 33px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.card{padding:24px;border:1px solid var(--line);border-radius:18px;background:#fff}.cardicon{display:grid;place-items:center;width:37px;height:37px;margin-bottom:18px;border-radius:11px;background:#f0efff;color:var(--accent);font-weight:800}.card h3{margin:0 0 7px;font-size:15px}.card p{margin:0;color:var(--muted);font-size:13px}.footer{display:flex;justify-content:space-between;align-items:center;padding:28px 0 40px;border-top:1px solid var(--line);color:var(--muted);font-size:12px}.health{display:flex;align-items:center;gap:8px}
    @media(max-width:820px){.navlinks a:not(.pill){display:none}.hero{grid-template-columns:1fr;gap:55px;padding:45px 0 70px}.copy{text-align:center}.hero p{margin-inline:auto}.actions{justify-content:center}.app{width:min(600px,100%);margin:auto}.grid{grid-template-columns:1fr}.features{padding-top:55px}}@media(max-width:480px){.shell{width:min(100% - 22px,1120px)}.hero h1{font-size:43px}.hero p{font-size:16px}.actions{flex-direction:column}.board{grid-template-columns:1fr}.side{display:none}.main{padding:18px}.focus{padding:14px}.timer{font-size:21px}.footer{gap:15px;align-items:flex-start;flex-direction:column}}
  </style>
</head>
<body>
  <header class="shell nav">
    <a class="brand" href="/" aria-label="${appName} home"><span class="mark"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 13 4 4 8-10"/></svg></span>${appName}</a>
    <nav class="navlinks"><a href="#features">Features</a><a href="#workspace">Workspace</a><a class="pill" href="#workspace">Open dashboard</a></nav>
  </header>
  <main>
    <section class="shell hero">
      <div class="copy"><span class="eyebrow"><span class="dot"></span>${badge}</span><h1>${tagline}</h1><p>${description}</p><div class="actions"><a class="button primary" href="#workspace">View workspace</a><a class="button" href="#features">Explore features</a></div></div>
      <div class="app" id="workspace" aria-label="Workspace preview"><div class="window"><div class="topbar"><i></i><i></i><i></i><strong>${appName}</strong></div><div class="board"><aside class="side"><small>Workspace</small><div class="item active"><span class="ico"></span>Today</div><div class="item"><span class="ico"></span>Projects</div><div class="item"><span class="ico"></span>Notes</div><div class="item"><span class="ico"></span>Archive</div></aside><div class="main"><div class="mainhead"><div><h2>Good morning</h2><p>Here is your plan for today.</p></div><span class="avatar">LD</span></div><div class="focus"><div><span>FOCUS SESSION</span><strong>Product outline</strong></div><div class="timer">24:18</div></div><div class="sectiontitle">TODAY <span>3 tasks</span></div><div class="task"><span class="check"></span><div><b>Review project brief</b><em>Strategy · 20 min</em></div><span class="tag purple">Focus</span></div><div class="task"><span class="check"></span><div><b>Prepare weekly notes</b><em>Planning · 15 min</em></div><span class="tag">Quick</span></div><div class="task"><span class="check"></span><div><b>Update launch checklist</b><em>Product · 25 min</em></div><span class="tag purple">Focus</span></div></div></div></div></div>
    </section>
    <section class="features" id="features"><div class="shell"><h2>Simple by design.</h2><p class="lead">The essentials for a focused day, without the noise.</p><div class="grid"><article class="card"><span class="cardicon">01</span><h3>Daily clarity</h3><p>Keep priorities visible and turn large projects into a short, practical plan.</p></article><article class="card"><span class="cardicon">02</span><h3>Quiet focus</h3><p>Use lightweight sessions to protect attention and make steady progress.</p></article><article class="card"><span class="cardicon">03</span><h3>Useful history</h3><p>Look back on completed work without charts, clutter, or unnecessary setup.</p></article></div></div></section>
  </main>
  <footer class="shell footer"><span>© 2026 ${appName}. Thoughtful tools for focused work.</span><span class="health"><span class="dot"></span>${status}</span></footer>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value).replace(htmlEscapePattern, (character) => htmlEscapes[character]);
}

function safeColor(value) {
  const color = String(value).trim();
  return /^(#[0-9a-f]{3,8}|(?:rgb|hsl)a?\([\d\s.,%]+\))$/i.test(color) ? color : "#7567f8";
}
