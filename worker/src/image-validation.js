import { AppError } from "./errors.js";

export const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;

function isWebp(bytes) {
    return bytes[0] === 0x52 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x46 &&
        bytes[8] === 0x57 &&
        bytes[9] === 0x45 &&
        bytes[10] === 0x42 &&
        bytes[11] === 0x50;
}

export async function validateWebpFile(file) {
    if (!file || typeof file.arrayBuffer !== "function") {
        throw new AppError(400, "VALIDATION_ERROR", "Kies een posterbestand.");
    }

    if (file.type !== "image/webp") {
        throw new AppError(415, "UNSUPPORTED_MEDIA_TYPE", "Gebruik een WebP-afbeelding.");
    }

    if (file.size > MAX_IMAGE_BYTES) {
        throw new AppError(413, "PAYLOAD_TOO_LARGE", "De afbeelding is groter dan 1,5 MB.");
    }

    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer.slice(0, 12));

    if (!isWebp(bytes)) {
        throw new AppError(415, "UNSUPPORTED_MEDIA_TYPE", "Het bestand is geen geldige WebP-afbeelding.");
    }

    return buffer;
}

export function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunkSize = 0x8000;

    for (let index = 0; index < bytes.length; index += chunkSize) {
        const chunk = bytes.subarray(index, index + chunkSize);
        binary += String.fromCharCode(...chunk);
    }

    if (typeof btoa === "function") {
        return btoa(binary);
    }

    return Buffer.from(binary, "binary").toString("base64");
}
