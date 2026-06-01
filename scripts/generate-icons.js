// Generates PWA icons — barber pole design (red/white/blue diagonal stripes).
// Usage: node scripts/generate-icons.js
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c;
}
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function u32be(n) { const b = Buffer.alloc(4); b.writeUInt32BE(n, 0); return b; }
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  return Buffer.concat([u32be(data.length), t, data, u32be(crc32(Buffer.concat([t, data])))]);
}

function createIcon(size) {
  const BG     = [15, 23, 42];      // #0f172a Midnight background
  const RED    = [220, 38, 38];     // #dc2626
  const WHITE  = [248, 250, 252];   // #f8fafc
  const BLUE   = [37, 99, 235];     // #2563eb
  const SILVER = [226, 232, 240];   // #e2e8f0

  const stride = 1 + size * 4;
  const raw = Buffer.alloc(size * stride, 0);

  // Fill background
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0;
    for (let x = 0; x < size; x++) {
      const o = y * stride + 1 + x * 4;
      raw[o]=BG[0]; raw[o+1]=BG[1]; raw[o+2]=BG[2]; raw[o+3]=255;
    }
  }

  function setpx(x, y, r, g, b) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const o = y * stride + 1 + x * 4;
    raw[o]=r; raw[o+1]=g; raw[o+2]=b; raw[o+3]=255;
  }

  const cx    = size / 2;
  const halfW = size * 0.17;                    // pole half-width
  const top   = size * 0.13;                    // pole body top y
  const bot   = size * 0.88;                    // pole body bottom y
  const capR  = Math.max(2, size * 0.030);      // cap ellipse half-height
  const ballR = halfW * 0.78;                   // top ball radius

  // One full R→W→B stripe cycle height
  const period = size * 0.21;
  const sw     = period / 3;
  const STRIPES = [RED, WHITE, BLUE];

  // ── Pole body ──────────────────────────────────────────────────────────────
  for (let y = Math.floor(top); y <= Math.ceil(bot); y++) {
    for (let dxi = Math.floor(-halfW); dxi <= Math.ceil(halfW); dxi++) {
      const t = Math.abs(dxi) / halfW;
      if (t > 1) continue;

      // Diagonal "\" stripes: same stripe shifts lower as you go right
      const diag = ((y - top) + dxi * 0.7 + period * 999) % period;
      const norm = ((diag % period) + period) % period;
      const idx  = Math.floor(norm / sw) % 3;
      const base = STRIPES[idx];

      // Cylindrical shading: dark at edges
      const shade = 1 - t * t * 0.62;
      setpx(cx + dxi, y,
        Math.round(base[0] * shade),
        Math.round(base[1] * shade),
        Math.round(base[2] * shade),
      );
    }
  }

  // ── Silver ellipse caps (top & bottom) ────────────────────────────────────
  function drawCap(cy) {
    for (let dy = Math.floor(-capR); dy <= Math.ceil(capR); dy++) {
      for (let dxi = Math.floor(-halfW - 1); dxi <= Math.ceil(halfW + 1); dxi++) {
        if ((dxi / halfW) ** 2 + (dy / capR) ** 2 <= 1.0) {
          const shade = 1 - (Math.abs(dxi) / halfW) ** 2 * 0.45;
          setpx(cx + dxi, cy + dy,
            Math.round(SILVER[0] * shade),
            Math.round(SILVER[1] * shade),
            Math.round(SILVER[2] * shade),
          );
        }
      }
    }
  }
  drawCap(top);
  drawCap(bot);

  // ── Top ball ───────────────────────────────────────────────────────────────
  const ballCy = top - ballR * 0.65;
  for (let dy = Math.floor(-ballR); dy <= Math.ceil(ballR); dy++) {
    for (let dxi = Math.floor(-ballR); dxi <= Math.ceil(ballR); dxi++) {
      const dist = Math.sqrt(dxi * dxi + dy * dy);
      if (dist <= ballR) {
        const shade = 1 - (dist / ballR) ** 2 * 0.55;
        setpx(cx + dxi, Math.round(ballCy) + dy,
          Math.round(SILVER[0] * shade),
          Math.round(SILVER[1] * shade),
          Math.round(SILVER[2] * shade),
        );
      }
    }
  }

  // ── Assemble PNG ───────────────────────────────────────────────────────────
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8]=8; ihdr[9]=6; // 8-bit RGBA
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

for (const [size, name] of [[192,'icon-192.png'],[512,'icon-512.png'],[180,'apple-touch-icon.png']]) {
  const buf = createIcon(size);
  fs.writeFileSync(path.join(outDir, name), buf);
  console.log(`✓ ${name}  (${buf.length} bytes)`);
}
