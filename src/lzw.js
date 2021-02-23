import OutputStream from "./output_stream.js";

const MAX_CODE_VALUE = 4095;

const codeTable = new Array(MAX_CODE_VALUE).fill(0).map((_, i) => {
  return String.fromCharCode(i);
});

const compress = (codeSize, bytes) => {
  let codeLength = codeSize + 1;
  let dictSize = (1 << codeSize) + 2;

  // console.log(codeSize, dictSize);
  // Reserved codes:
  // * clear code (CC)
  // * end of information (EOI)
  const clearCode = 1 << codeSize;
  const endOfInformation = (1 << codeSize) + 1;

  let outputStream = new OutputStream();
  // Start the code stream with the CC
  outputStream.pack(codeLength, clearCode);
  if (bytes.length === 0) {
    outputStream.pack(codeLength, endOfInformation);
    return outputStream.output;
  }

  let dict;
  reset();

  let sequence = "";
  for (let i = 0; i < bytes.length; i++) {
    const char = String.fromCharCode(bytes[i]);
    const join = sequence + char;
    if (dict.has(join)) {
      sequence = join;
      continue;
    }

    outputStream.pack(codeLength, dict.get(sequence));
    dict.set(join, dictSize++);
    sequence = char;

    if (dictSize > MAX_CODE_VALUE) {
      outputStream.pack(codeLength, clearCode);
      reset();
    } else if (dictSize > 1 << codeLength) {
      codeLength++;
    }
  }

  outputStream.pack(codeLength, dict[sequence]);
  outputStream.pack(codeLength, endOfInformation);

  return outputStream.output;

  function reset() {
    codeLength = codeSize + 1;
    dictSize = (1 << codeSize) + 2;
    dict = initCompressDictionary(dictSize);
  }

  function initCompressDictionary(dictSize) {
    let dict = new Map();
    for (let i = 0; i < dictSize; i++) {
      dict.set(String.fromCharCode(i), i);
    }
    return dict;
  }
};

export default {
  compress,
};
