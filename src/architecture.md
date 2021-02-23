# multi-threading

Main thread sends image data to worker pool
each worker is:
  - quantize (if desired)
  - dither (if desired)
  - lzw compress
  - send compressed frame back to main thread
    with frame index

