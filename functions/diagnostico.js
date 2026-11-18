
export async function onRequestGet() {
  const sources = [
    "http://uk2freenew.listen2myradio.com:29986/stream",
    "http://88.150.230.110:29986/stream"
  ];

  const results = [];

  for (const url of sources) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        headers: {
          "Icy-MetaData": "0",
          "Accept": "audio/*,*/*"
        },
        signal: controller.signal
      });

      results.push({
        url,
        status: response.status,
        contentType: response.headers.get("content-type"),
        ok: response.ok
      });

      if (response.body) await response.body.cancel();

    } catch (error) {
      results.push({
        url,
        error: error.message
      });
    } finally {
      clearTimeout(timer);
    }
  }

  return Response.json(results);
}
