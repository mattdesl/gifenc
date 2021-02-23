/* Fast pairwise nearest neighbor based algorithm for multilevel thresholding
Copyright (C) 2004-2019 Mark Tyler and Dmitry Groshev
Copyright (c) 2018-2021 Miller Cy Chan
* error measure; time used is proportional to number of bins squared - WJ */

const clamp = function (a, b, c) {
  return Math.max(b, Math.min(c, a));
};

function PnnQuant(opts) {
  this.opts = opts || {};
  this.hasSemiTransparency = false;
  this.m_transparentPixelIndex = -1;
  this.m_transparentColor = 0;
  this.palette = [];
}

var closestMap = [],
  nearestMap = [];

function PnnBin() {
  this.ac = this.rc = this.gc = this.bc = 0;
  this.cnt = 0;
  this.nn = this.fw = this.bk = this.tm = this.mtm = 0;
  this.err = 0.0;
}

function getARGBIndex(a, r, g, b, hasSemiTransparency) {
  if (hasSemiTransparency)
    return ((a & 0xf0) << 8) | ((r & 0xf0) << 4) | (g & 0xf0) | (b >> 4);
  return ((r & 0xf8) << 8) | ((g & 0xfc) << 3) | (b >> 3);
}

function sqr(value) {
  return value * value;
}

function find_nn(bins, idx) {
  var nn = 0;
  var err = 1e100;

  var bin1 = bins[idx];
  var n1 = bin1.cnt;
  var wa = bin1.ac;
  var wr = bin1.rc;
  var wg = bin1.gc;
  var wb = bin1.bc;
  for (var i = bin1.fw; i != 0; i = bins[i].fw) {
    var n2 = bins[i].cnt,
      nerr2 = (n1 * n2) / (n1 + n2);
    if (nerr2 >= err) continue;

    var nerr = nerr2 * sqr(bins[i].ac - wa);
    if (nerr >= err) continue;

    nerr += nerr2 * sqr(bins[i].rc - wr);
    if (nerr >= err) continue;

    nerr += nerr2 * sqr(bins[i].gc - wg);
    if (nerr >= err) continue;

    nerr += nerr2 * sqr(bins[i].bc - wb);
    if (nerr >= err) continue;
    err = nerr;
    nn = i;
  }
  bin1.err = err;
  bin1.nn = nn;
}

