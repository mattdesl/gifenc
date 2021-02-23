function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

function PnnBin() {
  this.rc = 0;
  this.gc = 0;
  this.bc = 0;

  this.cnt = 0;

  this.nn = 0;
  this.fw = 0;
  this.bk = 0;
  this.tm = 0;
  this.mtm = 0;

  this.err = 0.0;
}

function getARGBIndex(a, r, g, b) {
  return ((a & 0xf0) << 8) | ((r & 0xf0) << 4) | (g & 0xf0) | (b >> 4);
}

function getRGBIndex(r, g, b) {
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
  // var wa = bin1.ac;
  var wr = bin1.rc;
  var wg = bin1.gc;
  var wb = bin1.bc;
  for (var i = bin1.fw; i != 0; i = bins[i].fw) {
    var n2 = bins[i].cnt,
      nerr2 = (n1 * n2) / (n1 + n2);
    if (nerr2 >= err) continue;

    // var nerr = 0;
    // if (hasAlpha) {
    //   nerr += nerr2 * sqr(bins[i].ac - wa);
    //   if (nerr >= err) continue;
    // }

    var nerr = nerr2 * sqr(bins[i].rc - wr);
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

function cluster() {}

export default function quantize(
  data,
  width,
  height,
  nMaxColors,
  quan_sqrt = true
) {
  const bincount = 65536;
  const bincountMinusOne = bincount - 1;
  const bins = new Array(bincount);
  const heap = new Uint32Array(65537);

  /* Build histogram */
  const size = width * height;
  for (var i = 0; i < size; ++i) {
    const color = data[i];
    var b = (color >> 16) & 0xff;
    var g = (color >> 8) & 0xff;
    var r = color & 0xff;
    // var r = data[i * stride + 0];
    // var g = data[i * stride + 1];
    // var b = data[i * stride + 2];
    // var a = hasAlpha ? data[i * stride + 2] : 0xff;
    // const px = pixels[i];
    // var r = px[0];
    // var g = px[1];
    // var b = px[2];
    // var a = hasAlpha ? px[3] : 0xff;
    var a = 0xff;

    // TODO: Evaluate this as it's intended for alpha quantization
    var index = ((a & 0xf0) << 8) | ((r & 0xf0) << 4) | (g & 0xf0) | (b >> 4);
    let bin = bins[index];
    if (!bin) {
      bin = {
        rc: 0,
        gc: 0,
        bc: 0,
        // ac: 0,
        cnt: 0,
        nn: 0,
        fw: 0,
        bk: 0,
        tm: 0,
        mtm: 0,
        err: 0,
      };
      bins[index] = bin;
    }

    // if (hasAlpha) bin.ac += a;
    bin.rc += r;
    bin.gc += g;
    bin.bc += b;
    bin.cnt++;
  }

  /* Cluster nonempty bins at one end of array */
  var maxbins = 0;
  for (var i = 0; i < bincount; ++i) {
    const bin = bins[i];
    if (bin != null) {
      var d = 1.0 / bin.cnt;
      // if (hasAlpha) bin.ac *= d;
      bin.rc *= d;
      bin.gc *= d;
      bin.bc *= d;
      bins[maxbins++] = bin;
    }
  }

  if (sqr(nMaxColors) / maxbins < 0.022) {
    quan_sqrt = false;
  }

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
      if (tb.mtm == bincountMinusOne)
        /* Deleted node */ b1 = heap[1] = heap[heap[0]--];
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
    // if (hasAlpha) tb.ac = d * (n1 * tb.ac + n2 * nb.ac);
    tb.rc = d * (n1 * tb.rc + n2 * nb.rc);
    tb.gc = d * (n1 * tb.gc + n2 * nb.gc);
    tb.bc = d * (n1 * tb.bc + n2 * nb.bc);
    tb.cnt += nb.cnt;
    tb.mtm = ++i;

    /* Unchain deleted bin */
    bins[nb.bk].fw = nb.fw;
    bins[nb.fw].bk = nb.bk;
    nb.mtm = bincountMinusOne;
  }

  // let palette = new Uint32Array(nMaxColors);
  let palette = [];

  /* Fill palette */
  var k = 0;
  for (i = 0; ; ++k) {
    // var a = hasAlpha ? clamp(Math.round(bins[i].ac), 0, 0xff) : 0xff;
    // var a = 0xff;
    var r = clamp(Math.round(bins[i].rc), 0, 0xff);
    var g = clamp(Math.round(bins[i].gc), 0, 0xff);
    var b = clamp(Math.round(bins[i].bc), 0, 0xff);

    palette.push([r, g, b]);
    if ((i = bins[i].fw) == 0) break;
  }

  return palette;
}
