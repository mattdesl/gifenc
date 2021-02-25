# gifenc

[![experimental](http://badges.github.io/stability-badges/dist/experimental.svg)](http://github.com/badges/stability-badges)

A fast and lightweight pure-JavaScript GIF encoder. Features:

- Supports many standard GIF features: image, animation, transparency
- Highly optimized for V8
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

You can see a simple example here.

You can see a more advanced example of this encoder in action inside [looom-tools.netlify.app](https://looom-tools.netlify.app/).

Also see [./test/node-encode.js](./test/node-encode.js) for a pure Node.js example.

Basic code example:

```js
import { GIFEncoder, quantize, applyPalette } from 'gifenc';

// Get your RGBA image into Uint8Array data, such as from canvas
const { data, width, height } = /* ... getImageData() ... */;

// Wrap RGBA in a typed buffer view for faster access
const uint32 = new Uint32Array(data.buffer);

// Get a 256-color RGB palette
const palette = quantize(uint32, 256);

// Get an indexed bitmap by reducing each pixel to the nearest color palette
const index = applyPalette(uint23, palette);

// Create an encoding stream
const gif = GIFEncoder();

// Write a single frame
gif.writeFrame(index, width, height, { palette });

// Write end-of-stream character
gif.finish();

// Get the Uint8Array output of your binary GIF file
const output = gif.bytes();
```

## Usage

Documentation for this library is still being worked on. Come back later.

## Credits

The code here has been forked/inspired/remixed from these libraries:

- [Gif.js](https://jnordberg.github.io/gif.js/)
- [gif-codec](https://github.com/potomak/gif-codec)
- [PnnQuant.js](https://github.com/mcychan/PnnQuant.js)

## License

MIT, see [LICENSE.md](http://github.com/mattdesl/gifenc/blob/master/LICENSE.md) for details.