PnnQuant.prototype.pnnquan = function pnnquan(pixels, nMaxColors, quan_sqrt) {
  var bins = new Array(65536);

  /* Build histogram */
  for (var i = 0; i < pixels.length; ++i) {
    // !!! Can throw gamma correction in here, but what to do about perceptual
    // !!! nonuniformity then?
    var r = pixels[i] & 0xff,
      g = (pixels[i] >>> 8) & 0xff,
      b = (pixels[i] >>> 16) & 0xff,
      a = (pixels[i] >>> 24) & 0xff;

    var index = getARGBIndex(a, r, g, b, this.hasSemiTransparency);
    if (bins[index] == null) bins[index] = new PnnBin();
    bins[index].ac += a;
    bins[index].rc += r;
    bins[index].gc += g;
    bins[index].bc += b;
    bins[index].cnt++;
  }

  /* Cluster nonempty bins at one end of array */
  var maxbins = 0;
  var heap = new Uint32Array(65537);
  for (var i = 0; i < bins.length; ++i) {
    if (bins[i] == null) continue;

    var d = 1.0 / bins[i].cnt;
    bins[i].ac *= d;
    bins[i].rc *= d;
    bins[i].gc *= d;
    bins[i].bc *= d;

    bins[maxbins++] = bins[i];
  }

  if (sqr(nMaxColors) / maxbins < 0.022) quan_sqrt = false;

  var i = 0;
  for (; i < maxbins - 1; ++i) {
    bins[i].fw = i + 1;
    bins[i + 1].bk = i;

    if (quan_sqrt) bins[i].cnt = Math.sqrt(bins[i].cnt);
  }
  if (quan_sqrt) bins[i].cnt = Math.sqrt(bins[i].cnt);

  var h, l, l2;
  /* Initialize nearest neighbors and build heap of them */
  for (i = 0; i < maxbins; ++i) {
    find_nn(bins, i);
    /* Push slot on heap */
    var err = bins[i].err;
    for (l = ++heap[0]; l > 1; l = l2) {
      l2 = l >> 1;
      if (bins[(h = heap[l2])].err <= err) break;
      heap[l] = h;
    }
    heap[l] = i;
  }

  /* Merge bins which increase error the least */
  var extbins = maxbins - nMaxColors;
  for (i = 0; i < extbins; ) {
    var tb;
    /* Use heap to find which bins to merge */
    for (;;) {
      var b1 = heap[1];
      tb = bins[b1]; /* One with least error */
      /* Is stored error up to date? */
      if (tb.tm >= tb.mtm && bins[tb.nn].mtm <= tb.tm) break;
      if (tb.mtm == 0xffff) /* Deleted node */ b1 = heap[1] = heap[heap[0]--];
      /* Too old error value */ else {
        find_nn(bins, b1);
        tb.tm = i;
      }
      /* Push slot down */
      var err = bins[b1].err;
      for (l = 1; (l2 = l + l) <= heap[0]; l = l2) {
        if (l2 < heap[0] && bins[heap[l2]].err > bins[heap[l2 + 1]].err) l2++;
        if (err <= bins[(h = heap[l2])].err) break;
        heap[l] = h;
      }
      heap[l] = b1;
    }

    /* Do a merge */
    var nb = bins[tb.nn];
    var n1 = tb.cnt;
    var n2 = nb.cnt;
    var d = 1.0 / (n1 + n2);
    tb.ac = d * (n1 * tb.ac + n2 * nb.ac);
    tb.rc = d * (n1 * tb.rc + n2 * nb.rc);
    tb.gc = d * (n1 * tb.gc + n2 * nb.gc);
    tb.bc = d * (n1 * tb.bc + n2 * nb.bc);
    tb.cnt += nb.cnt;
    tb.mtm = ++i;

    /* Unchain deleted bin */
    bins[nb.bk].fw = nb.fw;
    bins[nb.fw].bk = nb.bk;
    nb.mtm = 0xffff;
  }
  delete heap;

  /* Fill palette */
  var k = 0;
  for (i = 0; ; ++k) {
    var a = Math.round(clamp(bins[i].ac, 0, 0xff)),
      r = Math.round(clamp(bins[i].rc, 0, 0xff)),
      g = Math.round(clamp(bins[i].gc, 0, 0xff)),
      b = Math.round(clamp(bins[i].bc, 0, 0xff));

    this.palette[k] = (a << 24) | (b << 16) | (g << 8) | r;
    if (
      this.m_transparentPixelIndex >= 0 &&
      this.palette[k] == this.m_transparentColor
    ) {
      var temp = this.palette[0];
      this.palette[0] = this.palette[k];
      this.palette[k] = temp;
    }

    if ((i = bins[i].fw) == 0) break;
  }

  if (typeof this.palette.sort !== "undefined") this.palette.sort();
};

function nearestColorIndex(palette, nMaxColors, pixel) {
  var nearest = nearestMap[pixel];
  if (nearest != null) return nearest;

  var k = 0;
  var r = pixel & 0xff,
    g = (pixel >>> 8) & 0xff,
    b = (pixel >>> 16) & 0xff,
    a = (pixel >>> 24) & 0xff;

  var mindist = 1e100;
  for (var i = 0; i < nMaxColors; i++) {
    var r2 = palette[i] & 0xff,
      g2 = (palette[i] >>> 8) & 0xff,
      b2 = (palette[i] >>> 16) & 0xff,
      a2 = (palette[i] >>> 24) & 0xff;
    var curdist = sqr(a2 - a);
    if (curdist > mindist) continue;

    curdist += sqr(r2 - r);
    if (curdist > mindist) continue;

    curdist += sqr(g2 - g);
    if (curdist > mindist) continue;

    curdist += sqr(b2 - b);
    if (curdist > mindist) continue;

    mindist = curdist;
    k = i;
  }
  nearestMap[pixel] = k;
  return k;
}

