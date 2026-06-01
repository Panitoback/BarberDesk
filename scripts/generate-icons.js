// Generates PWA icons as PNG files using only Node.js built-ins (no extra packages).
// Usage: node scripts/generate-icons.js
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// CRC32 table (IEEE 802.3 polynomial)
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

// Generate a scissors icon on a dark background.
// Colors: bg=#0f172a (Midnight slate), fg=white
function createIcon(size) {
  const BG = [15, 23, 42, 255];
  const FG = [255, 255, 255, 255];

  // RGBA pixel buffer: 1 filter byte + 4 bytes/pixel per row
  const stride = 1 + size * 4;
  const raw = Buffer.alloc(size * stride, 0);

  // Fill background
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const o = y * stride + 1 + x * 4;
      raw[o]=BG[0]; raw[o+1]=BG[1]; raw[o+2]=BG[2]; raw[o+3]=BG[3];
    }
  }

  function px(x, y, c) {
    x=Math.round(x); y=Math.round(y);
    if (x<0||x>=size||y<0||y>=size) return;
    const o = y*stride+1+x*4;
    raw[o]=c[0]; raw[o+1]=c[1]; raw[o+2]=c[2]; raw[o+3]=c[3];
  }

  function line(x0,y0,x1,y1,w,c) {
    x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);
    const dx=Math.abs(x1-x0),dy=Math.abs(y1-y0);
    const sx=x0<x1?1:-1,sy=y0<y1?1:-1;
    let err=dx-dy,x=x0,y=y0;
    const t=Math.ceil(w/2);
    for(;;){
      for(let tx=-t;tx<=t;tx++) for(let ty=-t;ty<=t;ty++) px(x+tx,y+ty,c);
      if(x===x1&&y===y1) break;
      const e2=2*err;
      if(e2>-dy){err-=dy;x+=sx;}
      if(e2<dx){err+=dx;y+=sy;}
    }
  }

  function disk(cx,cy,r,c) {
    cx=Math.round(cx);cy=Math.round(cy);
    for(let dx=-r;dx<=r;dx++) for(let dy=-r;dy<=r;dy++)
      if(dx*dx+dy*dy<=r*r) px(cx+dx,cy+dy,c);
  }

  const cx=size/2, cy=size/2;
  const ext   = size * 0.29;
  const thick = Math.max(3, Math.floor(size * 0.065));
  const pivR  = Math.max(2, Math.floor(size * 0.085));
  const hndR  = Math.max(2, Math.floor(size * 0.07));

  // Two crossing blades (X)
  line(cx-ext,cy-ext, cx+ext,cy+ext, thick, FG);
  line(cx-ext,cy+ext, cx+ext,cy-ext, thick, FG);

  // Pivot: bg gap then white ring then bg hole
  disk(cx,cy, pivR+2, BG);
  disk(cx,cy, pivR,   FG);
  disk(cx,cy, Math.floor(pivR*0.52), BG);

  // Handle loops at each blade tip
  for (const [hx,hy] of [[cx-ext,cy-ext],[cx+ext,cy+ext],[cx-ext,cy+ext],[cx+ext,cy-ext]]) {
    disk(hx,hy, hndR,   FG);
    disk(hx,hy, Math.floor(hndR*0.48), BG);
  }

  // Assemble PNG
  const sig  = Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size,0); ihdr.writeUInt32BE(size,4);
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
