import getPixelsCb from "get-pixels";
import test from "ava";
import path from "path";
import { promisify } from "util";
import encode, { createImage } from "../src/encoder";
import fs from "fs";

const getPixels = promisify(getPixelsCb);
const fixtures = path.resolve(__dirname, "fixtures");
const output = path.resolve(__dirname, "output");

test("bar", async (t) => {
  const { width, height, data } = await readImage(
    path.resolve(fixtures, "baboon-256.png")
  );

  const image = createImage(data, width, height);

  const buf = encode(image);
  fs.writeFileSync(path.resolve(output, "test.gif"), buf);

  t.pass();
});

async function readImage(file) {
  const { data, shape } = await getPixels(file);
  let width, height;
  if (shape.length === 3) {
    width = shape[0];
    height = shape[1];
  } else if (shape.length === 4) {
    width = shape[1];
    height = shape[2];
  } else {
    throw new Error("Invalid shape " + shape.join(", "));
  }
  return { data, width, height };
}
