
export default async () => {
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

      // IMPORTANTE: cancelar el temporizador al recibir los encabezados.
      // No debe interrumpir la transmisión de audio.
      clearTimeout(timer);

      if (!upstream.ok || !upstream.body) {
        continue;
      }

      const headers = new Headers();
      headers.set(
        "Content-Type",
        upstream.headers.get("content-type") || "audio/mpeg"
      );
      headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
      headers.set("Access-Control-Allow-Origin", "*");
      headers.set("icy-name", "MONACO 98.7 FM");

      return new Response(upstream.body, {
        status: 200,
        headers
      });

    } catch (error) {
      clearTimeout(timer);
    }
  }

  return new Response(
    "No se pudo conectar con MONACO 98.7 FM.",
    {
      status: 502,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store"
      }
    }
  );
};
