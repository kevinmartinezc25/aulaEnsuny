const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function generateIcons() {
  const svgPath = path.join(__dirname, '../src/app/icon.svg');
  const outDir = path.join(__dirname, '../public/icons');

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const svgBuffer = fs.readFileSync(svgPath);

  // 1. Icono estándar 192x192
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(outDir, 'icon-192x192.png'));

  // 2. Icono estándar 512x512
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(outDir, 'icon-512x512.png'));

  // 3. Apple Touch Icon 180x180
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(outDir, 'apple-touch-icon.png'));

  // 4. Maskable Icons (con safe-padding para que el recorte de Android no corte los bordes)
  // En maskable: 192x192 con el squircle escalado al 80% centrado sobre fondo transparente o extendido
  const maskableSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
      <defs>
        <linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#10B981" />
          <stop offset="100%" stop-color="#1F4E31" />
        </linearGradient>
      </defs>
      <!-- Background fill for full maskable coverage -->
      <rect width="100" height="100" fill="url(#greenGrad)" />
      <!-- Centered emblem -->
      <g transform="translate(25, 25) scale(2.0)" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </g>
    </svg>
  `;

  await sharp(Buffer.from(maskableSvg))
    .resize(192, 192)
    .png()
    .toFile(path.join(outDir, 'icon-maskable-192x192.png'));

  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(outDir, 'icon-maskable-512x512.png'));

  console.log('Todos los iconos oficiales de aulaEnsuny generados con éxito usando sharp.');
}

generateIcons().catch(err => {
  console.error('Error al generar iconos:', err);
  process.exit(1);
});
