import{connect as ie}from"cloudflare:sockets";var H=new TextEncoder,se=new TextDecoder("utf-8",{fatal:!0}),b="https://cloudflare-dns.com/dns-query",oe=1024,ae=16384,ce=1e3,T=1048576,le=8,de=8e3,pe=6e3,y=new Map,_=0,he={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"},We={async fetch(t,e){try{return await ue(t,e)}catch(r){try{E(e,r)}catch{}try{return w()}catch{return new Response(`Not Found
`,{status:404})}}}};async function ue(t,e){let r;try{r=new URL(t.url)}catch{return w()}if((t.headers.get("Upgrade")||"").toLowerCase()==="websocket"){try{let i=S(e);if(r.pathname===i)return q(e),we(t,e,r)}catch(i){E(e,i)}return w()}if(t.method==="GET")try{let i=Z(e);if(r.pathname===i&&(!e.SUB_TKN||Pe(t,e.SUB_TKN,r)))return q(e),await me(t,e,r)}catch(i){E(e,i)}if((t.method==="GET"||t.method==="HEAD")&&Oe(t,e,r.pathname))try{return ze(t,e)}catch(i){E(e,i)}return w()}function q(t){Q(t.IDUS||""),S(t),Z(t);let e=(l(t.BLK_PRV)||"true").toLowerCase();if(e!=="true"&&e!=="false")throw new Error("Invalid protection mode");let r=(l(t.PRX_MOD)||"fallback").toLowerCase();if(!["always","off","fallback"].includes(r))throw new Error("Invalid relay mode");let n=new URL(l(t.DOH_URL)||b);if(n.protocol!=="https:")throw new Error("Invalid resolver");if(C(n.hostname))throw new Error("Invalid resolver host");let i=l(t.DOH_FBK_URL);if(i){let a=new URL(i);if(a.protocol!=="https:")throw new Error("Invalid fallback resolver");if(C(a.hostname))throw new Error("Invalid fallback resolver host")}let s=new URL(l(t.DOH_JSON_URL)||b);if(s.protocol!=="https:")throw new Error("Invalid resolver");if(C(s.hostname))throw new Error("Invalid resolver host");if(t.ECH_CFG&&!He(t.ECH_CFG))throw new Error("Invalid extension config")}var fe=["https://1.1.1.1/dns-query","https://8.8.8.8/dns-query","https://9.9.9.9/dns-query","https://one.one.one.one/dns-query","https://dns.quad9.net/dns-query","https://doh.pub/dns-query","https://doh.alidns.com/dns-query","https://dns.google/dns-query"],m=new Map;function ge(t){let e=[],r=s=>{let a=l(s);a&&!e.includes(a)&&e.push(a)};r(t.DOH_URL||b),r(t.DOH_FBK_URL);for(let s of fe)r(s);let n=null,i=0;for(let[s,a]of m)a>i&&(n=s,i=a);return n&&e.includes(n)&&(e.splice(e.indexOf(n),1),e.unshift(n)),e.length?e:[b]}function be(t){try{if(m.set(t,(m.get(t)||0)+1),m.size>16){let e=[...m.entries()].sort((r,n)=>r[1]-n[1]);for(let r=0;r<e.length-8;r++)m.delete(e[r][0])}}catch{}}async function me(t,e,r){let n=l(r.searchParams.get("format"),"sub").toLowerCase(),i=n==="notls"||l(r.searchParams.get("security"),"").toLowerCase()==="none"||l(r.searchParams.get("notls"),"")==="1",s=L(e),a={"Cache-Control":"no-store, max-age=0","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer","Profile-Title":"base64:"+G(s)};if(n==="ech")return A(await Ee(e,r),a);let d=Se(r,e,i);if(n==="uri"||n==="notls"||n==="link")return M(d+`
`,a);if(n==="core"||n==="json"||n==="legacy"||n==="modern"||n==="core-modern"){let o=n==="modern"||n==="core-modern"||l(r.searchParams.get("modern"),"")==="1";return A(_e(r,e,!o,i),a)}return n==="sb"||n==="sing"||n==="singbox"||n==="sing-box"?A(Ce(r,e,i),a):n==="sub"?M(G(d+`
`),a):w()}function we(t,e,r){let n=(t.headers.get("Sec-WebSocket-Protocol")||"").split(",",1)[0].trim(),s=Re(n,8192),a=f(e.MAX_TUN,1,256,16);if(_>=a)return w();let d=!1,o=()=>{d||(d=!0,_=Math.max(0,_-1))};_++;try{let c=new WebSocketPair,[p,h]=Object.values(c);h.accept(),h.binaryType="arraybuffer";let u=new R(h,e,r.hostname),x=xe(u,ne(e));h.addEventListener("message",P=>{try{x(P.data)}catch{}}),h.addEventListener("close",()=>{o();try{u.shutdown()}catch{}}),h.addEventListener("error",()=>{o();try{u.shutdown()}catch{}});let O={status:101,webSocket:p};n&&(O.headers={"Sec-WebSocket-Protocol":n});let z;try{z=new Response(null,O)}catch(P){o();try{u.shutdown(),g(h,1011,"upgrade failed")}catch{}throw P}return s&&s.byteLength>0&&x(s),z}catch(c){throw o(),c}}function xe(t,e){let r=Promise.resolve();return n=>{r=r.then(()=>t.push(n)).catch(i=>{try{e&&console.error("session error",i)}catch{}try{let s=e?re(i?.message||"session error"):"upstream error";t.abort(1011,s)}catch{}})}}var R=class{constructor(e,r,n){this.webSocket=e,this.env=r,this.requestHost=n,this.headerBuffer=new Uint8Array(0),this.mode="header",this.relay=null}async push(e){if(this.webSocket.readyState!==1)return;let r=await Ue(e);if(r.byteLength){if(this.mode==="header"){this.headerBuffer=this.headerBuffer.byteLength?k(this.headerBuffer,r):r;let n=ye(this.headerBuffer,this.env.IDUS);if(!n){if(this.headerBuffer.byteLength>oe)throw new Error("Incomplete header");return}if(Y(n.address,this.env,this.requestHost))throw new Error("Destination denied");if(n.port===25||n.port<1||n.port>65535)throw new Error("Port denied");let i=this.headerBuffer.subarray(n.payloadOffset);this.headerBuffer=new Uint8Array(0);let s=Uint8Array.of(n.version,0);if(n.command===1){this.mode="tcp",this.relay=new I(this.webSocket,s,n.address,n.port,this.env,this.requestHost),await this.relay.start(i);return}if(n.command===2&&n.port===53){this.mode="dns",this.relay=new U(this.webSocket,s,ge(this.env),f(this.env.DNS_TMO_MS,1e3,3e4,de)),await this.relay.write(i);return}throw new Error("Unsupported request")}if(!this.relay)throw new Error("Relay missing");await this.relay.write(r)}}abort(e,r){try{this.shutdown()}catch{}g(this.webSocket,e,r)}shutdown(){if(this.relay)try{this.relay.close()}catch{}}},U=class{constructor(e,r,n,i){this.webSocket=e,this.responseHeader=r,this.resolverUrls=n,this.timeoutMs=i,this.buffer=new Uint8Array(0),this.headerSent=!1,this.closed=!1,this.queryCount=0,this.controller=null}async write(e){if(!this.closed)for(this.buffer=k(this.buffer,e);this.buffer.byteLength>=2;){let r=this.buffer[0]<<8|this.buffer[1];if(r<12||r>ae)throw new Error("Invalid packet");if(this.buffer.byteLength<r+2)return;let n=this.buffer.slice(2,r+2);if(this.buffer=this.buffer.slice(r+2),++this.queryCount>ce)throw new Error("Query limit exceeded");let i=null,s=null;for(let o of this.resolverUrls){if(this.closed)return;let c=new AbortController;this.controller=c;let p=setTimeout(()=>c.abort(),this.timeoutMs);try{let h=await fetch(o,{method:"POST",headers:{Accept:"application/dns-message","Content-Type":"application/dns-message"},body:n,redirect:"error",signal:c.signal});if(!h.ok){s=new Error("Resolver request failed");continue}let u=new Uint8Array(await h.arrayBuffer());if(!u.byteLength||u.byteLength>65535){s=new Error("Invalid resolver answer");continue}i=u,be(o);break}catch(h){s=h instanceof Error?h:new Error("Resolver error")}finally{clearTimeout(p),this.controller=null}}if(i===null)throw s||new Error("Resolver request failed");if(this.closed)return;let a=Uint8Array.of(i.byteLength>>8,i.byteLength&255),d=this.headerSent?k(a,i):k(this.responseHeader,a,i);if(this.headerSent=!0,!te(this.webSocket,d))throw new Error("Connection closed")}}close(){this.closed=!0;try{this.controller&&this.controller.abort()}catch{}this.buffer=new Uint8Array(0)}},I=class{constructor(e,r,n,i,s,a){this.webSocket=e,this.responseHeader=r,this.targets=ve(n,i,s,a),this.connectTimeout=f(s.CON_TMO_MS,1e3,3e4,8e3),this.maxReplayBytes=f(s.MAX_RPL_BYT,16384,1048576,262144),this.targetIndex=-1,this.socket=null,this.writer=null,this.generation=0,this.switching=null,this.gotRemoteData=!1,this.headerSent=!1,this.closed=!1,this.retryAllowed=!0,this.replay=[],this.replayBytes=0,this.sequence=0,this.sentSequence=0}async start(e){let r=this.remember(e);await this.beginSwitch(),!this.closed&&e.byteLength&&r===null&&this.writer&&await this.writer.write(e)}async write(e){if(this.closed)return;let r=this.gotRemoteData?null:this.remember(e),n=this.switching;if(n&&await n,this.closed||r!==null&&r<=this.sentSequence)return;let i=this.writer,s=this.generation;if(!i)throw new Error("No writer");try{await i.write(e),r!==null&&(this.sentSequence=Math.max(this.sentSequence,r))}catch{if(this.closed)return;if(this.webSocket.readyState!==1){this.close();return}if(this.gotRemoteData||!this.retryAllowed){this.close(),g(this.webSocket,1e3,"done");return}await this.scheduleNext(s)}}remember(e){if(!e.byteLength)return this.sequence;if(!this.retryAllowed||this.replayBytes+e.byteLength>this.maxReplayBytes)return this.retryAllowed=!1,null;let r=++this.sequence;return this.replay.push({seq:r,data:e}),this.replayBytes+=e.byteLength,r}beginSwitch(){return this.switching?this.switching:(this.switching=this.activateNextTarget().finally(()=>{this.switching=null}),this.switching)}async activateNextTarget(){for(this.disposeActiveSocket();++this.targetIndex<this.targets.length;){if(this.closed)return;let e=this.targets[this.targetIndex],r;try{if(r=ie({hostname:e.hostname,port:e.port},{allowHalfOpen:!0,secureTransport:"off"}),Be(r),await De(r.opened,this.connectTimeout,()=>$(r)),this.closed){await j(r);return}let n=r.writable.getWriter(),i=++this.generation;this.socket=r,this.writer=n;let s=this.replay.slice();if(s.length&&(await n.write(ee(s.map(a=>a.data))),this.sentSequence=s[s.length-1].seq),this.closed){this.disposeActiveSocket();return}this.pumpRemote(r,i).catch(()=>{try{!this.closed&&i===this.generation&&(this.close(),g(this.webSocket,1011,"read failed"))}catch{}});return}catch{r&&await j(r),this.socket=null,this.writer=null}}throw this.closed=!0,g(this.webSocket,1011,"unavailable"),new Error("No upstream available")}async scheduleNext(e){if(!(this.closed||e!==this.generation)){if(this.gotRemoteData||!this.retryAllowed)throw this.close(),g(this.webSocket,1011,"closed"),new Error("Upstream closed");await this.beginSwitch()}}async pumpRemote(e,r){let n=e.readable.getReader();try{for(;!this.closed;){let{value:i,done:s}=await n.read();if(s)break;if(r!==this.generation)return;let a=i instanceof Uint8Array?i:new Uint8Array(i);if(!a.byteLength)continue;this.gotRemoteData=!0,this.replay=[],this.replayBytes=0;let d=this.headerSent?a:k(this.responseHeader,a);if(this.headerSent=!0,!te(this.webSocket,d))throw new Error("Connection closed")}}catch{this.webSocket.readyState!==1&&(this.closed=!0)}finally{try{n.releaseLock()}catch{}}if(!(this.closed||r!==this.generation)){if(this.gotRemoteData){this.close(),g(this.webSocket,1e3,"done");return}try{await this.scheduleNext(r)}catch{}}}disposeActiveSocket(){let e=this.writer,r=this.socket;this.writer=null,this.socket=null,e&&Me(e),r&&$(r)}close(){this.closed||(this.closed=!0,this.generation++,this.disposeActiveSocket(),this.replay=[],this.replayBytes=0)}};function ye(t,e){if(t.byteLength<18)return null;let r=t[0];if(r!==0)throw new Error("Unsupported tunnel version");let n=Q(e);if(!Ne(t.subarray(1,17),n))throw new Error("Authentication failed");let s=18+t[17];if(t.byteLength<s+4)return null;let a=t[s++],d=t[s]<<8|t[s+1];s+=2;let o=t[s++],c;if(o===1){if(t.byteLength<s+4)return null;c=Array.from(t.subarray(s,s+4)).join("."),s+=4}else if(o===2){if(t.byteLength<s+1)return null;let p=t[s++];if(!p||t.byteLength<s+p)return null;c=se.decode(t.subarray(s,s+p)),s+=p}else if(o===3){if(t.byteLength<s+16)return null;let p=[];for(let h=0;h<16;h+=2)p.push((t[s+h]<<8|t[s+h+1]).toString(16));c=p.join(":"),s+=16}else throw new Error("Unsupported address type");return{version:r,command:a,port:d,address:c,payloadOffset:s}}function ve(t,e,r,n){let i=l(r.PRX_MOD,"fallback").toLowerCase(),s=String(r.PDR||"").split(",").map(o=>o.trim()).filter(Boolean).slice(0,le).map(o=>{try{return ke(o,e)}catch{return null}}).filter(o=>o&&F(o.hostname,o.port,r,n)),a;if(i==="always"){if(!s.length)throw new Error("Relay mode requires targets");a=s}else i==="off"?a=[{hostname:t,port:e}]:a=[{hostname:t,port:e},...s];let d=new Set;return a.filter(o=>{if(!F(o.hostname,o.port,r,n))return!1;let c=o.hostname.toLowerCase()+"|"+o.port;return d.has(c)?!1:(d.add(c),!0)})}function F(t,e,r,n){return!Number.isInteger(e)||e<1||e>65535||e===25?!1:!Y(t,r,n)}function ke(t,e){let r=t,n=e;if(t.startsWith("[")){let i=t.indexOf("]");if(i<0)throw new Error("Invalid target");r=t.slice(1,i),t[i+1]===":"&&(n=Number(t.slice(i+2)))}else if((t.match(/:/g)||[]).length===1){let i=t.lastIndexOf(":"),s=Number(t.slice(i+1));if(!Number.isInteger(s)||s<1||s>65535)throw new Error("Invalid target");r=t.slice(0,i),n=s}if(!r||!Number.isInteger(n)||n<1||n>65535)throw new Error("Invalid target");return{hostname:r,port:n}}function Se(t,e,r){let n=l(e.PUB_HST)||t.hostname,i=f(e.PUB_PRT,1,65535,r?80:443),s=l(e.HST_HDR)||n,a=K(e),d=L(e),o=new URLSearchParams({encryption:"none",security:r?"none":"tls",type:"ws",host:s,path:a});return r||(o.set("sni",l(e.SNI)||n),o.set("fp",l(e.FPR,"chrome"))),"vless://"+e.IDUS+"@"+Ie(n)+":"+i+"?"+o.toString()+"#"+encodeURIComponent(d)}function _e(t,e,r,n){let i=l(e.PUB_HST)||t.hostname,s=f(e.PUB_PRT,1,65535,n?80:443),a=l(e.HST_HDR)||i,d=L(e),o={path:K(e),host:a},c=r?{vnext:[{address:i,port:s,users:[{id:e.IDUS,encryption:"none"}]}]}:{address:i,port:s,id:e.IDUS,encryption:"none"},p;if(n)p=r?{network:"ws",security:"none",wsSettings:o}:{method:"websocket",security:"none",wsSettings:o};else{let h=l(e.SNI)||i,u={serverName:h,allowInsecure:!1,fingerprint:l(e.FPR,"chrome"),alpn:["http/1.1"]},x=V(e,h);x&&(u.echConfigList=x),p=r?{network:"ws",security:"tls",tlsSettings:u,wsSettings:o}:{method:"websocket",security:"tls",tlsSettings:u,wsSettings:o}}return{log:{loglevel:"warning"},dns:{queryStrategy:"UseIP",servers:[l(e.DOH_URL,b)]},inbounds:[{tag:"socks-in",listen:"127.0.0.1",port:f(e.LOC_SCK_PRT,1,65535,10808),protocol:"socks",settings:{udp:!1},sniffing:{enabled:!0,destOverride:["http","tls"]}}],outbounds:[{tag:d,protocol:"vless",settings:c,streamSettings:p},{tag:"direct",protocol:"freedom"},{tag:"block",protocol:"blackhole"}],routing:{domainStrategy:"IPIfNonMatch",rules:[{type:"field",ip:["geoip:private"],outboundTag:"block"},{type:"field",protocol:["bittorrent"],outboundTag:"block"}]}}}function Ce(t,e,r){let n=l(e.PUB_HST)||t.hostname,i=f(e.PUB_PRT,1,65535,r?80:443),s=l(e.HST_HDR)||n,a=L(e),d=f(e.ERL_DAT,0,8192,2560),o={type:"ws",path:S(e),headers:{Host:s}};d>0&&(o.max_early_data=d,o.early_data_header_name="Sec-WebSocket-Protocol");let c;if(r)c={enabled:!1};else{let p=l(e.SNI)||n;c={enabled:!0,server_name:p,insecure:!1,alpn:["http/1.1"],utls:{enabled:!0,fingerprint:l(e.FPR,"chrome")}},l(e.ECH_MOD,"off").toLowerCase()!=="off"&&(c.ech=e.ECH_CFG?{enabled:!0,config:[e.ECH_CFG]}:{enabled:!0,query_server_name:l(e.ECH_LKP_HST)||p})}return{log:{level:"warn",timestamp:!0},dns:{servers:[{type:"https",tag:"cloudflare-doh",server:"1.1.1.1",server_port:443,path:"/dns-query",tls:{enabled:!0,server_name:"cloudflare-dns.com"}}],strategy:"prefer_ipv4"},inbounds:[{type:"mixed",tag:"mixed-in",listen:"127.0.0.1",listen_port:f(e.LOC_MIX_PRT,1,65535,2080)}],outbounds:[{type:"vless",tag:a,server:n,server_port:i,uuid:e.IDUS,network:"tcp",tls:c,transport:o},{type:"direct",tag:"direct"},{type:"block",tag:"block"}],route:{rules:[{network:"udp",action:"reject"}],final:a,auto_detect_interface:!0}}}function L(t){return l(t.CFG_NAM,"private-edge").replace(/[^\w.-]+/g,"-").slice(0,64)||"private-edge"}function K(t){let e=S(t),r=f(t.ERL_DAT,0,8192,2560);return r>0?e+"?ed="+r:e}function V(t,e){if(l(t.ECH_MOD,"off").toLowerCase()==="off")return"";if(t.ECH_CFG)return t.ECH_CFG;let r=l(t.ECH_DOH_URL,l(t.DOH_URL,b));return(l(t.ECH_LKP_HST)||e)+"+"+r}async function Ee(t,e){let r=l(t.PUB_HST)||e.hostname,n=l(t.ECH_LKP_HST)||l(t.SNI)||r;if(t.ECH_CFG)return{host:n,mode:"fixed",published:null,echConfigList:[t.ECH_CFG],value:t.ECH_CFG};let i=new URL(l(t.DOH_JSON_URL,b));i.searchParams.set("name",n),i.searchParams.set("type","HTTPS");let s=await Le(i,{headers:{Accept:"application/dns-json"}},pe);if(!s.ok)throw new Error("Lookup failed");let a=await s.json(),d=Array.isArray(a.Answer)?a.Answer.filter(c=>c.type===65):[],o=[];for(let c of d){let p=String(c.data||"").match(/\bech=(?:"([^"]+)"|([^\s]+))/i),h=p&&(p[1]||p[2]);h&&o.push(h)}return{host:n,mode:"dns",published:o.length>0,echConfigList:o,value:V(t,n),answers:d}}async function Le(t,e,r){let n=new AbortController,i=setTimeout(()=>n.abort(),r);try{let s={...e,signal:n.signal};return"redirect"in s||(s.redirect="error"),await fetch(t,s)}finally{clearTimeout(i)}}function Pe(t,e,r){if(!e)return!1;let n=String(r.searchParams.get("token")||"");if(n.length>1024)return!1;let i=t.headers.get("Authorization")||"";if(i.length>2048)return!1;let s=i.toLowerCase().startsWith("bearer ")?i.slice(7).trim():"";return W(n,e)||W(s,e)}function Y(t,e,r=""){let n=N(t),i=N(e.PUB_HST||r);return i&&n===i?!0:l(e.BLK_PRV,"true").toLowerCase()==="false"?!1:C(n)}function N(t){return String(t||"").toLowerCase().trim().replace(/^\[|\]$/g,"").replace(/\.$/,"")}function C(t){let e=N(t);if(!e)return!1;if(e==="localhost"||e.endsWith(".localhost")||e.endsWith(".local")||e.endsWith(".internal")||e.endsWith(".home.arpa")||e==="metadata.google.internal"||e==="metadata.google")return!0;let r=J(e);if(r)return D(r);if(e.includes(":")){let n=Ae(e);if(n)return Te(n)}return!1}function D([t,e]){return t===0||t===10||t===127||t===100&&e>=64&&e<=127||t===169&&e===254||t===172&&e>=16&&e<=31||t===192&&(e===0||e===168)||t===198&&(e===18||e===19)||t>=224}function Te(t){return t.every(e=>e===0)||t[0]===0&&t[1]===0&&t[2]===0&&t[3]===0&&t[4]===0&&t[5]===0&&t[6]===0&&t[7]===1||(t[0]&65024)===64512||(t[0]&65472)===65152||(t[0]&65280)===65280?!0:t[0]===0&&t[1]===0&&t[2]===0&&t[3]===0&&t[4]===0&&t[5]===65535?D([t[6]>>>8&255,t[6]&255,t[7]>>>8&255,t[7]&255]):t[0]===0&&t[1]===0&&t[2]===0&&t[3]===0&&t[4]===0&&t[5]===0?D([t[6]>>>8&255,t[6]&255,t[7]>>>8&255,t[7]&255]):!1}function J(t){let e=String(t||"").trim();if(!e||/[\s/]/.test(e))return null;let r=o=>/^0x[0-9a-f]+$/i.test(o)?Number.parseInt(o.slice(2),16):/^0[0-7]+$/.test(o)&&o.length>1?Number.parseInt(o.slice(1),8):/^\d+$/.test(o)?Number(o):NaN,n=e.split(".");if(n.length===1){let o=r(e);return!Number.isInteger(o)||o<0||o>4294967295?null:[o>>>24&255,o>>>16&255,o>>>8&255,o&255]}if(n.length<2||n.length>4)return null;let i=n.map(r);for(let o=0;o<i.length-1;o++)if(!Number.isInteger(i[o])||i[o]<0||i[o]>255)return null;let s=i[i.length-1],a=4-(i.length-1);if(!Number.isInteger(s)||s<0||s>=Math.pow(2,8*a))return null;let d=i.slice(0,-1);for(let o=a-1;o>=0;o--)d.push(s>>>8*o&255);return d}function Ae(t){let e=String(t||"").trim().toLowerCase();if(!e||e.includes(" ")||e.includes("%"))return null;if(e.includes(".")){let c=e.lastIndexOf(":");if(c<0)return null;let p=J(e.slice(c+1));if(!p)return null;let h=(p[0]<<8|p[1]).toString(16),u=(p[2]<<8|p[3]).toString(16);e=e.slice(0,c)+":"+h+":"+u}let r=e.split("::");if(r.length>2)return null;let n=c=>/^[0-9a-f]{1,4}$/.test(c)?Number.parseInt(c,16):-1;if(r.length===1){if(e.endsWith(":"))return null;let c=e.split(":").map(n);return c.length!==8||c.some(p=>p<0)?null:c}let i=r[0]?r[0].split(":").filter(Boolean):[],s=r[1]?r[1].split(":").filter(Boolean):[];if(i.length+s.length>7)return null;let a=i.map(n),d=s.map(n);if(a.some(c=>c<0)||d.some(c=>c<0))return null;let o=8-i.length-s.length;return o<1?null:[...a,...new Array(o).fill(0),...d]}function He(t){let e=String(t||"").trim();return e.length>=4&&e.length<=65536&&/^[A-Za-z0-9+/_-]+={0,2}$/.test(e)}function Re(t,e){let r=String(t||"").split(",",1)[0].trim();if(!r)return new Uint8Array(0);if(e<=0||r.length>8192||!/^[A-Za-z0-9+/_-]+={0,2}$/.test(r)||Math.floor(r.length*3/4)>e)return null;try{let i=r.replace(/-/g,"+").replace(/_/g,"/"),s=i+"=".repeat((4-i.length%4)%4),a=atob(s);if(a.length>e)return null;let d=new Uint8Array(a.length);for(let o=0;o<a.length;o++)d[o]=a.charCodeAt(o);return d}catch{return null}}async function Ue(t){if(t instanceof ArrayBuffer){if(t.byteLength>T)throw new Error("Message too large");return new Uint8Array(t)}if(ArrayBuffer.isView(t)){if(t.byteLength>T)throw new Error("Message too large");return new Uint8Array(t.buffer,t.byteOffset,t.byteLength)}if(t instanceof Blob){if(t.size>T)throw new Error("Message too large");return new Uint8Array(await t.arrayBuffer())}throw new Error("Binary frames required")}function Q(t){let e=String(t||"").trim().toLowerCase(),r=y.get(e);if(r)return r;let n=e.replace(/-/g,"");if(!/^[0-9a-f]{32}$/.test(n))throw new Error("Invalid identity");let i=new Uint8Array(16);for(let s=0;s<16;s++)i[s]=Number.parseInt(n.slice(s*2,s*2+2),16);if(y.size>=32){let s=y.keys().next().value;s!==void 0&&y.delete(s)}return y.set(e,i),i}function S(t){if(t.WS_PTH)return B(t.WS_PTH);let e=String(t.IDUS||"").trim();if(!e)throw new Error("Identity is required");return B("/"+e)}function Z(t){return t.SUB_PTH?B(t.SUB_PTH):S(t)}function B(t){let e=String(t||"").trim().split("?",1)[0];if(!e||e==="/")throw new Error("A non-root path is required");return e.startsWith("/")?e:"/"+e}function Ie(t){return t.includes(":")&&!t.startsWith("[")?"["+t+"]":t}function Ne(t,e){if(t.byteLength!==e.byteLength)return!1;let r=0;for(let n=0;n<t.byteLength;n++)r|=t[n]^e[n];return r===0}function W(t,e){let r=H.encode(String(t)),n=H.encode(String(e)),i=Math.max(r.byteLength,n.byteLength),s=r.byteLength^n.byteLength;for(let a=0;a<i;a++)s|=(r[a]||0)^(n[a]||0);return s===0}function k(...t){return ee(t)}function ee(t){let e=t.reduce((i,s)=>i+s.byteLength,0),r=new Uint8Array(e),n=0;for(let i of t)r.set(i,n),n+=i.byteLength;return r}function G(t){let e=H.encode(t),r="";for(let n=0;n<e.byteLength;n+=8192)r+=String.fromCharCode(...e.subarray(n,n+8192));return btoa(r)}function f(t,e,r,n){let i=Number(t);return Number.isFinite(i)&&i>=e&&i<=r?Math.trunc(i):n}function De(t,e,r){let n,i=new Promise((s,a)=>{n=setTimeout(()=>{try{r()}catch{}a(new Error("Timeout"))},e)});try{Promise.resolve(t).catch(()=>{})}catch{}return Promise.race([t,i]).finally(()=>clearTimeout(n))}function Be(t){try{let e=t?.closed;e&&typeof e.catch=="function"&&e.catch(()=>{})}catch{}}function $(t){try{let e=t?.close();e&&typeof e.catch=="function"&&e.catch(()=>{})}catch{}}async function j(t){try{await t?.close()}catch{}}function Me(t){try{let e=t?.abort();e&&typeof e.catch=="function"&&e.catch(()=>{})}catch{}}function te(t,e){try{return t.readyState!==1?!1:(t.send(e),!0)}catch{return!1}}function re(t){return String(t??"").replace(/[^\x20-\x7E]/g," ").slice(0,100)}function g(t,e,r){try{(t.readyState===0||t.readyState===1)&&t.close(e,re(r))}catch{}}function ne(t){try{return l(t.DBG,"false").toLowerCase()==="true"}catch{return!1}}function E(t,e){try{ne(t)&&console.error(e)}catch{}}function l(t,e=""){return String(t??e).trim()}function M(t,e={},r=200){return new Response(t,{status:r,headers:{"Cache-Control":"no-store, max-age=0","Content-Type":"text/plain; charset=utf-8","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer",...e}})}function A(t,e={}){return new Response(JSON.stringify(t),{headers:{"Cache-Control":"no-store, max-age=0","Content-Type":"application/json; charset=utf-8","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer",...e}})}function w(){try{return M(`Not Found
`,{},404)}catch{return new Response(`Not Found
`,{status:404})}}function Oe(t,e,r){if(t.method!=="GET"&&t.method!=="HEAD")return!1;let n=l(e.LND_MOD,"all").toLowerCase();return n==="off"||n==="404"||n==="false"?!1:n==="root"?r==="/"||r==="/index.html":!0}function ze(t,e){let r=qe(e);return new Response(t.method==="HEAD"?null:r,{status:200,headers:{"Cache-Control":"public, max-age=300","Content-Type":"text/html; charset=utf-8","Content-Security-Policy":"default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'","Permissions-Policy":"camera=(), microphone=(), geolocation=(), payment=(), usb=()","Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY"}})}function qe(t){let e=v(t.APP_NAM||"LumaDesk"),r=v(t.APP_TAG||"Build beautiful apps, right in your browser."),n=v(t.APP_DSC||"A visual app builder for modern teams \u2014 design, code, preview and ship to the edge in minutes. No installs, no servers, no limits."),i=v(t.APP_BDG||"App Studio"),s=v(t.APP_STS||"All systems operational"),a=X(t.APP_ACC||"#7567f8"),d=X(t.APP_ACC_2||"#30b9a4");return`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#070b1a">
<meta name="description" content="${n}">
<title>${e} \u2014 Build beautiful apps</title>
<style>
:root{
  --ink:#eef1ff; --muted:#98a1c6; --line:rgba(255,255,255,.10);
  --wash:#070b1a; --panel:rgba(255,255,255,.045);
  --accent:${a}; --accent2:${d};
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
    <a class="brand" href="/" aria-label="${e} home"><span class="mark"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 13 4 4 8-10"/></svg></span>${e}</a>
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
      <span class="eyebrow"><span class="dot"></span>${i}</span>
      <h1>${r}</h1>
      <p>${n}</p>
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
  <span>&copy; 2026 ${e}. Thoughtful tools for focused work.</span>
  <span class="health"><span class="dot"></span>${s}</span>
</footer>
</body>
</html>`}function v(t){return String(t).replace(/[&<>"']/g,e=>he[e]||"")}function X(t){let e=String(t).trim();return/^(#[0-9a-f]{3,8}|(?:rgb|hsl)a?\([\d\s.,%]+\))$/i.test(e)?e:"#7567f8"}export{We as default};
