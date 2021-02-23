// The entry file of your WebAssembly module.

const EOF = -1;
const BITS = 12;
const HSIZE = 5003; // 80% occupancy



export function encode(
    width: u32,
    height: u32,
    pixels: Uint8Array,
    colorDepth: u8,

    accum: Uint8Array,
    htab: Int32Array,
    codetab: Int32Array
) : Uint8Array {
  const HSIZE = htab.length;
  const test = new Uint8Array(256);
  const initCodeSize = max<u8>(2, colorDepth);
  for (let i = 0; i < test.length; i++) {
    test[i] = i;
  }
  htab.fill(-1);
  // accum.fill(2);
  return accum;
}

export const Int32Array_ID = idof<Int32Array>()
export const Uint8Array_ID = idof<Uint8Array>()


// const accum = new Uint8Array(256);
// const htab = new Int32Array(HSIZE);
// const codetab = new Int32Array(HSIZE);
