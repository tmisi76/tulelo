import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { zipSync, strToU8 } from 'fflate';

const directory = path.resolve('dist');
let html = await readFile(path.join(directory, 'index.html'), 'utf8');
html = html.replace('data-entry="development"', 'data-entry="standalone"');
const styles = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)];
for (const [tag] of styles) {
  const href = tag.match(/href="([^"]+)"/)?.[1];
  if (!href) throw new Error('Missing stylesheet asset');
  const file = path.resolve(directory, href);
  let css = await readFile(file, 'utf8');
  const urls = [...css.matchAll(/url\((?:["'])?([^)'"\s]+)(?:["'])?\)/g)];
  for (const [expression, url] of urls) {
    if (url.startsWith('data:') || url.startsWith('https:')) continue;
    const asset = path.resolve(path.dirname(file), url);
    const bytes = await readFile(asset);
    const mime = asset.endsWith('.png') ? 'image/png' : asset.endsWith('.svg') ? 'image/svg+xml' : 'application/octet-stream';
    css = css.replace(expression, `url("data:${mime};base64,${bytes.toString('base64')}")`);
  }
  html = html.replace(tag, () => `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>`);
}
const scripts = [...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g)];
const bundles = [];
for (const [tag, src] of scripts) {
  const code = await readFile(path.resolve(directory, src), 'utf8');
  // The single Vite bundle has no imports. A strict IIFE also works as a local
  // classic script; place it after #app rather than executing it in the head.
  const standaloneCode = `;(function () { "use strict";\n${code}\n})();`;
  new vm.Script(standaloneCode, { filename: 'tulelo-game-bundle.js' });
  bundles.push(`<script data-game-bundle>${standaloneCode.replace(/<\/script/gi, '<\\/script')}</script>`);
  html = html.replace(tag, '<!-- Game bundle is embedded after the page content. -->');
}
if (bundles.length !== 1) throw new Error('Standalone distribution requires one complete game bundle');
html = html.replace('</body>', () => `${bundles.join('\n')}\n</body>`);
const markup = html.replace(/(<script\b[^>]*>)[\s\S]*?<\/script>/g, '$1</script>').replace(/<style>[\s\S]*?<\/style>/g, '');
if (/<script\b[^>]*src=|<link\b[^>]*rel="stylesheet"/.test(markup)) throw new Error('Standalone output still references build files');
await mkdir('kiadas', { recursive: true });
await writeFile('kiadas/tulelo-jatek.html', html);
const instructions = `TÚLÉLŐ — AZ UTOLSÓ MENEDÉK\n\nCsomagold ki a ZIP-et, majd nyisd meg az index.html fájlt Chrome vagy Edge böngészőben.\nNem kell telepítés, szerver vagy internetkapcsolat.\n\nWASD / kattintás: mozgás\nE: beszélgetés és gyűjtés\nF: támadás\n1–6: képességek\nSzóköz: szünet\nI: táska; C: karakter; J: napló; M: térkép; Esc: menü\n\nElsőként keresd meg Marát a falu főterén.\nA kalandot a menüben fájlba is elmentheted.\n`;
const archive = zipSync({ 'index.html': strToU8(html), 'OLVASS_EL.txt': strToU8(instructions) }, { level: 6 });
await writeFile('kiadas/tulelo-kiprobalas.zip', archive);
console.log(`Standalone browser game: kiadas/tulelo-jatek.html (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(1)} MiB)`);
console.log(`Player download: kiadas/tulelo-kiprobalas.zip (${(archive.byteLength / 1024 / 1024).toFixed(1)} MiB)`);
