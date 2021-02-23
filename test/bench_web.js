import GIF, { nearestImageData, quantize } from "../src/encoder";
// import quantize from "../src/nQuant2";
// import { nearest, colorSnap } from "../src/palettize";
import Color from "canvas-sketch-util/color";

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
  const { data, width, height } = await readImage("/test/fixtures/007.png");
  const pixels = getPixels(data);

  const hasAlpha = false;

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

  const uint32 = new Uint32Array(data.buffer);
  console.time("quantize");
  console.profile("quantize");
  for (let i = 0; i < 200; i++) {
    palette = quantize(uint32, width, height, 256);
  }
  console.profileEnd("quantize");
  console.timeEnd("quantize");

  index = nearestImageData(data, width, height, 4, palette);

  const gif = GIF();
  gif.writeHeader();
  gif.writeFrame(index, width, height, { first: true, palette });
  gif.finish();

  const blob = new Blob([gif.bytes()], { type: "image/gif" });
  const image = await loadImage(URL.createObjectURL(blob));
  image.style.width = "250px";
  image.style.height = "auto";
  document.body.appendChild(image);

  // const HSIZE = 5003;
  // const enc = LZWEncoder.exports.encode(
  //   4,
  //   2,
  //   new Uint8Array([0, 2, 1, 0, 0, 0, 1, 0]),
  //   8,
  //   new Uint8Array(256),
  //   new Int32Array(HSIZE),
  //   new Int32Array(HSIZE)
  // );
  // const arr = LZWEncoder.exports.__getUint8ArrayView(enc);
  // console.log(arr);

  // console.profile("encode");
  // console.time("encode");
  // for (let i = 0; i < 100; i++) {
  //   const buf = encode(indexImage);
  //   console.log(buf.length);
  // }
  // console.profileEnd("encode");
  // console.timeEnd("encode");
})();
