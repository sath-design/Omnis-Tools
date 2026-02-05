/**
 * Patched EXIF-JS (ESM Version)
 * Fixes: ReferenceError: n is not defined
 * Enhancements: Supports ArrayBuffer directly in readFromBinaryFile and auto-detects JPEG
 */

const EXIF = {};

EXIF.Tags = {
    0x9000: "ExifVersion",
    0xA000: "FlashpixVersion",
    0xA001: "ColorSpace",
    0xA002: "PixelXDimension",
    0xA003: "PixelYDimension",
    0x9101: "ComponentsConfiguration",
    0x9102: "CompressedBitsPerPixel",
    0x927C: "MakerNote",
    0x9286: "UserComment",
    0x9003: "DateTimeOriginal",
    0x9004: "DateTimeDigitized",
    0x829A: "ExposureTime",
    0x829D: "FNumber",
    0x8822: "ExposureProgram",
    0x8827: "ISOSpeedRatings",
    0x9201: "ShutterSpeedValue",
    0x9202: "ApertureValue",
    0x9203: "BrightnessValue",
    0x9204: "ExposureBias",
    0x9207: "MeteringMode",
    0x9208: "LightSource",
    0x9209: "Flash",
    0x920A: "FocalLength",
    0x8298: "Copyright",
    0x0110: "Model",
    0x010F: "Make",
    0x0132: "DateTime",
    0x8825: "GPSInfoIFDPointer"
};

EXIF.TiffTags = {
    0x0100: "ImageWidth",
    0x0101: "ImageHeight",
    0x8769: "ExifIFDPointer",
    0x8825: "GPSInfoIFDPointer",
    0x0112: "Orientation",
    0x0132: "DateTime",
    0x010E: "ImageDescription",
    0x010F: "Make",
    0x0110: "Model",
    0x0131: "Software",
    0x013B: "Artist",
    0x8298: "Copyright"
};

EXIF.GPSTags = {
    0x0001: "GPSLatitudeRef",
    0x0002: "GPSLatitude",
    0x0003: "GPSLongitudeRef",
    0x0004: "GPSLongitude",
    0x0005: "GPSAltitudeRef",
    0x0006: "GPSAltitude",
    0x0007: "GPSTimeStamp",
    0x001D: "GPSDateStamp"
};

function getStringFromDB(buffer, start, length) {
    let outstr = "";
    for (let i = start; i < start + length; i++) {
        outstr += String.fromCharCode(buffer.getUint8(i));
    }
    return outstr;
}

function readTagValue(file, entryOffset, tiffStart, bigEnd) {
    const type = file.getUint16(entryOffset + 2, !bigEnd);
    const numValues = file.getUint32(entryOffset + 4, !bigEnd);
    const valueOffset = file.getUint32(entryOffset + 8, !bigEnd) + tiffStart;

    switch (type) {
        case 2: // ASCII
            const offset = numValues > 4 ? valueOffset : (entryOffset + 8);
            return getStringFromDB(file, offset, numValues - 1);
        case 5: // Rational
            const num = file.getUint32(valueOffset, !bigEnd);
            const den = file.getUint32(valueOffset + 4, !bigEnd);
            return num / den;
        default:
            return null;
    }
}

function readTags(file, tiffStart, dirStart, strings, bigEnd) {
    const entries = file.getUint16(dirStart, !bigEnd);
    const tags = {};
    for (let i = 0; i < entries; i++) {
        const entryOffset = dirStart + i * 12 + 2;
        const tagId = file.getUint16(entryOffset, !bigEnd);
        const tag = strings[tagId];
        if (tag) {
            tags[tag] = readTagValue(file, entryOffset, tiffStart, bigEnd);
        }
    }
    return tags;
}

function readEXIFData(file, start) {
    if (getStringFromDB(file, start, 4) !== "Exif") return false;

    const tiffOffset = start + 6;
    let bigEnd;
    if (file.getUint16(tiffOffset) === 0x4949) bigEnd = false;
    else if (file.getUint16(tiffOffset) === 0x4D4D) bigEnd = true;
    else return false;

    if (file.getUint16(tiffOffset + 2, !bigEnd) !== 0x002A) return false;

    const firstIFDOffset = file.getUint32(tiffOffset + 4, !bigEnd);
    if (firstIFDOffset < 0x00000008) return false;

    const tags = readTags(file, tiffOffset, tiffOffset + firstIFDOffset, EXIF.TiffTags, bigEnd);

    if (tags.ExifIFDPointer) {
        const exifData = readTags(file, tiffOffset, tiffOffset + tags.ExifIFDPointer, EXIF.Tags, bigEnd);
        for (const tag in exifData) {
            tags[tag] = exifData[tag];
        }
    }

    if (tags.GPSInfoIFDPointer) {
        const gpsData = readTags(file, tiffOffset, tiffOffset + tags.GPSInfoIFDPointer, EXIF.GPSTags, bigEnd);
        for (const tag in gpsData) {
            tags[tag] = gpsData[tag];
        }
    }

    return tags;
}

function findEXIFinJPEG(file) {
    const dataView = new DataView(file);
    if ((dataView.getUint8(0) !== 0xFF) || (dataView.getUint8(1) !== 0xD8)) return false;
    let offset = 2;
    while (offset < file.byteLength) {
        if (dataView.getUint8(offset) !== 0xFF) return false;
        const marker = dataView.getUint8(offset + 1);
        if (marker === 225) {
            return readEXIFData(dataView, offset + 4);
        } else {
            offset += 2 + dataView.getUint16(offset + 2);
        }
    }
}

// Public API
EXIF.getData = function (img, callback) {
    if (img.src && /^data\:/i.test(img.src)) {
        const base64 = img.src.split(',')[1];
        const binary = atob(base64);
        const buffer = new ArrayBuffer(binary.length);
        const view = new Uint8Array(buffer);
        for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
        img.exifdata = findEXIFinJPEG(buffer) || {};
        if (callback) callback.call(img);
        return true;
    }
    return false;
};

EXIF.readFromBinaryFile = function (file) {
    let dataView = file;
    if (file instanceof ArrayBuffer) {
        dataView = new DataView(file);
    }

    // Auto-detect JPEG header to be helpful
    if (dataView.byteLength >= 2 && dataView.getUint8(0) === 0xFF && dataView.getUint8(1) === 0xD8) {
        return findEXIFinJPEG(dataView.buffer);
    }

    return readEXIFData(dataView, 0);
};

EXIF.getAllTags = function (img) {
    return img.exifdata || {};
};

export default EXIF;
