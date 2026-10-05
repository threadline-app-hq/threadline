// Stored image dimensions describe the displayed image, including JPEG orientation.
const dimensions = (w, h) => w > 0 && h > 0 ? { w, h } : null;
const exifOrientation = b => {
  try {
    if (b.subarray(0, 6).toString('latin1') !== 'Exif\0\0') return null;
    const t = b.subarray(6), order = t.subarray(0, 2).toString('latin1');
    if (order !== 'II' && order !== 'MM') return 1;
    const u16 = offset => order === 'II' ? t.readUInt16LE(offset) : t.readUInt16BE(offset);
    const u32 = offset => order === 'II' ? t.readUInt32LE(offset) : t.readUInt32BE(offset);
    if (u16(2) !== 42) return 1;
    const offset = u32(4), count = u16(offset);
    for (let i = 0; i < count; i++) {
      const entry = offset + 2 + i * 12;
      if (entry + 12 > t.length) return 1;
      if (u16(entry) === 0x112 && u16(entry + 2) === 3 && u32(entry + 4) === 1) {
        const value = u16(entry + 8);
        return value >= 1 && value <= 8 ? value : 1;
      }
    }
  } catch { /* Missing or damaged optional EXIF does not hide a readable photo. */ }
  return 1;
};
export const imageDims = (b, ext) => {
  try {
    if (ext === 'png') {
      if (b.length < 33 || b.readUInt32BE(8) !== 13 || b.subarray(12, 16).toString() !== 'IHDR') return null;
      return dimensions(b.readUInt32BE(16), b.readUInt32BE(20));
    }
    if (ext === 'webp') {
      if (b.length < 20 || b.readUInt32LE(4) + 8 > b.length) return null;
      const tag = b.subarray(12, 16).toString('latin1'), length = b.readUInt32LE(16);
      if (length + 20 > b.length) return null;
      if (tag === 'VP8 ' && length >= 10 && b.subarray(23, 26).equals(Buffer.from([0x9d, 1, 0x2a]))) return dimensions(b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff);
      if (tag === 'VP8L' && length >= 5 && b[20] === 0x2f) return dimensions(1 + (((b[22] & 0x3f) << 8) | b[21]), 1 + (((b[24] & 0xf) << 10) | (b[23] << 2) | ((b[22] & 0xc0) >> 6)));
      if (tag === 'VP8X' && length === 10) return dimensions(1 + (b[24] | b[25] << 8 | b[26] << 16), 1 + (b[27] | b[28] << 8 | b[29] << 16));
      return null;
    }
    if (ext !== 'jpg') return null;
    let i = 2, size = null, orientation = 1;
    while (i + 1 < b.length) {
      if (b[i] !== 0xff) return null;
      while (b[i] === 0xff) i++;
      const marker = b[i++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0xd8 || marker === 1 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (i + 2 > b.length) return null;
      const length = b.readUInt16BE(i);
      if (length < 2 || i + length > b.length) return null;
      if (marker === 0xe1) orientation = exifOrientation(b.subarray(i + 2, i + length)) ?? orientation;
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        if (length < 8) return null;
        size = dimensions(b.readUInt16BE(i + 5), b.readUInt16BE(i + 3));
      }
      i += length;
    }
    return size && orientation >= 5 ? { w: size.h, h: size.w } : size;
  } catch { return null; }
};
