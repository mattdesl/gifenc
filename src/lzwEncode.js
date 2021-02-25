/*
  LZWEncoder.js
  Authors
  Kevin Weiner (original Java version - kweiner@fmsware.com)
  Thibault Imbert (AS3 version - bytearray.org)
  Johan Nordberg (JS version - code@johan-nordberg.com)
  Acknowledgements
  GIFCOMPR.C - GIF Image compression routines
  Lempel-Ziv compression based on 'compress'. GIF modifications by
  David Rowley (mgardi@watdcsu.waterloo.edu)
  GIF Image compression - modified 'compress'
  Based on: compress.c - File compression ala IEEE Computer, June 1984.
  By Authors: Spencer W. Thomas (decvax!harpo!utah-cs!utah-gr!thomas)
  Jim McKie (decvax!mcvax!jim)
  Steve Davies (decvax!vax135!petsd!peora!srd)
  Ken Turkowski (decvax!decwrl!turtlevax!ken)
  James A. Woods (decvax!ihnp4!ames!jaw)
  Joe Orost (decvax!vax135!petsd!joe)
  Matt DesLauriers (@mattdesl - V8/JS optimizations)
*/

import createStream from "./stream.js";

const EOF = -1;
const BITS = 12;
const DEFAULT_HSIZE = 5003; // 80% occupancy
const MASKS = [
  0x0000,
  0x0001,
  0x0003,
  0x0007,
  0x000f,
  0x001f,
  0x003f,
  0x007f,
  0x00ff,
  0x01ff,
  0x03ff,
  0x07ff,
  0x0fff,
  0x1fff,
  0x3fff,
  0x7fff,
  0xffff,
];

function lzwEncode(
  width,
  height,
  pixels,
  colorDepth,
  outStream,
  accum,
  htab,
  codetab
) {
  outStream = outStream || createStream(512);
  accum = accum || new Uint8Array(256);
  htab = htab || new Int32Array(DEFAULT_HSIZE);
  codetab = codetab || new Int32Array(DEFAULT_HSIZE);

  const hsize = htab.length;
  const initCodeSize = Math.max(2, colorDepth);

  accum.fill(0);
  codetab.fill(0);
  clear_hash();

  let cur_accum = 0;
  let cur_bits = 0;

  // Algorithm: use open addressing double hashing (no chaining) on the
  // prefix code / next character combination. We do a variant of Knuth's
  // algorithm D (vol. 3, sec. 6.4) along with G. Knott's relatively-prime
  // secondary probe. Here, the modular division first probe is gives way
  // to a faster exclusive-or manipulation. Also do block compression with
  // an adaptive reset, whereby the code table is cleared when the compression
  // ratio decreases, but after the table fills. The variable-length output
  // codes are re-sized at this point, and a special CLEAR code is generated
  // for the decompressor. Late addition: construct the table according to
  // file size for noticeable speed improvement on small files. Please direct
  // questions about this implementation to ames!jaw.

  // compress and write the pixel data
  const init_bits = initCodeSize + 1;

  // Set up the globals: g_init_bits - initial number of bits
  const g_init_bits = init_bits;

  // Set up the necessary values

  // block compression parameters -- after all codes are used up,
  // and compression rate changes, start over.
  let clear_flg = false;
  let n_bits = g_init_bits;
  let maxcode = MAXCODE(n_bits);

  const ClearCode = 1 << (init_bits - 1);
  const EOFCode = ClearCode + 1;
  let free_ent = ClearCode + 2;
  let a_count = 0; // clear packet

  let ent = pixels[0];

  let hshift = 0;
  for (let fcode = hsize; fcode < 65536; fcode *= 2) {
    ++hshift;
  }
  hshift = 8 - hshift; // set hash code range bound

  outStream.writeByte(initCodeSize); // write "initial code size" byte

  output(ClearCode);

  for (let idx = 1; idx < pixels.length; idx++) {
    inner(pixels[idx]);
  }

  // Put out the final code.
  output(ent);
  output(EOFCode);

  outStream.writeByte(0); // write block terminator
  return outStream.bytesView();

  // Add a character to the end of the current packet, and if it is 254
  // characters, flush the packet to disk.
  function char_out(c) {
    accum[a_count++] = c;
    if (a_count >= 254) flush_char();
  }

  // Clear out the hash table
  // table clear for block compress
  function clear_block() {
    clear_hash();
    free_ent = ClearCode + 2;
    clear_flg = true;
    output(ClearCode);
  }

  // Reset code table
  function clear_hash() {
    htab.fill(-1);
  }

  function inner(c) {
    const fcode = (c << BITS) + ent;
    let i = (c << hshift) ^ ent; // xor hashing
    if (htab[i] === fcode) {
      ent = codetab[i];
    } else {
      if (htab[i] >= 0) {
        // non-empty slot
        const disp = i === 0 ? 1 : hsize - i; // secondary hash (after G. Knott)
        do {
          i -= disp;
          if (i < 0) i += hsize;
          if (htab[i] === fcode) {
            ent = codetab[i];
            return;
          }
        } while (htab[i] >= 0);
      }
      output(ent);
      ent = c;
      if (free_ent < 1 << BITS) {
        codetab[i] = free_ent++; // code -> hashtable
        htab[i] = fcode;
      } else {
        clear_block();
      }
    }
  }

  // Flush the packet to disk, and reset the accumulator
  function flush_char() {
    if (a_count > 0) {
      outStream.writeByte(a_count);
      outStream.writeBytesView(accum, 0, a_count);
      a_count = 0;
    }
  }

  function MAXCODE(n_bits) {
    return (1 << n_bits) - 1;
  }

  function output(code) {
    cur_accum &= MASKS[cur_bits];

    if (cur_bits > 0) cur_accum |= code << cur_bits;
    else cur_accum = code;

    cur_bits += n_bits;

    while (cur_bits >= 8) {
      char_out(cur_accum & 0xff);
      cur_accum >>= 8;
      cur_bits -= 8;
    }

    // If the next entry is going to be too big for the code size,
    // then increase it, if possible.
    if (free_ent > maxcode || clear_flg) {
      if (clear_flg) {
        n_bits = g_init_bits;
        maxcode = MAXCODE(n_bits);
        clear_flg = false;
      } else {
        ++n_bits;
        if (n_bits == BITS) maxcode = 1 << BITS;
        else maxcode = MAXCODE(n_bits);
      }
    }

    if (code == EOFCode) {
      // At EOF, write the rest of the buffer.
      while (cur_bits > 0) {
        char_out(cur_accum & 0xff);
        cur_accum >>= 8;
        cur_bits -= 8;
      }
      flush_char();
    }
  }
}

export default lzwEncode;
