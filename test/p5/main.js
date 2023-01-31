const { GIFEncoder, quantize, applyPalette, dither } = window.gifenc;

// a GIF config
const config = {
  duration: 4,
  colors: 256,
  fps: 30,
};

function setup() {
  createCanvas(400, 400);

  // match the frame rate in our config
  frameRate(config.fps || 30);

  // choose a fixed seed for easier testing
  noiseSeed(12);

  // render the GIF immediately
  renderGIF();
}

function draw() {
  let playhead = getPlayhead();

  const gradient = drawingContext.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#42f5e6");
  gradient.addColorStop(1, "#d62bb4");
  noStroke();
  push();
  drawingContext.fillStyle = gradient;
  rect(0, 0, width, height);
  pop();

  for (let i = 0; i < 20; i++) {
    push();
    fill("#a836a8");
    circle(
      (noise(i * 100, 0) * 2 * width * width) % width,
      noise(i * 100, 1000) * height,
      sin(noise(i * 100, 0) + playhead * PI) * 50
    );
    pop();
  }
}

function renderGIF() {
  const dpr = pixelDensity();
  noLoop();
  pixelDensity(1);

  const fps = config.fps || 30;
  const fpsInterval = 1 / fps;
  const delay = fpsInterval * 1000;

  config._frame = 0;
  config._isEncoding = true;
  config._totalFrames = Math.max(1, Math.ceil(config.duration * fps));

  const colors = config.colors || 256;
  const gif = GIFEncoder();

  let interval = setInterval(() => {
    if (config._frame >= config._totalFrames) {
      clearInterval(interval);
      return end();
    }

    redraw();
    const w = canvas.width;
    const h = canvas.height;
    const imgData = drawingContext.getImageData(0, 0, w, h);
    const data = imgData.data;

    const palette = quantize(data, colors);
    // const index = dither(data, w, h, palette);
    const index = applyPalette(data, palette, "rgb444");
    gif.writeFrame(index, w, h, { palette, delay });

    config._frame++;
  });

  async function end() {
    gif.finish();

    const output = gif.bytesView();
    const blob = new Blob([output], { type: "image/gif" });
    // await saveBlob(blob, "download.gif");
    const img = document.createElement("img");
    img.src = URL.createObjectURL(blob);
    document.body.appendChild(img);

    config._isEncoding = false;
    pixelDensity(dpr);
    loop();
  }
}

function getPlayhead() {
  return config._isEncoding
    ? (config._frame || 0) / (config._totalFrames || 1)
    : (millis() / 1000 / config.duration) % 1;
}

function saveBlob(blob, filename) {
  const noop = () => {};
  return new Promise((resolve) => {
    const link = document.createElement("a");
    link.style.visibility = "hidden";
    link.target = "_blank";
    link.download = filename;
    link.href = window.URL.createObjectURL(blob);
    document.body.appendChild(link);
    link.onclick = () => {
      link.onclick = noop;
      setTimeout(() => {
        window.URL.revokeObjectURL(blob);
        if (link.parentElement) link.parentElement.removeChild(link);
        link.removeAttribute("href");
        resolve({ filename });
      }, 25);
    };
    link.click();
  });
}
