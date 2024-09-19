const path = require("path");
const { promisify } = require("util");
const getPixels = promisify(require("get-pixels"));
const fs = require("fs");

// NOTE: Uses the built version, not source!
const { GIFEncoder, quantize, applyPalette } = require("../dist/gifenc");

const N = 3;

// function createColorCube (steps=16) {
//   const colors = [];
//   for (let r = 0; r < 256; r += steps) {
//     for (let g = 0; g < 256; g += steps) {
//       for (let b = 0; b < 256; b += steps) {
//         const color = [ r, g, b ];
//         colors.push(color);
//       }
//     }
//   }
//   const channels = 4;
//   const width = colors.length;
//   const height = 1;
//   const data = new Uint8ClampedArray(width*height*channels);
//   for (let x = 0; x < colors.length; x++) {
//     const [ r, g, b ] = colors[x];
//     data[x * 4 + 0] = r;
//     data[x * 4 + 1] = g;
//     data[x * 4 + 2] = b;
//     data[x * 4 + 3] = 0xff;
//   }
//   return data;
// }

(async () => {
  // Load width/height + RGBA uint8 array data
  const { data, width, height } = await readImage(
    path.resolve(__dirname, "fixtures/baboon.png")
  );


  // const rgba = new Uint8ClampedArray([50,128,15,255]);
  // const rgba = createColorCube(16);
  // console.time('test')
  // const size = rgba.length/4;
  // let sqr = 0;
  // const data32 = new Uint32Array(rgba.buffer)
  // const dv = new DataView(rgba.buffer)
  // for (let n = 0; n < 400000; n++) {
  //   let sum = 0;
  //   for (let j = 0; j < size; j++) {
  //     const color = dv.getUint32(j*4,true);
  //     const b = (color >> 16) & 0xff;
  //     const g = (color >> 8) & 0xff;
  //     const r = color & 0xff;

  //     // let ptr = j*4;
  //     // const r = dv.getUint8(ptr++)
  //     // const g = dv.getUint8(ptr++)
  //     // const b = dv.getUint8(ptr)

  //     // const color = data32[j];
  //     // const b = (color >> 16) & 0xff;
  //     // const g = (color >> 8) & 0xff;
  //     // const r = color & 0xff;

  //     // const r = rgba[j * 4]
  //     // const g = rgba[j * 4 + 1]
  //     // const b = rgba[j * 4 + 2]
  //     sum += r * 5 + g * 2 + b * 4 + n * 2;
  //   }
  //   sum /= size;
  //   sqr += sum * n;
  // }
  // console.log(sqr)
  // // console.log(dv.getUint32(0,true))
  // // console.log(data32[0])
  // console.timeEnd('test')

  const format = 'rgb565';
  bench_quantize(data, format);

  // const palette = quantize(data, 256, { format })
  // bench_palette(data, palette, format);

  // const index = applyPalette(data, palette, format);
  // bench_encode(index, width, height, palette);
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
