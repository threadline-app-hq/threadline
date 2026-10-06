// Threadline failover proxy.
// Serves the app from the first healthy origin. Render is primary;
// Railway and Back4App are always-on standbys that share the same
// database and session secret, so any origin can serve any request.
// Failover happens ONLY on gateway errors (502/503/504, origin did not
// process the request) or, for idempotent methods, network failure.
// App-level responses (including 500s) are never replayed to another
// origin, so a mutation can never be applied twice.
const ORIGINS = [
  "https://threadline-app-jpc0.onrender.com",
  "https://threadline-production-9c4f.up.railway.app",
  "https://threadline-3go33z33.b4a.run",
];

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const idempotent = method === "GET" || method === "HEAD" || method === "OPTIONS";

    let body = null;
    if (method !== "GET" && method !== "HEAD") {
      body = await request.arrayBuffer();
    }

    let sawGatewayError = false;
    for (const origin of ORIGINS) {
      try {
        const resp = await fetch(origin + url.pathname + url.search, {
          method,
          headers: request.headers,
          body,
          redirect: "manual",
        });
        // 502/503/504 + Cloudflare edge-origin errors 521/522/523/525/526/530:
        // all mean the origin app never saw the request.
        if ([502, 503, 504, 521, 522, 523, 525, 526, 530].includes(resp.status)) {
          sawGatewayError = true;
          continue; // origin never processed it - safe to try the next one
        }
        return resp;
      } catch (err) {
        if (!idempotent) break; // ambiguous: request may have reached the origin
        continue;
      }
    }
    const msg = sawGatewayError
      ? "Threadline is restarting. Please try again in a minute."
      : "Threadline is temporarily unreachable. Please try again in a minute.";
    return new Response(msg, {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8", "retry-after": "30" },
    });
  },
};
