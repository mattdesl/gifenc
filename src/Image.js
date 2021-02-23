const MAX_COLORS = 256;

function Image(width, height, transparentColor, bitmap) {
  this.width = width;
  this.height = height;
  this.colorTable = [];
  this.indexedBitmap = [];
  this.transparentColorIndex = null;
  let i = 0;
  bitmap.reduce((colorMap, color) => {
    let key = [color.r, color.g, color.b].join(",");
    if (!colorMap.hasOwnProperty(key)) {
      this.colorTable[i++] = color;
      colorMap[key] = i - 1;
    }
    if (color === transparentColor) {
      this.transparentColorIndex = colorMap[key];
    }
    this.indexedBitmap.push(colorMap[key]);
    return colorMap;
  }, {});

  if (this.colorTable.length > MAX_COLORS) {
    throw "Too many colors";
  }
}

export default Image;
