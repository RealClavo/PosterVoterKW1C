import { AppError } from "./errors.js";

export const LOCATIONS = new Set(["veghel", "den-bosch"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NAME_PATTERN = /^[\p{L}\p{M}\p{N} '\-]+$/u;
const HASH_PATTERN = /^[0-9a-f]{64}$/i;

function normalizeText(value) {
    return String(value ?? "").trim().replace(/\s+/g, " ");
}

function hasHtml(value) {
    return /<[^>]*>|[<>]/.test(value);
}

export function isUuid(value) {
    return typeof value === "string" && UUID_PATTERN.test(value);
}

export function isValidIsoDate(value) {
    return typeof value === "string" && !Number.isNaN(new Date(value).getTime());
}

export function validateLocation(value) {
    if (!LOCATIONS.has(value)) {
        throw new AppError(400, "VALIDATION_ERROR", "Kies Veghel of Den Bosch.");
    }

    return value;
}

export function validateUuid(value, label = "ID") {
    if (!isUuid(value)) {
        throw new AppError(400, "VALIDATION_ERROR", `${label} is ongeldig.`);
    }

    return value;
}

export function validateBrowserId(value) {
    return validateUuid(value, "Browser-ID");
}

export function validateText(value, { label, min, max, namePattern = false }) {
    const normalized = normalizeText(value);

    if (normalized.length < min || normalized.length > max || hasHtml(normalized)) {
        throw new AppError(400, "VALIDATION_ERROR", "Controleer de ingevulde gegevens.");
    }

    if (namePattern && !NAME_PATTERN.test(normalized)) {
        throw new AppError(400, "VALIDATION_ERROR", "Controleer de ingevulde gegevens.");
    }

    return normalized;
}

export function validateTitle(value) {
    return validateText(value, { label: "Titel", min: 2, max: 80 });
}

export function validateCreatorName(value) {
    return validateText(value, { label: "Maker", min: 2, max: 60, namePattern: true });
}

export function validateVoterName(value) {
    return validateText(value, { label: "Stemnaam", min: 2, max: 32, namePattern: true });
}

export function validateSearchTerm(value) {
    const normalized = normalizeText(value);

    if (hasHtml(normalized) || normalized.length > 80) {
        throw new AppError(400, "VALIDATION_ERROR", "Controleer de zoekterm.");
    }

    return normalized;
}

export function assertDatabaseIsValid(database) {
    // De Worker schrijft nooit door als de JSON-structuur niet klopt. Zo voorkomen we dat corrupte data wordt overschreven.
    const posterIds = new Set();

    if (!database || typeof database !== "object" || Array.isArray(database)) {
        throw new AppError(500, "DATABASE_INVALID", "De database is tijdelijk niet beschikbaar.");
    }

    if (typeof database.version !== "number" || !isValidIsoDate(database.updatedAt) || !Array.isArray(database.posters)) {
        throw new AppError(500, "DATABASE_INVALID", "De database is tijdelijk niet beschikbaar.");
    }

    database.posters.forEach((poster) => {
        if (!poster || typeof poster !== "object" || Array.isArray(poster)) {
            throw new AppError(500, "DATABASE_INVALID", "De database is tijdelijk niet beschikbaar.");
        }

        if (!isUuid(poster.id) || posterIds.has(poster.id)) {
            throw new AppError(500, "DATABASE_INVALID", "De database is tijdelijk niet beschikbaar.");
        }

        posterIds.add(poster.id);

        if (typeof poster.title !== "string" || typeof poster.creatorName !== "string" || !LOCATIONS.has(poster.location)) {
            throw new AppError(500, "DATABASE_INVALID", "De database is tijdelijk niet beschikbaar.");
        }

        if (typeof poster.imagePath !== "string" || !/^assets\/uploads\/[0-9a-f-]+\.webp$/i.test(poster.imagePath)) {
            throw new AppError(500, "DATABASE_INVALID", "De database is tijdelijk niet beschikbaar.");
        }

        if (!isValidIsoDate(poster.createdAt) || typeof poster.isVisible !== "boolean" || !Array.isArray(poster.votes)) {
            throw new AppError(500, "DATABASE_INVALID", "De database is tijdelijk niet beschikbaar.");
        }

        const voteIds = new Set();

        poster.votes.forEach((vote) => {
            if (!vote || typeof vote !== "object" || Array.isArray(vote)) {
                throw new AppError(500, "DATABASE_INVALID", "De database is tijdelijk niet beschikbaar.");
            }

            if (!isUuid(vote.id) || voteIds.has(vote.id)) {
                throw new AppError(500, "DATABASE_INVALID", "De database is tijdelijk niet beschikbaar.");
            }

            voteIds.add(vote.id);

            if (typeof vote.voterName !== "string" || !HASH_PATTERN.test(vote.voterHash) || !isValidIsoDate(vote.createdAt)) {
                throw new AppError(500, "DATABASE_INVALID", "De database is tijdelijk niet beschikbaar.");
            }
        });
    });

    return true;
}

export function assertHoneypotIsEmpty(value) {
    if (String(value ?? "").trim() !== "") {
        throw new AppError(400, "VALIDATION_ERROR", "Controleer de ingevulde gegevens.");
    }
}
