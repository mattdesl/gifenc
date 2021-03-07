# gifenc

[![experimental](http://badges.github.io/stability-badges/dist/experimental.svg)](http://github.com/badges/stability-badges)

A fast and lightweight pure-JavaScript GIF encoder. Features:

- Supports many standard GIF features: image, animation, transparency
- Works in browser and Node.js (ESM + CJS)
- Highly optimized for V8 (150 1024x1024px frames takes about 2.1 seconds with workers in Chrome)
- Small library footprint (5KB before GZIP)
- Can be used across multiple web workers for multi-core devices
- Allows full control over encoding indexed bitmaps & per frame color palette
- Fast built-in color quantizer based on a port of PnnQuant.js, which is based on "Pairwise Nearest Neighbor Clustering" [1](https://pdfs.semanticscholar.org/68b4/236e77d6026943ffa009d8b3553ace09a922.pdf) [2](https://github.com/mcychan/PnnQuant.js) [3](https://github.com/mcychan/nQuant.j2se)
- Fast built-in palette mapping (reducing colors to their nearest paletted index)

This library is a little lower level than something like [GIF.js](https://jnordberg.github.io/gif.js/), but gives much better speed (i.e. often more than twice as fast) with similar visual results for many types of images. Because there is currently no dithering support, and because of the current choice of color quantizer, this encoder is probably best suited for simple flat-style vector graphics, rather than photographs or video that might need special handling across frames (e.g. temporal dithering) or better perceptual color quantizers.

Some features that could be explored in a future version:

- Alternative color quantizers
- Alternative palette mapping (such as perceptually based)
- Dithering support
- WASM-based speed optimizations
- Optimizations for FireFox
- Support Interlacing

## Example

You can see a simple browser example [here](https://codepen.io/mattdesl/full/vYypMXv).

You can see a more advanced example of this encoder in action inside [looom-tools.netlify.app](https://looom-tools.netlify.app/).

Also see [./test/encode_node.js](./test/encode_node.js) for a pure Node.js example.

Basic code example:

```js
import { GIFEncoder, quantize, applyPalette } from 'https://unpkg.com/gifenc';

// Get your RGBA image into Uint8Array data, such as from canvas
const { data, width, height } = /* ... getImageData() ... */;

// Quantize your colors to a 256-color RGB palette palette
const palette = quantize(data, 256);

// Get an indexed bitmap by reducing each pixel to the nearest color palette
const index = applyPalette(data, palette);

// Create an encoding stream
const gif = GIFEncoder();

// Write a single frame
gif.writeFrame(index, width, height, { palette });

// Write end-of-stream character
gif.finish();

// Get the Uint8Array output of your binary GIF file
const output = gif.bytes();
```

## API

> :bulb: If you are new to GIF encoding, you might want to read [How GIF Encoding Works](#how-gif-encoding-works) to better understand the steps involved.

### `palette = quantize(rgba, maxColors, options = {})`

Given the image contained by `rgba`, a flat `Uint8Array` or `Uint8ClampedArray` of per-pixel RGBA data, this method will quantize the total number of colors down to a reduced palette no greater than `maxColors`.

Options:

- `format` (string, default `"rgb565"`) — this is the color format, either `"rgb565"` (default), `"rgb444"`, or `"rgba4444"`
  - 565 means 5 bits red, 6 bits green, 5 bits blue (better quality, slower)
  - `rgb444` is 4 bits per channel (lower quality, faster)
  - `rgba4444` is the same as above but with alpha support
  - if you choose `rgba4444`, the resulting color table will include alpha channel
- `oneBitAlpha` (boolean|number, default false) — if alpha format is selected, this will go through all quantized RGBA colors and set their alpha to either `0x00` if the alpha is less than or equal to `127`, otherwise it will be set to `0xFF`. You can specify a number here instead of a boolean to use a specific 1-bit alpha threshold
- `clearAlpha` (boolean, default true) — if alpha format is selected and the quantized color is below `clearAlphaThreshold`, it will be replaced with `clearAlphaColor` (i.e. RGB colors with 0 opacity will be replaced with pure black)
- `clearAlphaThreshold` (number, default 0) — if alpha and `clearAlpha` is enabled, and a quantized pixel has an alpha below or equal to this value, its RGB values will be set to `clearAlphaColor`
- `clearAlphaColor` (number, default `0x00`) — if alpha and `clearAlpha` is enabled and a quantized pixel is being cleared, this is the color its RGB cahnnels will be cleared to (typically you will choose `0x00` or `0xff`)

The return value `palette` is an array of arrays, and no greater than `maxColors` in length. Each array in the `palette` is either RGB or RGBA (depending on pixel format) such as `[ r, g, b ]` or `[ r, g, b, a ]` in bytes.

### `index = applyPalette(rgba, palette, format = "rgb565")`

This will determine the color index for each pixel in the `rgba` image. The pixel input is the same as the above function: to a flat `Uint8Array` or `Uint8ClampedArray` of per-pixel RGBA data.

The method will step through each pixel and determine it's closest pixel in the color table (in euclidean RGB(A) space), and replace the pixel with an index value in the range 0..255. The return value `index` is a `Uint8Array` with a length equal to `rgba.length / 4` (i.e. 1 byte per pixel).

The method uses `palette`, which is an array of arrays such as received from the `quantize` method, and may be in RGB or RGBA depending on your desired `format`.

```js
const palette = [
  [ 0, 255, 10 ],
  [ 50, 20, 100 ],
  // ...
];
```

The `format` is the same as in `quantize`, and you can choose between opaque (RGB) and semi-transparent (RGBA) formats. You'll likely want to choose the same format you used to quantize your image.

### `gif = GIFEncoder(opts = {})`

Creates a new GIF stream with the given options (for basic usage, you can ignore these).

- `auto` (boolean, default true) — in "auto" mode, the header and first-frame metadata (global palette) will be written upon writing the first frame. If set to false, you will be responsible for first writing a GIF header, then writing frames with `{ first }` boolean specified.
- `initialCapacity` (number, default 4096) — the number of bytes to initially set the internal buffer to, it will grow as bytes are written to the stream

Once created:

#### `gif.writeFrame(index, width, height, opts = {})`

Writes a single frame into the GIF stream, with `index` (indexed Uint8Array bitmap image), a size, and optional per-frame options:

- `palette` (color table array) — the color table for this frame, which is required for the first frame (i.e. global color table) but optional for subsequent frames. If not specified, the frame will use the first (global) color table in the stream.
- `first` (boolean, default false) — in non-auto mode, set this to true when encoding the first frame in an image or sequence, and it will encode the Logical Screen Descriptor and a Global Color Table. This option is ignored in `auto` mode.
- `transparent` (boolean, default false) — enable 1-bit transparency for this frame
- `transparentIndex` (number, default 0) — if `transparency` is enabled, the color at the specified palette index will be treated as fully transparent for this frame
- `delay` (number, default 0) — the frame delay in milliseconds
- `repeat` (number, default 0) — repeat count, set to `-1` for 'once', `0` for 'forever', and any other positive integer for the number of repetitions
- `dispose` (number, default -1) — advanced GIF dispose flag override, -1 is 'use default'

#### `gif.finish()`

Writes the GIF end-of-stream character, required after writing all frames for the image to encode correctly.

#### `gif.bytes()`

Gets a slice of the Uint8Array bytes that is underlying this GIF stream. (Note: this incurs a copy)

#### `gif.bytesView()`

Gets a direct typed array buffer view into the Uint8Array bytes underlying this GIF stream. (Note: no copy involved, but best to use this carefully).

#### `gif.writeHeader()`

Writes a GIF header into the stream, only necessary if you have specified `{ auto: false }` in the GIFEncoder options.

#### `gif.reset()`

Resets this GIF stream by simply setting its internal stream cursor (index) to zero, so that subsequent writes will replace the previous data in the underlying buffer.

#### `gif.buffer`

A property on the GIF stream that returns the currently backed `ArrayBuffer`, note this reference may change as the buffer grows in size.

#### `gif.stream`

A property on the GIF stream that returns an internal API that holds an expandable buffer and allows writing single or multiple bytes.

```js
// write a single byte to stream
gif.stream.writeByte(0xff);
// write a chunk of bytes to the stream
gif.stream.writeBytes(myTypedArray, offset, byteLength);
```

### `index = nearestColorIndex(palette, pixel)`

For the given `pixel` as `[r,g,b]` or `[r,g,b,a]` (depending on your pixel format), determines the index (0...N) of the nearest color in your `palette` array of colors in the same RGB(A) format.

### `[index, distance] = nearestColorIndexWithDistance(palette, pixel)`

Same as above, but returns a tuple of `index` and `distance` (euclidean distance squared).

## Web Workers

For the best speed, you should use workers to split this work across multiple threads. Compare these encoding speeds with 150 frames of 1024x1024px GIF in Chrome:

- Main thread only: ~5 seconds
- Split across 4 workers: ~2 seconds

This library will run fine in a worker with ES support, but there is currently no built-in worker API, and it's up to the developer to implement their own worker architecture and handle bundling.

The simplest architecture, and the one used in my [Looom exporter](https://github.com/mattdesl/looom-tools/blob/dd04eb2985a8defec3dc9874600ca033bda5d96f/site/components/record.js#L250), is to:

- Send the RGBA pixel data of each frame to one worker amongst a pool of multiple workers
- In the worker, do quantization, apply palette, and then use `GIFEncoder({ auto: false })` to write a 'chunk' of GIF without a header or end-of-stream
- Send the encoded bytes view back to the main thread, which will store the chunk into a linear array
- Once all streams have been encoded and their workers responded with encoded chunks, you can write all frames sequentially into a single GIF stream

There is an example of this in [./test/encode_web_workers.html](./test/encode_web_workers.html) which uses [./test/worker.js](./test/worker.js). Future versions of this library might include a pre-bundled worker API built-in for easier use.

## How GIF Encoding Works

There are generally 3 steps involved, but some applications might be able to skip these or choose a different algorithm for one of the steps, so this library gives you control over each step.

For each frame in your animation (or, just a single frame for still images):

1. You'll first need to convert RGB(A) pixels from your source graphic/photograph into a reduced color table (palette) of 256 or less RGB colors. The act of reducing thousands of colors into 256 unique colors that still produce good quality results is known as *quantization*.
2. Then, you'll need to turn your RGB(A) pixels into an *indexed bitmap*, basically going through each pixel and finding the nearest *index* into the color table for that pixel, based on our reduced palette. In `gifenc`, we call this *applying a palette*. The result of this is a bitmap image where each pixel is an index integer in the range 0..255 that points to a color in your palette.
3. Now, we can *encode* this single frame by writing the indexed bitmap and local palette. This will compress the pixel data with GIF/LZW encoding, and add it to the GIF stream.

There's some situations where you might need to change the way you approach these steps. For example, if you decide to use a single global 256-color palette for a whole animation, you might only need to *quantize* once, and then *applyPalette* to each frame by reducing to the same global palette. In some other cases, you might choose to add *prequantization* or *postquantization* to speed up and improve the quantization results, or perhaps skip steps #2 and #3 if you already have indexed images. Or, you might choose to use dithering, or perhaps another quantizer entirely.

## Running from Source

Git clone this repo, then:

```sh
npm install
```

To run the node test:

```sh
node test/encode_node.js
```

And check `test/output/` folder for the result. Or to benchmark with node:

```sh
# re-build from source
npm run dist:cjs

# run benchmark
node test/bench_node.js
```

Benchmarking/profiling is probably easier with Chrome, and this imports the source directly rather than built version:

```sh
npm run serve
```

Now navigate to [http://localhost:5000/test/bench_web.html](http://localhost:5000/test/bench_web.html).

Similarly, while serving you can 

## More to Come

This library is still a WIP, feel free to open an issue to discuss some things.

## Credits

The code here has been forked/inspired/remixed from these libraries:

- [Gif.js](https://jnordberg.github.io/gif.js/)
- [gif-codec](https://github.com/potomak/gif-codec)
- [PnnQuant.js](https://github.com/mcychan/PnnQuant.js)

## License

MIT, see [LICENSE.md](http://github.com/mattdesl/gifenc/blob/master/LICENSE.md) for details.