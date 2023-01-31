import {
  rgb888_to_rgb444,
  rgb888_to_rgb565,
  rgba8888_to_rgba4444,
  nearestColorIndexRGB,
  nearestColorIndexRGBA,
} from "./util.js";

export default function dither(pixels, width, height, palette, format, kernel) {
  const data = new Uint8ClampedArray(pixels);
  const view = new Uint32Array(data.buffer);
  const length = view.length;
  const index = new Uint8Array(length);
  const bincount = format === "rgb444" ? 4096 : 65536;
  const cache = new Array(bincount);
  const error = [0, 0, 0];
  const rgb888_to_key =
    format === "rgb444" ? rgb888_to_rgb444 : rgb888_to_rgb565;

  // Floyd-Steinberg kernel
  kernel = kernel || [
    [7 / 16, 1, 0],
    [3 / 16, -1, 1],
    [5 / 16, 0, 1],
    [1 / 16, 1, 1],
  ];

  const palette32 = palette.map((rgba) => {
    const r = rgba[0];
    const g = rgba[1];
    const b = rgba[2];
    const a = rgba.length === 4 ? rgba[3] : 0xff;
    return (a << 24) | (b << 16) | (g << 8) | r;
  });

  const hasAlpha = format === "rgba4444";

  for (let i = 0; i < length; i++) {
    // get pixel x, y
    const x = Math.floor(i % width);
    const y = Math.floor(i / width);

    // get pixel r,g,b
    const color = view[i];

    // get a pixel index
    let idx;
    let r, g, b;

    if (hasAlpha) {
      a = (color >> 24) & 0xff;
      b = (color >> 16) & 0xff;
      g = (color >> 8) & 0xff;
      r = color & 0xff;
      const key = rgba8888_to_rgba4444(r, g, b, a);
      idx =
        key in cache
          ? cache[key]
          : (cache[key] = nearestColorIndexRGBA(r, g, b, a, palette));
    } else {
      b = (color >> 16) & 0xff;
      g = (color >> 8) & 0xff;
      r = color & 0xff;
      const key = rgb888_to_key(r, g, b);
      idx =
        key in cache
          ? cache[key]
          : (cache[key] = nearestColorIndexRGB(r, g, b, palette));
    }

    // the palette index for this pixel is now set
    index[i] = idx;

    const newRGB = palette[idx];

    // compute error from target
    error[0] = r - newRGB[0];
    error[1] = g - newRGB[1];
    error[2] = b - newRGB[2];

    // assign paletted colour to view
    view[i] = palette32[idx];

    // diffuse error to other pixels
    for (let i = 0; i < kernel.length; i++) {
      const K = kernel[i];
      const kx = K[1] + x;
      const ky = K[2] + y;
      if (kx >= 0 && kx < width && ky >= 0 && ky < height) {
        const kidx = (kx + ky * width) * 4;
        const diffusion = K[0];
        for (let c = 0; c < 3; c++) {
          const dst = c + kidx;
          data[dst] = data[dst] + error[c] * diffusion;
        }
      }
    }
  }
  return index;
}
