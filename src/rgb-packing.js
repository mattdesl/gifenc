export const FORMATS = ['rgb444', 'rgba4444', 'rgb565'];

export function validateFormat (format) {
  if (!FORMATS.includes(format)) throw new Error('Unknown format: ' + format);
}

// Expects ARGB32 where A is most significant
export function uint32_to_rgba(color) {
  var a = (color >> 24) & 0xff;
  var r = (color >> 16) & 0xff;
  var g = (color >> 8) & 0xff;
  var b = color & 0xff;
  return [r, g, b, a];
}

// Packs to ARGB32 where A is most significant
export function rgba_to_uint32(r, g, b, a) {
  return ((a & 0xff) << 24) | ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
}

export function rgb888_to_rgb565(r, g, b) {
  // ensure bytes
  // r = r & 0xff;
  // g = g & 0xff;
  // b = b & 0xff;
  // reduce to 5, 6, and 5 bits
  let r5 = r >> 3;
  let g6 = g >> 2;
  let b5 = b >> 3;
  return (r5 << 11) | (g6 << 5) | b5;
}

// Packs it as ARGB16 where A is most significant
export function rgba8888_to_rgba4444(r, g, b, a) {
  // ensure bytes
  // r = r & 0xff;
  // g = g & 0xff;
  // b = b & 0xff;
  // a = a & 0xff;
  // reduce to 4 bits
  r = r >> 4;
  g = g >> 4;
  b = b >> 4;
  a = a >> 4;
  return (a << 12) | (r << 8) | (g << 4) | b;
}

// Packs as RGB12 where R is most significant
export function rgb888_to_rgb444(r, g, b) {
  // ensure bytes
  // r = r & 0xff;
  // g = g & 0xff;
  // b = b & 0xff;
  // reduce to 4 bits
  r = r >> 4;
  g = g >> 4;
  b = b >> 4;
  return (r << 8) | (g << 4) | b;
}
