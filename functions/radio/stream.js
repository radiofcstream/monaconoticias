// Cloudflare Pages Function: GET /radio/stream
// Configure RADIO_STREAM_URL as a Pages environment variable.
// Example value: the exact upstream stream URL already used by your working proxy.
export async function onRequest({ request, env }) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD", "Cache-Control": "no-store" }
    });
  }

  const source = env.RADIO_STREAM_URL;
  if (!source) {
    return new Response(
      "Falta configurar RADIO_STREAM_URL en Cloudflare Pages.",
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  let upstream;
  try {
    upstream = await fetch(source, {
      method: request.method,
      headers: {
        "Icy-MetaData": "0",
        "Accept": "audio/*, */*"
      },
      redirect: "follow"
    });
  } catch (error) {
    return new Response(
      "Cloudflare no pudo conectarse al servidor de audio. Revisá la URL y el puerto de origen.",
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!upstream.ok || !upstream.body) {
    return new Response(`El servidor de audio respondió HTTP ${upstream.status}.`, {
      status: 502,
      headers: { "Cache-Control": "no-store" }
    });
  }

  const headers = new Headers();
  headers.set("Content-Type", upstream.headers.get("content-type") || "audio/mpeg");
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  headers.set("Pragma", "no-cache");
  headers.set("X-Content-Type-Options", "nosniff");

  // Streaming pass-through: no buffering, no full download, no cache.
  return new Response(request.method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    headers
  });
}
