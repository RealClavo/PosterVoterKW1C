const MAX_EDGE = 1800;
const TARGET_SIZE = 1.5 * 1024 * 1024;
const MIN_QUALITY = 0.55;
const QUALITY_STEP = 0.06;

function canvasToBlob(canvas, quality) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error("De afbeelding kon niet worden verwerkt."));
                return;
            }

            resolve(blob);
        }, "image/webp", quality);
    });
}

async function decodeImage(file) {
    if ("createImageBitmap" in window) {
        return createImageBitmap(file);
    }

    return new Promise((resolve, reject) => {
        const image = new Image();
        const url = URL.createObjectURL(file);

        image.onload = () => {
            URL.revokeObjectURL(url);
            resolve(image);
        };

        image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Het bestand kon niet als afbeelding worden geopend."));
        };

        image.src = url;
    });
}

function getScaledSize(width, height, maxEdge) {
    const longestSide = Math.max(width, height);

    if (longestSide <= maxEdge) {
        return { width, height };
    }

    const scale = maxEdge / longestSide;
    return {
        width: Math.round(width * scale),
        height: Math.round(height * scale)
    };
}

function drawToCanvas(source, size) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { alpha: false });

    canvas.width = size.width;
    canvas.height = size.height;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, size.width, size.height);
    context.drawImage(source, 0, 0, size.width, size.height);
    return canvas;
}

export async function processImageFile(file) {
    // De browser tekent de afbeelding opnieuw op canvas. Daardoor blijft de verhouding gelijk en verdwijnt metadata.
    const image = await decodeImage(file);
    let size = getScaledSize(image.width, image.height, MAX_EDGE);
    let canvas = drawToCanvas(image, size);
    let quality = 0.85;
    let blob = await canvasToBlob(canvas, quality);

    // Eerst proberen we de bestandsgrootte omlaag te krijgen door WebP-kwaliteit stap voor stap te verlagen.
    while (blob.size > TARGET_SIZE && quality > MIN_QUALITY) {
        quality = Math.max(MIN_QUALITY, quality - QUALITY_STEP);
        blob = await canvasToBlob(canvas, quality);
    }

    // Als kwaliteit alleen niet genoeg is, schalen we de afbeelding voorzichtig kleiner zonder te vervormen.
    while (blob.size > TARGET_SIZE && Math.max(size.width, size.height) > 900) {
        size = {
            width: Math.round(size.width * 0.9),
            height: Math.round(size.height * 0.9)
        };
        canvas = drawToCanvas(image, size);
        quality = 0.78;
        blob = await canvasToBlob(canvas, quality);
    }

    if (typeof image.close === "function") {
        image.close();
    }

    if (blob.size > TARGET_SIZE) {
        throw new Error("De afbeelding blijft groter dan 1,5 MB. Kies een kleinere afbeelding.");
    }

    const processedFile = new File([blob], "poster.webp", { type: "image/webp" });

    return {
        file: processedFile,
        width: size.width,
        height: size.height,
        size: processedFile.size,
        originalSize: file.size
    };
}
