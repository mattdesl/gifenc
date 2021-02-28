const path = require("path");
const { promisify } = require("util");
const getPixels = promisify(require("get-pixels"));
const fs = require("fs");

// NOTE: Uses the built version, not source!
const { GIFEncoder, quantize, applyPalette } = require("../dist/gifenc");

const N = 100;

(async () => {
  // Load width/height + RGBA uint8 array data
  const { data, width, height } = await readImage(
    path.resolve(__dirname, "fixtures/baboon.png")
  );

  const format = 'rgb444';

  bench_quantize(data, format);

  const palette = quantize(data, 256, { format })
  bench_palette(data, palette, format);

  const index = applyPalette(data, palette, format);
  bench_encode(index, width, height, palette);
})();

async function bench_quantize(data, format) {
  console.log('Quantization')
  console.time('time');
  let palette;
  for (let i = 0; i < N; i++) {
    palette = quantize(data, 256, { format });
  }
  console.timeEnd('time');
}

async function bench_palette(data, palette, format) {
  console.log('Palettization')
  console.time('time');
  let index;
  for (let i = 0; i < N; i++) {
    index = applyPalette(data, palette, format);
  }
  console.timeEnd('time');
}

async function bench_encode(index, width, height, palette, format) {
  console.log('Encode')
  console.time('time');
  let encoder;
  for (let i = 0; i < N; i++) {
    encoder = GIFEncoder({ auto: false });
    encoder.writeFrame(index, width, height, { palette });
  }
  console.timeEnd('time');
}

async function readImage(file) {
  const { data, shape } = await getPixels(file);
  let width, height;
  if (shape.length === 3) {
    // PNG,JPG,etc...
    width = shape[0];
    height = shape[1];
  } else if (shape.length === 4) {
    // still GIFs might appear in frames, so [N,w,h]
    width = shape[1];
    height = shape[2];
  } else {
    throw new Error("Invalid shape " + shape.join(", "));
  }
  return { data, width, height };
}
