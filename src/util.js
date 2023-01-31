export function uint32_to_rgba(color) {
  var a = (color >> 24) & 0xff;
  var b = (color >> 16) & 0xff;
  var g = (color >> 8) & 0xff;
  var r = color & 0xff;
  return [r, g, b, a];
}

export function rgba_to_uint32(r, g, b, a) {
  return (a << 24) | (b << 16) | (g << 8) | r;
}

export function rgb888_to_rgb565(r, g, b) {
  return ((r << 8) & 0xf800) | ((g << 2) & 0x03e0) | (b >> 3);
}

export function rgba8888_to_rgba4444(r, g, b, a) {
  return (r >> 4) | (g & 0xf0) | ((b & 0xf0) << 4) | ((a & 0xf0) << 8);
}

export function rgb888_to_rgb444(r, g, b) {
  return ((r >> 4) << 8) | (g & 0xf0) | (b >> 4);
}

// Alternative 565 ?
// return ((r & 0xf8) << 8) + ((g & 0xfc) << 3) + (b >> 3);

// Alternative 4444 ?
// ((a & 0xf0) << 8) | ((r & 0xf0) << 4) | (g & 0xf0) | (b >> 4);

export function nearestColorIndexRGBA(r, g, b, a, palette) {
  let k = 0;
  let mindist = 1e100;
  for (let i = 0; i < palette.length; i++) {
    const px2 = palette[i];
    const a2 = px2[3];
    let curdist = sqr(a2 - a);
    if (curdist > mindist) continue;
    const r2 = px2[0];
    curdist += sqr(r2 - r);
    if (curdist > mindist) continue;
    const g2 = px2[1];
    curdist += sqr(g2 - g);
    if (curdist > mindist) continue;
    const b2 = px2[2];
    curdist += sqr(b2 - b);
    if (curdist > mindist) continue;
    mindist = curdist;
    k = i;
  }
  return k;
}

export function nearestColorIndexRGB(r, g, b, palette) {
  let k = 0;
  let mindist = 1e100;
  for (let i = 0; i < palette.length; i++) {
    const px2 = palette[i];
    const r2 = px2[0];
    let curdist = sqr(r2 - r);
    if (curdist > mindist) continue;
    const g2 = px2[1];
    curdist += sqr(g2 - g);
    if (curdist > mindist) continue;
    const b2 = px2[2];
    curdist += sqr(b2 - b);
    if (curdist > mindist) continue;
    mindist = curdist;
    k = i;
  }
  return k;
}

export function sqr(a) {
  return a * a;
}

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function ColorCache(format = "rgb565") {
  const hasAlpha = format === "rgba4444" || format === "rgba8888";

  let storage;
  let get;
  let find;

  if (format === "rgb888" || format === "rgba8888") {
    storage = new Map();

    find =
      format === "rgb888"
        ? (color, palette) => {
            const b = (color >> 16) & 0xff;
            const g = (color >> 8) & 0xff;
            const r = color & 0xff;
            return nearestColorIndexRGB(r, g, b, palette);
          }
        : (color, palette) => {
            const a = (color >> 24) & 0xff;
            const b = (color >> 16) & 0xff;
            const g = (color >> 8) & 0xff;
            const r = color & 0xff;
            return nearestColorIndexRGBA(r, g, b, apalette);
          };

    get = (color) => {
      if (storage.has(color)) return storage.get(color);
      else storage.set(color, find(color));
    };
  } else if (
    format === "rgba4444" ||
    format === "rgb565" ||
    format === "rgb444"
  ) {
    const bincount = format === "rgb444" ? 4096 : 65536;
    storage = new Array(bincount);
  }

  return {
    search,
    has(colorUint32) {},
    dispose() {
      storage = null;
    },
  };
}
