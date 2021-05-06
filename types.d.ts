type Format = "rgb565" | "rgb444" | "rgba4444";

type QuantizeOptions = {
  format?: Format;
  oneBitAlpha?: boolean | number;
  clearAlpha?: boolean;
  clearAlphaThreshold?: number;
  clearAlphaColor?: number;
};

type GIFEncoderOpts = {
  auto?: boolean;
  initialCapacity?: number;
};

type WriteFrameOpts = {
  palette?: number[][];
  first?: boolean;
  transparent?: boolean;
  transparentIndex?: number;
  delay?: number;
  repeat?: number;
  dispose?: number;
};

type Encoder = {
  writeFrame: (
    index: Uint8Array,
    width: number,
    height: number,
    ops?: WriteFrameOpts
  ) => void;
  finish: () => void;
  bytes: () => Uint8Array;
  bytesView: () => Uint8Array;
  writeHeader: () => void;
  reset: () => void;
  buffer: ArrayBuffer;
  stream: any;
};

export declare function quantize(
  rgba: Uint8Array | Uint8ClampedArray,
  maxColors: number,
  options?: QuantizeOptions
): number[][];

export declare function applyPalette(
  rgba: Uint8Array | Uint8ClampedArray,
  palette: number[][],
  format?: Format
): Uint8Array;

export declare function GIFEncoder (opts?: GIFEncoderOpts): Encoder;

export declare function nearestColorIndex(
  palette: number[][],
  pixel: [number, number, number] | [number, number, number]
): number;

export declare function nearestColorIndexWithDistance(
  palette: number[][],
  pixel: [number, number, number] | [number, number, number]
): [number, number];

