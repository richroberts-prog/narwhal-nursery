// One self-contained HTML file from dist/, to send or open straight from a tablet's files.
import { readFileSync, writeFileSync } from 'node:fs';
let html = readFileSync('dist/index.html', 'utf8');
html = html.replace(/<script type="module" crossorigin src="\.\/(assets\/[^"]+\.js)"><\/script>/, (_, p) => `<script type="module">${readFileSync(`dist/${p}`, 'utf8').replaceAll('</script', '<\\/script')}</script>`);
html = html.replace(/<link rel="stylesheet" crossorigin href="\.\/(assets\/[^"]+\.css)">/, (_, p) => `<style>${readFileSync(`dist/${p}`, 'utf8')}</style>`);
if (/src="\.\/assets|href="\.\/assets/.test(html)) throw new Error('an asset was not inlined');
writeFileSync('dist/narwhal-nursery.html', html);
console.log('dist/narwhal-nursery.html', html.length, 'bytes');
