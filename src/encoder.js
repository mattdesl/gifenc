import constants from "./constants.js";
import lzw from "./lzw.js";
import Image from "./Image.js";
import LZWEncoder from "./LZWEncoder";
import { BitOutputStream } from "@thi.ng/bitstream";
import createBuffer from "./buffer.js";
import quantize from "./nQuant2.js";
import { nearest, nearestImageData, colorSnap } from "./palettize";

export { quantize, nearest, colorSnap, nearestImageData };

const HSIZE = 5003; // 80% occupancy
const accum = new Uint8Array(256);
const htab = new Int32Array(HSIZE);
const codetab = new Int32Array(HSIZE);

export default function GIF(initialCapacity = 4096) {
  const stream = createBuffer(initialCapacity);
  return {
    finish() {
      stream.writeByte(constants.trailer);
    },
    bytes() {
      return stream.bytes();
    },
    bytesView() {
      return stream.bytesView();
    },
    get buffer() {
      return stream.buffer;
    },
    get stream() {
      return stream;
    },
    writeHeader() {
      writeUTFBytes(stream, "GIF89a");
    },
    writeFrame(index, width, height, opts = {}) {
      const {
        first = false,
        transparent = -1,
        delay = 0,
        palette = null,
        repeat = 0, // -1=once, 0=forever, >0=count
        colorDepth = 8,
        dispose = -1,
      } = opts;

      width = Math.max(0, Math.floor(width));
      height = Math.max(0, Math.floor(height));

      // Write pre-frame details such as repeat count and global palette
      if (first) {
        if (!palette)
          throw new Error("First frame must include a color table palette");
        encodeLogicalScreenDescriptor(
          stream,
          width,
          height,
          palette,
          colorDepth
        );
        encodeColorTable(stream, palette);
        if (repeat >= 0) {
          encodeNetscapeExt(stream, repeat);
        }
      }

      const delayTime = Math.round(delay / 10);
      encodeGraphicControlExt(stream, dispose, delayTime, transparent);

      const useLocalColorTable = Boolean(palette) && !first;
      encodeImageDescriptor(
        stream,
        width,
        height,
        useLocalColorTable ? palette : null
      );
      if (useLocalColorTable) encodeColorTable(stream, palette);
      encodePixels(stream, index, width, height, colorDepth);
    },
  };
}

function encodeGraphicControlExt(stream, dispose, delay, transparent) {
  stream.writeByte(0x21); // extension introducer
  stream.writeByte(0xf9); // GCE label
  stream.writeByte(4); // data block size

  var transp, disp;
  if (transparent == null || transparent === -1) {
    transp = 0;
    disp = 0; // dispose = no action
  } else {
    transp = 1;
    disp = 2; // force clear if using transparent color
  }

  if (dispose >= 0) {
    disp = dispose & 7; // user override
  }
  disp <<= 2;

  const userInput = 0;

  // packed fields
  stream.writeByte(
    0 | // 1:3 reserved
      disp | // 4:6 disposal
      userInput | // 7 user input - 0 = none
      transp // 8 transparency flag
  );

  const transparentIndex =
    transparent == null || transparent === -1 ? 0x00 : transparent;

  writeUInt16(stream, delay); // delay x 1/100 sec
  stream.writeByte(transparentIndex); // transparent color index
  stream.writeByte(0); // block terminator
}

function encodeLogicalScreenDescriptor(
  stream,
  width,
  height,
  palette,
  colorDepth = 8
) {
  const globalColorTableFlag = 1;
  const sortFlag = 0;
  const globalColorTableSize = colorTableSize(palette.length) - 1;
  const fields =
    (globalColorTableFlag << 7) |
    ((colorDepth - 1) << 4) |
    (sortFlag << 3) |
    globalColorTableSize;
  const backgroundColorIndex = 0;
  const pixelAspectRatio = 0;
  writeUInt16(stream, width);
  writeUInt16(stream, height);
  stream.writeBytes([fields, backgroundColorIndex, pixelAspectRatio]);
}

function encodeNetscapeExt(stream, repeat) {
  stream.writeByte(0x21); // extension introducer
  stream.writeByte(0xff); // app extension label
  stream.writeByte(11); // block size
  writeUTFBytes(stream, "NETSCAPE2.0"); // app id + auth code
  stream.writeByte(3); // sub-block size
  stream.writeByte(1); // loop sub-block id
  writeUInt16(stream, repeat); // loop count (extra iterations, 0=repeat forever)
  stream.writeByte(0); // block terminator
}

function encodeColorTable(stream, palette) {
  const colorTableLength = 1 << colorTableSize(palette.length);
  for (let i = 0; i < colorTableLength; i++) {
    let color = [0, 0, 0];
    if (i < palette.length) {
      color = palette[i];
    }
    stream.writeByte(color[0]);
    stream.writeByte(color[1]);
    stream.writeByte(color[2]);
  }
}

function encodeImageDescriptor(stream, width, height, localPalette) {
  stream.writeByte(0x2c); // image separator

  writeUInt16(stream, 0); // x position
  writeUInt16(stream, 0); // y position
  writeUInt16(stream, width); // image size
  writeUInt16(stream, height);

  if (localPalette) {
    const interlace = 0;
    const sorted = 0;
    const palSize = colorTableSize(localPalette.length) - 1;
    // local palette
    stream.writeByte(
      0x80 | // 1 local color table 1=yes
        interlace | // 2 interlace - 0=no
        sorted | // 3 sorted - 0=no
        0 | // 4-5 reserved
        palSize // 6-8 size of color table
    );
  } else {
    // global palette
    stream.writeByte(0);
  }
}

function encodePixels(stream, index, width, height, colorDepth = 8) {
  LZWEncoder(width, height, index, colorDepth, stream, accum, htab, codetab);
}

// Utilities

function writeUInt16(stream, short) {
  stream.writeByte(short & 0xff);
  stream.writeByte((short >> 8) & 0xff);
}

function writeUTFBytes(stream, text) {
  for (var i = 0; i < text.length; i++) {
    stream.writeByte(text.charCodeAt(i));
  }
}

function colorTableSize(length) {
  return Math.max(Math.ceil(Math.log2(length)), 1);
}
