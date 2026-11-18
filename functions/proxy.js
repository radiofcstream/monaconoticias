
export async function onRequestGet() {
  const sources = [
    "http://uk2freenew.listen2myradio.com:29986/stream",
    "http://88.150.230.110:29986/stream"
  ];

  for (const source of sources) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    try {
      const upstream = await fetch(source, {
        headers: {
          "Icy-MetaData": "0",
          "Accept": "audio/*,*/*"
        },
        signal: controller.signal,
        redirect: "follow"
      });

      clearTimeout(timer);

      if (!upstream.ok || !upstream.body) {
        continue;
      }

      return new Response(upstream.body, {
        status: 200,
        headers: {
          "Content-Type":
            upstream.headers.get("content-type") || "audio/mpeg",
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Access-Control-Allow-Origin": "*",
          "icy-name": "MONACO 98.7 FM"
        }
      });

    } catch (error) {
      clearTimeout(timer);
    }
  }

  return new Response("No se pudo conectar con MONACO FM", {
    status: 502,
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "no-store"
    }
  });
}
