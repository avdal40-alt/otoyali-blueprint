const assert = require("node:assert/strict");
const http = require("node:http");

function arg(name) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function requireLocalHttpUrl(value, label) {
  assert.ok(value, `${label} is required`);
  const parsed = new URL(value);
  assert.equal(parsed.protocol, "http:", `${label} must use local HTTP`);
  assert.ok(["127.0.0.1", "localhost"].includes(parsed.hostname), `${label} must be local`);
  assert.ok(parsed.port, `${label} must include a port`);
  return parsed;
}

const listenUrl = requireLocalHttpUrl(arg("listen-url"), "--listen-url");
const targetUrl = requireLocalHttpUrl(arg("target-url"), "--target-url");

function json(response, status, body) {
  const payload = JSON.stringify(body);
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "content-length": Buffer.byteLength(payload), "cache-control": "no-store" });
  response.end(payload);
}

function isOtpStart(request) {
  return request.method === "POST" && request.url === "/api/seller/phone-verification/start";
}

function isContactSwitch(request) {
  return request.method === "PATCH" && /^\/api\/listings\/[0-9a-f-]{36}\/seller-contact$/i.test(request.url || "");
}

const server = http.createServer((request, response) => {
  if (isOtpStart(request)) {
    console.log("LOCAL_VISUAL_QA_INTERCEPT=otp-start");
    json(response, 200, { data: { challengeId: "00000000-0000-4000-8000-000000000001", expiresAt: "2099-01-01T00:00:00.000Z", maskedPhone: "+90 *** *** 0001", status: "sent" } });
    return;
  }
  if (isContactSwitch(request)) {
    console.log("LOCAL_VISUAL_QA_INTERCEPT=contact-switch");
    json(response, 503, { error: "Local visual QA contact switch interception." });
    return;
  }

  const upstream = http.request({
    protocol: targetUrl.protocol,
    hostname: targetUrl.hostname,
    port: targetUrl.port,
    method: request.method,
    path: request.url,
    headers: { ...request.headers, host: targetUrl.host }
  }, (upstreamResponse) => {
    response.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers);
    upstreamResponse.pipe(response);
  });
  upstream.on("error", () => json(response, 502, { error: "Local visual QA proxy target is unavailable." }));
  request.pipe(upstream);
});

server.listen(Number(listenUrl.port), listenUrl.hostname, () => {
  console.log(`LOCAL_VISUAL_QA_PROXY=${listenUrl.origin}`);
  console.log(`LOCAL_VISUAL_QA_PROXY_TARGET=${targetUrl.origin}`);
});
