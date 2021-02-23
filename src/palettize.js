const {
  colorDifferenceRGBToYIQSquared,
  colorDifferenceYIQSquared,
} = require("./color");
// const { packRGBA } = require("./bytes");
// const { forEachPixel } = require("./util");

export function nearest(pixels, palette) {
  const index = new Uint8Array(pixels.length);
  const nearestMap = new Array(65536);
  for (let i = 0; i < pixels.length; i++) {
    const px = pixels[i];
    const r = px[0];
    const g = px[1];
    const b = px[2];
    const reducedIdx = nearestColorIndexFastRGB(r, g, b, palette, nearestMap);
    index[i] = reducedIdx;
  }
  return index;
}

export function nearestImageData(data, width, height, stride, palette) {
  const index = new Uint8Array(width * height);
  const nearestMap = new Array(65536);
  for (let i = 0; i < width * height; i++) {
    let r = data[i * stride + 0];
    let g = data[i * stride + 1];
    let b = data[i * stride + 2];
    const reducedIdx = nearestColorIndexFastRGB(r, g, b, palette, nearestMap);
    index[i] = reducedIdx;
  }
  return index;
}

export function colorSnap(palette, knownColors, threshold = 5) {
  if (!palette.length || !knownColors.length) return;

  const thresholdSq = threshold * threshold;
  const dim = palette[0].length;
  for (let i = 0; i < knownColors.length; i++) {
    let color = knownColors[i];
    if (color.length < dim) {
      // palette is RGBA, known is RGB
      color = [color[0], color[1], color[2], 0xff];
    } else if (color.length > dim) {
      // palette is RGB, known is RGBA
      color = color.slice(0, 3);
    } else {
      // make sure we always copy known colors
      color = color.slice();
    }
    const r = nearestColorIndexWithDistance(
      color,
      palette,
      colorDifferenceRGBToYIQSquared
    );
    const idx = r[0];
    const distanceSq = r[1];
    if (distanceSq > 0 && distanceSq <= thresholdSq) {
      palette[idx] = color;
    }
  }
}

function getARGBIndex(a, r, g, b) {
  return ((a & 0xf0) << 8) | ((r & 0xf0) << 4) | (g & 0xf0) | (b >> 4);
}

function sqr(a) {
  return a * a;
}

function nearestColorIndexFastRGB(r, g, b, palette, nearestMap) {
  // note - we lose color depth here but presumably the quantizer
  // has already killed that anyways
  const key = getARGBIndex(0xff, r, g, b);

  // for full color depth this would be better but its slower
  // const key = packRGBA(r, g, b, 0xff);

  var nearest = nearestMap[key];
  if (nearest != null) return nearest;

  var k = 0;
  var mindist = 1e100;
  for (var i = 0; i < palette.length; i++) {
    var px2 = palette[i];
    var r2 = px2[0];
    var g2 = px2[1];
    var b2 = px2[2];

    var curdist = sqr(r2 - r);
    if (curdist > mindist) continue;

    curdist += sqr(g2 - g);
    if (curdist > mindist) continue;

    curdist += sqr(b2 - b);
    if (curdist > mindist) continue;

    mindist = curdist;
    k = i;
  }
  nearestMap[key] = k;
  return k;
}

function nearestColorIndex(pixel, colors, distanceFn) {
  let minDist = Infinity;
  let minDistIndex = -1;
  for (let j = 0; j < colors.length; j++) {
    const paletteColor = colors[j];
    const dist = distanceFn(pixel, paletteColor);
    if (dist < minDist) {
      minDist = dist;
      minDistIndex = j;
    }
  }
  return minDistIndex;
}

function nearestColorIndexWithDistance(pixel, colors, distanceFn) {
  let minDist = Infinity;
  let minDistIndex = -1;
  for (let j = 0; j < colors.length; j++) {
    const paletteColor = colors[j];
    const dist = distanceFn(pixel, paletteColor);
    if (dist < minDist) {
      minDist = dist;
      minDistIndex = j;
    }
  }
  return [minDistIndex, minDist];
}

function nearestColor(pixel, colors, distanceFn) {
  return colors[nearestColorIndex(pixel, colors, distanceFn)];
}

function unpackRGBA(rgba) {
  const a = (rgba >> 24) & 255;
  const r = (rgba >> 16) & 255;
  const g = (rgba >> 8) & 255;
  const b = (rgba >> 0) & 255;
  return [r, g, b, a];
}

function packRGBA(red, green, blue, alpha) {
  return (alpha << 24) | (red << 16) | (green << 8) | (blue << 0);
}
