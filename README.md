# gifenc

[![experimental](http://badges.github.io/stability-badges/dist/experimental.svg)](http://github.com/badges/stability-badges)

A fast and lightweight pure-JavaScript GIF encoder. Features:

- Supports many standard GIF features: image, animation, transparency
- Highly optimized for V8
- Small library footprint
- Can easily be used across multiple web workers for multi-core devices
- Allows full control over encoding indices & per frame color palette
- Fast built-in color quantizer based on a port of PnnQuant.js, which is based on "Pairwise Nearest Neighbor Clustering" [1](https://pdfs.semanticscholar.org/68b4/236e77d6026943ffa009d8b3553ace09a922.pdf) [2](https://github.com/mcychan/PnnQuant.js) [3](https://github.com/mcychan/nQuant.j2se)
- Fast built-in palette mapping (reducing colors to their nearest paletted index)

This library is a little lower level than something like [GIF.js](https://jnordberg.github.io/gif.js/), but gives much better speed (i.e. twice as fast) with similar visual results for many types of images. Because there is currently no dithering support, and because of the current choice of color quantizer, this encoder is probably best suited for simple flat-style vector graphics, rather than photographs or video that might need special handling across frames (e.g. temporal dithering) or better perceptual color quantizers.

Some features that could be explored in a future version:

- Alternative color quantizers
- Alternative palette mapping (such as perceptually based)
- Dithering support
- WASM-based speed optimizations

## Example

You can see an example of this encoder in action inside [looom-tools.netlify.app](https://looom-tools.netlify.app/).

## Usage

This library is not yet documented. Come back later.

## License

MIT, see [LICENSE.md](http://github.com/mattdesl/gifenc/blob/master/LICENSE.md) for details.
