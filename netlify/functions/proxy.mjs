export default async () => {
  const sources = [
    "http://uk2freenew.listen2myradio.com:29986/stream",
    "http://88.150.230.110:29986/stream"
  ];
  let lastError;
  for (const source of sources) {
    try {
      const upstream = await fetch(source, {headers:{"Icy-MetaData":"0"}, signal:AbortSignal.timeout(12000)});
      if (!upstream.ok || !upstream.body) { lastError = new Error(`Origen respondió ${upstream.status}`); continue; }
      const headers = new Headers();
      headers.set("Content-Type",upstream.headers.get("content-type") || "audio/mpeg");
      headers.set("Cache-Control","no-store, no-cache, must-revalidate");
      headers.set("Access-Control-Allow-Origin","*");
      headers.set("icy-name","MONACO 98.7 FM");
      return new Response(upstream.body,{status:200,headers});
    } catch (e) { lastError=e; }
  }
  return new Response("No se pudo conectar con la transmisión de MONACO FM. Verificá el servidor de origen.",{status:502,headers:{"Content-Type":"text/plain; charset=utf-8","Access-Control-Allow-Origin":"*","Cache-Control":"no-store"}});
};
