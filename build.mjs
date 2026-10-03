import {readFile,writeFile,mkdir} from 'node:fs/promises';
const root=new URL('./',import.meta.url);
const logo=(await readFile(new URL('assets/logo.txt',root),'utf8')).trim();
const [body,css,rawJs]=await Promise.all(['body.html','style.css','app.js'].map(p=>readFile(new URL(p,root),'utf8')));
let js=rawJs;
for(const [key,file] of [['ASA','asa.png'],['SHOP','shop.png'],['HEADS','heads.png'],['CHEEZIOUS','cheezious.png']]){
 const bytes=await readFile(new URL('assets/'+file,root));
 const mime=bytes[0]===255?'image/jpeg':'image/png';
 js=js.replaceAll('__'+key+'__','data:'+mime+';base64,'+bytes.toString('base64'));
}
const markup=body.replaceAll('__LOGO__',logo);
const libs='<script src="https://unpkg.com/three@0.128.0/build/three.min.js"></script><script src="https://unpkg.com/lucide@0.468.0/dist/umd/lucide.min.js"></script>';
const embed=`<style>${css}</style>${markup}${libs}<script>${js}</script>`;
await writeFile(new URL('systeme-embed.html',root),embed);
await writeFile(new URL('index.html',root),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Chishty Productions | Web & Mobile Development</title><meta name="description" content="Websites, mobile web apps and interactive experiences by Adil Amin Chishty. Explore Chishty Productions projects."><style>html{scroll-behavior:smooth}body{margin:0;background:#100c16}</style></head><body>${embed}</body></html>`);
const integration=`<style>body{margin:0!important;background:#100c16!important}body.cp-dev-ready #app>div{display:none!important}#cp-dev-host{width:100%;position:relative;z-index:2}html{scroll-behavior:smooth}</style><script>(function(){function mount(){if(document.getElementById('cp-dev-host'))return;var host=document.createElement('div');host.id='cp-dev-host';host.innerHTML=${JSON.stringify('<style>'+css+'</style>'+markup)};document.body.appendChild(host);document.body.classList.add('cp-dev-ready');var script=document.createElement('script');script.textContent=${JSON.stringify(js)};host.appendChild(script);}function load(src){return new Promise(function(resolve,reject){var s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});}function start(){mount();load('https://unpkg.com/lucide@0.468.0/dist/umd/lucide.min.js').then(function(){if(window.lucide)window.lucide.createIcons();}).catch(function(){});load('https://cdnjs.cloudflare.com/ajax/libs/three.js/0.128.0/three.min.js').then(function(){window.cpDevInitScene&&window.cpDevInitScene();}).catch(function(){});}if(document.readyState==='complete')start();else window.addEventListener('load',start,{once:true});})();</script>`;
await writeFile(new URL('systeme-footer.html',root),integration.replaceAll('https://cdnjs.cloudflare.com/ajax/libs/three.js/0.128.0/three.min.js','https://unpkg.com/three@0.128.0/build/three.min.js'));
await mkdir(new URL('assets/',root),{recursive:true});
console.log('Built standalone preview and Systeme.io integration.');
