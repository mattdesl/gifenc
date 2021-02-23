function OutputStream () {
  this.output = []
  this.offset = 0
  this.bitOffset = 0
}

OutputStream.prototype.pack = function (codeLength, code) {
  if (!this.output[this.offset]) {
    this.output[this.offset] = 0
  }

  for (let i = 0; i < codeLength; i++) {
    if (this.bitOffset > 7) {
      this.output[++this.offset] = 0
      this.bitOffset = 0
    }
    this.output[this.offset] += (code & 0x1) << this.bitOffset
    code >>= 1
    this.bitOffset++
  }

  this.offset += Math.floor(this.bitOffset / 8)
  this.bitOffset %= 8
}

export default OutputStream
