import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const output = 'dist';
const publicEntries = [
  '404.html', 'index.html', 'manifest.json', 'LICENSE', 'README.md', 'VISION.md',
  'assets', 'characters', 'components', 'fonts', 'icons', 'lib', 'moments'
];
const imageDirectory = 'optimized-images';
const r2Images = /https:\/\/pub-9466bb5132e74aeba333004ad0c21f21\.r2\.dev\/[^"'\s<>)]+?\.(?:png|jpe?g)(?=["'\s<>)?#]|$)/gi;
const rasterImage = /\.(png|jpe?g)$/i;

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const results = await Promise.all(entries.map(entry => {
    const name = directory + '/' + entry.name;
    return entry.isDirectory() ? listFiles(name) : name;
  }));
  return results.flat();
}

async function collectImages(files) {
  const sources = files.filter(name => rasterImage.test(name))
    .map(name => ({ key: '/' + name, file: name }));
  const references = await Promise.all(
    files.filter(name => /\.(?:js|json)$|\/content\.html$/.test(name))
      .map(async name => (await readFile(name, 'utf8')).match(r2Images) || [])
  );
  const remote = [...new Set(references.flat())].sort();
  return sources.concat(remote.map(key => ({ key })));
}

async function optimizeImage({ key, file }) {
  let input;
  let size;
  if (file) {
    size = (await stat(file)).size;
    if (size < 32_768) return null;
    input = file;
  } else {
    const response = await fetch(key, { signal: AbortSignal.timeout(12_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    input = Buffer.from(await response.arrayBuffer());
    size = input.length;
    if (size < 32_768) return null;
  }

  const webp = await sharp(input, { animated: true })
    .autoOrient()
    .webp({ quality: 88, effort: 4 })
    .toBuffer();
  if (webp.length >= size * 0.9) return null;

  const hash = createHash('sha256').update(webp).digest('hex').slice(0, 24);
  const destination = `/${imageDirectory}/${hash}.webp`;
  await writeFile(path.join(output, destination), webp);
  return { key, destination, bytesSaved: size - webp.length };
}

await rm(output, { recursive: true, force: true });
await mkdir(path.join(output, imageDirectory), { recursive: true });
await Promise.all(publicEntries.map(entry => cp(entry, path.join(output, entry), { recursive: true })));

const files = (await Promise.all(['assets', 'characters', 'components', 'moments'].map(listFiles))).flat().sort();
const sources = await collectImages(files);
const results = new Array(sources.length);
let next = 0;
const unavailable = [];
await Promise.all(Array.from({ length: 8 }, async () => {
  while (next < sources.length) {
    const index = next++;
    const source = sources[index];
    try {
      results[index] = await optimizeImage(source);
    } catch (error) {
      if (source.file) throw error;
      unavailable.push(`${source.key} (${error.message})`);
    }
  }
}));

const optimized = results.filter(Boolean);
const images = Object.fromEntries(optimized.map(({ key, destination }) => [key, destination]));
const scriptPath = path.join(output, 'lib/basePath.js');
const script = `window.optimizedImages = ${JSON.stringify(images)};\n${await readFile(scriptPath, 'utf8')}`;
const version = createHash('sha256').update(script).digest('hex').slice(0, 12);
await writeFile(scriptPath, script);

const indexPath = path.join(output, 'index.html');
const html = await readFile(indexPath, 'utf8');
await writeFile(indexPath, html.replace(/lib\/basePath\.js\?v=[^"]+/, `lib/basePath.js?v=${version}`));

const bytesSaved = optimized.reduce((total, asset) => total + asset.bytesSaved, 0);
console.log(`Generated WebP references for ${optimized.length} images, saving ${(bytesSaved / 1e6).toFixed(1)} MB across their URLs.`);
if (unavailable.length) {
  console.warn(`Using original URLs for ${unavailable.length} unavailable R2 images:\n${unavailable.sort().join('\n')}`);
}
