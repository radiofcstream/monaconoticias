import { getStore } from "@netlify/blobs";

const store = getStore("monaco-fm-content");
const key = "site-content.json";
const empty = { news: [], schedule: [] };
const json = (data, status=200) => new Response(JSON.stringify(data), {status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Access-Control-Allow-Origin":"*"}});
async function read(){return (await store.get(key,{type:"json"})) || structuredClone(empty)}
function authorized(body){const expected=process.env.MONACO_ADMIN_PASSWORD || "monaco2026";return typeof body.password==="string" && body.password===expected}
export default async (request) => {
  if(request.method==="OPTIONS") return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type"}});
  if(request.method==="GET"){const d=await read();return json({news:d.news||[],schedule:d.schedule||[]})}
  if(request.method!=="POST") return json({error:"Método no permitido"},405);
  let body;try{body=await request.json()}catch{return json({error:"Solicitud inválida"},400)}
  if(!authorized(body)) return json({error:"No autorizado"},401);
  const d=await read();d.news=d.news||[];d.schedule=d.schedule||[];
  switch(body.action){
    case "admin-list": return json(d);
    case "save-news": {
      const n=body.item;if(!n||!n.id||!n.title||!n.description)return json({error:"Completá título y descripción."},400);
      if(n.image && (!n.image.startsWith("data:image/") || n.image.length>4_300_000))return json({error:"Imagen inválida o demasiado grande (máximo 3 MB)."},400);
      const i=d.news.findIndex(x=>x.id===n.id);if(i>=0)d.news[i]=n;else d.news.push(n);break;
    }
    case "delete-news": d.news=d.news.filter(x=>x.id!==body.id);break;
    case "save-schedule": {const p=body.item;if(!p||!p.id||!/^([01]\\d|2[0-3]):[0-5]\\d$/.test(p.time)||!p.title)return json({error:"Completá hora y título."},400);const i=d.schedule.findIndex(x=>x.id===p.id);if(i>=0)d.schedule[i]=p;else d.schedule.push(p);break;}
    case "delete-schedule": d.schedule=d.schedule.filter(x=>x.id!==body.id);break;
    default:return json({error:"Acción desconocida"},400);
  }
  await store.setJSON(key,d);return json({ok:true});
};
