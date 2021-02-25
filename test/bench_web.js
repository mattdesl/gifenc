import Color from "canvas-sketch-util/color";

import {
  GIFEncoder,
  applyPalette,
  prequantize,
  colorSnap,
  findTransparentIndex,
  quantize,
} from "../src";

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

function getPixels(rgba, alpha = true) {
  const pixels = [];
  for (let i = 0; i < rgba.length / 4; i++) {
    const r = rgba[i * 4 + 0];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    const a = rgba[i * 4 + 3];
    pixels.push(alpha ? [r, g, b, a] : [r, g, b]);
  }
  return pixels;
}

(async () => {
  const { data, width, height } = await readImage(
    "/test/fixtures/007-transparent.png"
  );
  // const pixels = getPixels(data);

  // const hasAlpha = false;

  // console.time("quantize");
  // console.profile("quantize");
  // for (let i = 0; i < 100; i++) {
  //   const palette = quantize(pixels, 256, hasAlpha);
  //   console.log(palette.length);
  // }
  // console.profileEnd();
  // console.timeEnd("quantize");

  // console.time("palettize");
  const knownColors = [
    "#FF7F55",
    "#FF5631",
    "#0A11E6",
    "#FF8659",
    "#FFDE5D",
    "#FFD984",
  ].map((hex) => {
    return Color.parse(hex).rgb;
  });

  let palette;
  let index;
  let buf1;

  const format = "rgba4444";
  const uint32 = new Uint32Array(data.buffer);

  // with GIF we have 1-bit alpha so we can clear that
  prequantize(uint32, { roundRGB: 1, oneBitAlpha: true });
  palette = quantize(uint32, 256, { format, oneBitAlpha: true });
  // optionally snap colors to known palette
  colorSnap(palette, knownColors);

  console.time("quantize");
  console.profile("quantize");
  // palettization is always done in RGB only space
  // since we are dealing with GIF which has 1-bit alpha
  index = applyPalette(
    uint32,
    palette,
    format === "rgb565" ? format : "rgb444"
  );
  console.profileEnd("quantize");
  console.timeEnd("quantize");

  const gif = GIFEncoder();
  gif.writeFrame(index, width, height, {
    // 1-bit alpha based on alpha channel
    transparent: format === "rgba4444",
    transparentIndex: findTransparentIndex(palette),

    // replace a color with transparency
    // this tends to blend better
    // transparent: true,
    // transparentIndex: nearestColorIndex([0, 0, 0], palette),
    palette,
  });
  gif.finish();

  const blob = new Blob([gif.bytes()], { type: "image/gif" });
  const image = await loadImage(URL.createObjectURL(blob));
  image.style.width = "25%";
  image.style.height = "auto";
  document.body.appendChild(image);
})();
