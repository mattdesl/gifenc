import {
  GIFEncoder,
  applyPalette,
  quantize
} from "../src/index.js";

async function readImage(url) {
  const img = await loadImage(url);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const context = canvas.getContext("2d");
  context.drawImage(img, 0, 0);
  return context.getImageData(0, 0, img.width, img.height);
}

async function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load image ${url}`));
    img.src = url;
  });
}

const N = 100;

(async () => {
  const { data, width, height } = await readImage(
    "/test/fixtures/007-transparent.png"
  );

  // Wrap your RGBA uint8array into a uint32 array
  const uint32 = new Uint32Array(data.buffer);
  const format = 'rgb444';

  bench_quantize(uint32, format);

  const palette = quantize(uint32, 256, { format })
  bench_palette(uint32, palette, format);

  const index = applyPalette(uint32, palette, format);
  bench_encode(index, width, height, palette);
})();

async function bench_quantize(uint32, format) {
  console.time('quantize');
  console.profile('quantize');
  let palette;
  for (let i = 0; i < N; i++) {
    palette = quantize(uint32, 256, { format });
  }
  console.profileEnd('quantize');
  console.timeEnd('quantize');
}

async function bench_palette(uint32, palette, format) {
  console.time('applyPalette');
  console.profile('applyPalette');
  let index;
  for (let i = 0; i < N; i++) {
    index = applyPalette(uint32, palette, format);
  }
  console.profileEnd('applyPalette');
  console.timeEnd('applyPalette');
}

async function bench_encode(index, width, height, palette, format) {
  console.time('encode');
  console.profile('encode');
  let encoder;
  for (let i = 0; i < N; i++) {
    encoder = GIFEncoder({ auto: false });
    encoder.writeFrame(index, width, height, { palette });
  }
  console.profileEnd('encode');
  console.timeEnd('encode');
}
