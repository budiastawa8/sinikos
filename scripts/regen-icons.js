const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const dir = path.join(__dirname, "..", "public", "icons");
const BG = "#0d5c56";

/** pathScale < 1 → logo lebih kecil di kanvas (aman untuk splash / maskable). */
function svgFor(size, pathScale) {
  const s = pathScale;
  const tx = 256 * (1 - s);
  const ty = 256 * (1 - s);
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${BG}"/>
  <g transform="translate(${tx} ${ty}) scale(${s})">
    <path fill="none" stroke="#ffffff" stroke-width="54" stroke-linecap="butt" stroke-linejoin="miter"
      d="M 348 198 L 256 96 L 164 198 L 164 268 L 320 268 L 320 400 L 176 400 L 176 348"/>
  </g>
</svg>`);
}

async function write(size, pathScale, out) {
  await sharp(svgFor(size, pathScale)).png().toFile(path.join(dir, out));
  console.log("wrote", out, "scale", pathScale);
}

(async () => {
  await write(512, 0.64, "icon-512.png");
  await write(192, 0.64, "icon-192.png");
  await write(180, 0.64, "apple-touch-icon.png");
  await write(512, 0.55, "icon-maskable-512.png");
  await write(32, 0.72, "favicon-32.png");
  await write(16, 0.72, "favicon-16.png");

  fs.writeFileSync(
    path.join(dir, "icon.svg"),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="SiniKos">
  <rect width="512" height="512" fill="${BG}"/>
  <g transform="translate(92.16 92.16) scale(0.64)">
    <path fill="none" stroke="#ffffff" stroke-width="54" stroke-linecap="butt" stroke-linejoin="miter"
      d="M 348 198 L 256 96 L 164 198 L 164 268 L 320 268 L 320 400 L 176 400 L 176 348"/>
  </g>
</svg>
`,
  );
  console.log("wrote icon.svg");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
