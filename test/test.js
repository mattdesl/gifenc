const test = require('tape');

const { GIFEncoder, quantize, applyPalette } = require("../dist/gifenc");

function createColorCube (steps=16) {
  const colors = [];
  for (let r = 0; r < 256; r += steps) {
    for (let g = 0; g < 256; g += steps) {
      for (let b = 0; b < 256; b += steps) {
        const color = [ r, g, b ];
        colors.push(color);
      }
    }
  }
  const channels = 4;
  const width = colors.length;
  const height = 1;
  const data = new Uint8ClampedArray(width*height*channels);
  for (let x = 0; x < colors.length; x++) {
    const [ r, g, b ] = colors[x];
    data[x * 4 + 0] = r;
    data[x * 4 + 1] = g;
    data[x * 4 + 2] = b;
    data[x * 4 + 3] = 0xff;
  }
  return data;
}

test('should quantize palette', t => {
  
  // // const rgb = hex_to_rgb('#fffb00')
  // const rgb = [ 6, 128,3, 12 ];

  // const color = rgba_to_uint32(...rgb)
  // console.log(rgb);
  // console.log(dec2bin(color, 32));
  // console.log(uint32_to_rgba(color));

  // console.log(rgb)
  // console.log(uint32_to_rgba(rgba_to_uint32(...[...rgb, 0xff])))

  // console.log(rgb888_to_rgb444(...rgb))
  // console.log(rgb888_to_rgb565(...rgb))
  const colors = createColorCube(16);

  const result = quantize(colors, 5, { format: 'rgb444' });
  console.log(result)

  t.end();
})