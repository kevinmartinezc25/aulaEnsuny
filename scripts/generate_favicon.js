const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

function createIcoFromPngs(pngBuffers, sizes) {
  const count = pngBuffers.length;
  // Header: 6 bytes
  // Directory entries: 16 bytes each
  let offset = 6 + (16 * count);

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(count, 4); // Number of images

  const entries = [];
  for (let i = 0; i < count; i++) {
    const size = sizes[i];
    const buf = pngBuffers[i];
    const entry = Buffer.alloc(16);

    entry.writeUInt8(size >= 256 ? 0 : size, 0); // Width
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // Height
    entry.writeUInt8(0, 2); // Colors in palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(buf.length, 8); // Size of image data
    entry.writeUInt32LE(offset, 12); // Offset of image data

    offset += buf.length;
    entries.push(entry);
  }

  return Buffer.concat([header, ...entries, ...pngBuffers]);
}

async function generateFavicon() {
  const svgPath = path.join(__dirname, '../src/app/icon.svg');
  const svgBuffer = fs.readFileSync(svgPath);

  const sizes = [16, 32, 48, 64, 128, 256];
  const pngBuffers = [];

  for (const size of sizes) {
    const buf = await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toBuffer();
    pngBuffers.push(buf);
  }

  const icoBuffer = createIcoFromPngs(pngBuffers, sizes);

  const publicFavicon = path.join(__dirname, '../public/favicon.ico');
  const appFavicon = path.join(__dirname, '../src/app/favicon.ico');

  fs.writeFileSync(publicFavicon, icoBuffer);
  fs.writeFileSync(appFavicon, icoBuffer);

  console.log('favicon.ico actualizado con éxito en public/ y src/app/ con el nuevo logo institucional.');
}

generateFavicon().catch(err => {
  console.error('Error generando favicon:', err);
  process.exit(1);
});
