// Note: Uses source version, not built version!
import {
  GIFEncoder,
  applyPalette,
  quantize
} from "../src/index.js";

const N = 100;

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

(async () => {
  const { data, width, height } = await readImage(
    "/test/fixtures/007-transparent.png"
  );

  const format = 'rgb444';

  bench_quantize(data, format);

  const palette = quantize(data, 256, { format })
  bench_palette(data, palette, format);

  const index = applyPalette(data, palette, format);
  bench_encode(index, width, height, palette);
})();

async function bench_quantize(rgba, format) {
  console.time('quantize');
  console.profile('quantize');
  let palette;
  for (let i = 0; i < N; i++) {
    palette = quantize(rgba, 256, { format });
  }
  console.profileEnd('quantize');
  console.timeEnd('quantize');
}

async function bench_palette(data, palette, format) {
  console.time('applyPalette');
  console.profile('applyPalette');
  let index;
  for (let i = 0; i < N; i++) {
    index = applyPalette(data, palette, format);
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
