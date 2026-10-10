import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const directory = path.resolve('dist');
let html = await readFile(path.join(directory, 'index.html'), 'utf8');
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
for (const [tag, src] of scripts) {
  const code = await readFile(path.resolve(directory, src), 'utf8');
  html = html.replace(tag, () => `<script type="module">${code.replace(/<\/script/gi, '<\\/script')}</script>`);
}
const markup = html.replace(/(<script\b[^>]*>)[\s\S]*?<\/script>/g, '$1</script>').replace(/<style>[\s\S]*?<\/style>/g, '');
if (/<script\b[^>]*src=|<link\b[^>]*rel="stylesheet"/.test(markup)) throw new Error('Standalone output still references build files');
await mkdir('kiadas', { recursive: true });
await writeFile('kiadas/tulelo-jatek.html', html);
console.log(`Standalone browser game: kiadas/tulelo-jatek.html (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(1)} MiB)`);
