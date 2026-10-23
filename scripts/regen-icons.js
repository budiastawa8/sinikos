const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const dir = path.join(__dirname, "..", "public", "icons");
/** Sumber final dari pemilik — simetris, sudah ada padding. */
const SOURCE = path.join(dir, "icon-chosen.png");
const BG = { r: 0, g: 95, b: 95, alpha: 1 }; // ~#005f5f

async function squareFromSource(size, scale, out) {
  // scale: porsi kanvas yang diisi sumber (1 = full). <1 = ekstra padding (maskable).
  const inner = Math.round(size * scale);
  const logo = await sharp(SOURCE)
    .flatten({ background: BG })
    .resize(inner, inner, { fit: "cover" })
    .png()
    .toBuffer();

  await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: logo, gravity: "centre" }])
    .png()
    .toFile(path.join(dir, out));

  console.log("wrote", out, "scale", scale);
}

(async () => {
  if (!fs.existsSync(SOURCE)) {
    console.error("Missing", SOURCE);
    process.exit(1);
  }

  await squareFromSource(512, 1, "icon-512.png");
  await squareFromSource(192, 1, "icon-192.png");
  await squareFromSource(180, 1, "apple-touch-icon.png");
  // Maskable: sedikit lebih kecil agar aman di crop sistem
  await squareFromSource(512, 0.88, "icon-maskable-512.png");
  await squareFromSource(32, 1, "favicon-32.png");
  await squareFromSource(16, 1, "favicon-16.png");

  // SVG tidak dipakai sebagai sumber; arahkan ke PNG agar tidak menyesatkan.
  fs.writeFileSync(
    path.join(dir, "icon.svg"),
    `<!-- SiniKos mark: gunakan icon-chosen.png / icon-512.png sebagai sumber kebenaran.
     Jalankan: npm run icons:regen setelah mengganti icon-chosen.png -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="SiniKos">
  <image href="/icons/icon-512.png" width="512" height="512"/>
</svg>
`,
  );
  console.log("wrote icon.svg (references PNG)");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