function closestColorIndex(palette, nMaxColors, pixel) {
  var k = 0;
  var r = pixel & 0xff,
    g = (pixel >>> 8) & 0xff,
    b = (pixel >>> 16) & 0xff,
    a = (pixel >>> 24) & 0xff;

  var closest = closestMap[pixel];
  if (!closest) {
    closest = [];
    closest[2] = closest[3] = 1e100;

    for (; k < nMaxColors; k++) {
      var r2 = palette[k] & 0xff,
        g2 = (palette[k] >>> 8) & 0xff,
        b2 = (palette[k] >>> 16) & 0xff,
        a2 = (palette[k] >>> 24) & 0xff;
      closest[4] =
        Math.abs(a - a2) +
        Math.abs(r - r2) +
        Math.abs(g - g2) +
        Math.abs(b - b2);
      if (closest[4] < closest[2]) {
        closest[1] = closest[0];
        closest[3] = closest[2];
        closest[0] = k;
        closest[2] = closest[4];
      } else if (closest[4] < closest[3]) {
        closest[1] = k;
        closest[3] = closest[4];
      }
    }

    if (closest[3] == 1e100) closest[2] = 0;
  }

  if (
    closest[2] == 0 ||
    Math.floor(Math.random() * 32769) % (closest[3] + closest[2]) <= closest[3]
  )
    k = closest[0];
  else k = closest[1];

  closestMap[pixel] = closest;
  return k;
}

function CalcDitherPixel(
  a,
  r,
  g,
  b,
  clamp,
  rowerr,
  cursor,
  hasSemiTransparency
) {
  var ditherPixel = [];
  if (hasSemiTransparency) {
    ditherPixel[0] = clamp[((rowerr[cursor] + 0x1008) >> 4) + r];
    ditherPixel[1] = clamp[((rowerr[cursor + 1] + 0x1008) >> 4) + g];
    ditherPixel[2] = clamp[((rowerr[cursor + 2] + 0x1008) >> 4) + b];
    ditherPixel[3] = clamp[((rowerr[cursor + 3] + 0x1008) >> 4) + a];
    return ditherPixel;
  }

  ditherPixel[0] = clamp[((rowerr[cursor] + 0x2010) >> 5) + r];
  ditherPixel[1] = clamp[((rowerr[cursor + 1] + 0x1008) >> 4) + g];
  ditherPixel[2] = clamp[((rowerr[cursor + 2] + 0x2010) >> 5) + b];
  ditherPixel[3] = a;
  return ditherPixel;
}

