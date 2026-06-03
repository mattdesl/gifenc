import * as path from "path";
import { promisify } from "util";
import { writeFile } from "fs/promises";
import getPixelsCb from "get-pixels";
import { GIFEncoder, quantize, applyPalette } from "../src/index.js";

const getPixels = promisify(getPixelsCb);
const __dirname = import.meta.dirname;

encode();

async function encode() {
  const { data, width, height } = await readImage(
    path.resolve(__dirname, "fixtures/baboon.png"),
  );

  const format = "rgb565";
  const palette = quantize(data, 64, { format });

  const plainIndex = applyPalette(data, palette, { format });
  const ditheredIndex = applyPalette(data, palette, {
    format,
    dither: "floyd-steinberg",
    width,
    height,
  });

  await writeGif(
    plainIndex,
    width,
    height,
    palette,
    path.resolve(__dirname, "output/test-plain-64.gif"),
  );
  await writeGif(
    ditheredIndex,
    width,
    height,
    palette,
    path.resolve(__dirname, "output/test-dither-64.gif"),
  );
}

async function writeGif(index, width, height, palette, file) {
  const gif = GIFEncoder();
  gif.writeFrame(index, width, height, { palette });
  gif.finish();
  await writeFile(file, Buffer.from(gif.bytes()));
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
