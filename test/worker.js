import {
  GIFEncoder, quantize, applyPalette
} from '/src/index.js';

let options;

self.addEventListener('message', ev => {
  const detail = ev.data;
  if (detail.event === 'init') {
    // Upon init, save our options
    options = { ...detail };
    // And send back a ready event
    self.postMessage('ready');
  } else {
    // Get the options for the encoder
    const {
      format = 'rgb444',
      width,
      height,
      maxColors = 256,
      repeat = 0,
      delay = 0
    } = options;

    // Get the data + index for this frame
    const [
      data,
      frame
    ] = detail;

    // Get palette from this frame
    const palette = quantize(data, maxColors, { format });

    // Now get an indexed bitmap image
    const index = applyPalette(data, palette, format);

    // Encode into a single GIF frame chunk
    const gif = GIFEncoder({ auto: false });
    gif.writeFrame(index, width, height, {
      first: frame === 0,
      repeat: 0,
      delay,
      palette,
    });

    // Send the result back ot main thread
    const output = gif.bytesView();
    self.postMessage([ output, frame ], [output.buffer]);
  }
});