PnnQuant.prototype.quantize_image = function quantize_image(
  pixels,
  nMaxColors,
  qPixels,
  width,
  height,
  dither
) {
  var pixelIndex = 0;
  if (dither) {
    const DJ = 4,
      DITHER_MAX = 20;
    var err_len = (width + 2) * DJ;
    var clamp = new Uint32Array(DJ * 256);
    var limtb = new Uint32Array(512);

    for (var i = 0; i < 256; ++i) {
      clamp[i] = 0;
      clamp[i + 256] = i;
      clamp[i + 512] = 0xff;
      clamp[i + 768] = 0xff;

      limtb[i] = -DITHER_MAX;
      limtb[i + 256] = DITHER_MAX;
    }
    for (var i = -DITHER_MAX; i <= DITHER_MAX; ++i) limtb[i + 256] = i;

    var dir = 1;
    var row0 = new Uint32Array(err_len);
    var row1 = new Uint32Array(err_len);
    for (var i = 0; i < height; ++i) {
      if (dir < 0) pixelIndex += width - 1;

      var cursor0 = DJ,
        cursor1 = width * DJ;
      row1[cursor1] = row1[cursor1 + 1] = row1[cursor1 + 2] = row1[
        cursor1 + 3
      ] = 0;
      for (var j = 0; j < width; j++) {
        var r = pixels[pixelIndex] & 0xff,
          g = (pixels[pixelIndex] >>> 8) & 0xff,
          b = (pixels[pixelIndex] >>> 16) & 0xff,
          a = (pixels[pixelIndex] >>> 24) & 0xff;

        var ditherPixel = CalcDitherPixel(
          a,
          r,
          g,
          b,
          clamp,
          row0,
          cursor0,
          this.hasSemiTransparency
        );
        var r_pix = ditherPixel[0];
        var g_pix = ditherPixel[1];
        var b_pix = ditherPixel[2];
        var a_pix = ditherPixel[3];

        var c1 = (a_pix << 24) | (b_pix << 16) | (g_pix << 8) | r_pix;
        qPixels[pixelIndex] = nearestColorIndex(this.palette, nMaxColors, c1);

        var c2 = this.palette[qPixels[pixelIndex]];
        var r2 = c2 & 0xff,
          g2 = (c2 >>> 8) & 0xff,
          b2 = (c2 >>> 16) & 0xff,
          a2 = (c2 >>> 24) & 0xff;

        r_pix = limtb[r_pix - r2 + 256];
        g_pix = limtb[g_pix - g2 + 256];
        b_pix = limtb[b_pix - b2 + 256];
        a_pix = limtb[a_pix - a2 + 256];

        var k = r_pix * 2;
        row1[cursor1 - DJ] = r_pix;
        row1[cursor1 + DJ] += r_pix += k;
        row1[cursor1] += r_pix += k;
        row0[cursor0 + DJ] += r_pix += k;

        k = g_pix * 2;
        row1[cursor1 + 1 - DJ] = g_pix;
        row1[cursor1 + 1 + DJ] += g_pix += k;
        row1[cursor1 + 1] += g_pix += k;
        row0[cursor0 + 1 + DJ] += g_pix += k;

        k = b_pix * 2;
        row1[cursor1 + 2 - DJ] = b_pix;
        row1[cursor1 + 2 + DJ] += b_pix += k;
        row1[cursor1 + 2] += b_pix += k;
        row0[cursor0 + 2 + DJ] += b_pix += k;

        k = a_pix * 2;
        row1[cursor1 + 3 - DJ] = a_pix;
        row1[cursor1 + 3 + DJ] += a_pix += k;
        row1[cursor1 + 3] += a_pix += k;
        row0[cursor0 + 3 + DJ] += a_pix += k;

        cursor0 += DJ;
        cursor1 -= DJ;
        pixelIndex += dir;
      }
      if (i % 2 == 1) pixelIndex += width + 1;

      dir *= -1;
      var temp = row0;
      row0 = row1;
      row1 = temp;
    }
    return true;
  }

  if (this.m_transparentPixelIndex >= 0 || nMaxColors < 64) {
    for (var i = 0; i < qPixels.length; ++i)
      qPixels[i] = nearestColorIndex(this.palette, nMaxColors, pixels[i]);
  } else {
    for (var i = 0; i < qPixels.length; ++i)
      qPixels[i] = closestColorIndex(this.palette, nMaxColors, pixels[i]);
  }

  return true;
};

function processImagePixels(palette, qPixels) {
  for (var i = 0; i < qPixels.length; ++i) qPixels[i] = palette[qPixels[i]];

  return qPixels;
}

PnnQuant.prototype.quantizeImage = function quantizeImage() {
  var pixels = this.opts.pixels,
    width = this.opts.width,
    height = this.opts.height,
    nMaxColors = this.opts.colors,
    dither = this.opts.dithering;

  for (var i = 0; i < pixels.length; ++i) {
    var a = (pixels[i] >>> 24) & 0xff;

    if (a < 0xff) {
      this.hasSemiTransparency = true;
      if (a == 0) {
        this.m_transparentPixelIndex = i;
        this.m_transparentColor = pixels[i];
      }
    }
  }

  var qPixels = new Uint32Array(pixels.length);

  this.palette = new Uint32Array(nMaxColors);
  if (nMaxColors > 2) this.pnnquan(pixels, nMaxColors, true);
  else {
    if (this.m_transparentPixelIndex >= 0) {
      this.palette[0] = 0;
      this.palette[1] = 0xff << 24;
    } else {
      this.palette[0] = 0xff << 24;
      this.palette[1] = 0xffffffff;
    }
  }

  this.quantize_image(pixels, nMaxColors, qPixels, width, height, dither);
  if (this.m_transparentPixelIndex >= 0) {
    var k = qPixels[this.m_transparentPixelIndex];
    if (nMaxColors > 2) this.palette[k] = this.m_transparentColor;
    else if (palette[k] != this.m_transparentColor) {
      var temp = palette[0];
      this.palette[0] = palette[1];
      this.palette[1] = temp;
    }
  }
  closestMap = [];
  nearestMap = [];

  return processImagePixels(this.palette, qPixels);
};

PnnQuant.prototype.getPalette = function getPalette() {
  return this.palette.buffer;
};

PnnQuant.prototype.getImgType = function getImgType() {
  return this.hasSemiTransparency ? "image/png" : "image/gif";
};

// expose
export default PnnQuant;
