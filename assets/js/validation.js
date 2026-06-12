const NAME_PATTERN = /^[\p{L}\p{M}\p{N} '\-]+$/u;

function normalizeText(value) {
    return String(value ?? "").trim().replace(/\s+/g, " ");
}

function hasHtmlTag(value) {
    return /<[^>]*>|[<>]/.test(value);
}

function result(valid, message, value = "") {
    return { valid, message, value };
}

export function validatePlainText(value, minLength, maxLength, label, allowNamePattern = false) {
    const normalized = normalizeText(value);

    if (normalized.length < minLength) {
        return result(false, `${label} moet minimaal ${minLength} tekens bevatten.`, normalized);
    }

    if (normalized.length > maxLength) {
        return result(false, `${label} mag maximaal ${maxLength} tekens bevatten.`, normalized);
    }

    if (hasHtmlTag(normalized)) {
        return result(false, `${label} mag geen HTML bevatten.`, normalized);
    }

    if (allowNamePattern && !NAME_PATTERN.test(normalized)) {
        return result(false, `${label} mag alleen letters, cijfers, spaties, apostrofs en koppeltekens bevatten.`, normalized);
    }

    return result(true, "", normalized);
}

export function validateTitle(value) {
    return validatePlainText(value, 2, 80, "Titel");
}

export function validateCreatorName(value) {
    return validatePlainText(value, 2, 60, "Naam van de maker", true);
}

export function validateVoteName(value) {
    return validatePlainText(value, 2, 32, "Stemnaam", true);
}

export function validateLocation(value) {
    if (value === "veghel" || value === "den-bosch") {
        return result(true, "", value);
    }

    return result(false, "Kies Veghel of Den Bosch.", "");
}

export function validateImageFile(file) {
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

    if (!file) {
        return result(false, "Kies eerst een posterbestand.");
    }

    if (!allowedTypes.has(file.type)) {
        return result(false, "Gebruik een JPG, PNG of WebP-bestand.");
    }

    return result(true, "", file);
}
