import { AppError } from "./errors.js";
import { validateBrowserId } from "./validation.js";

const cooldownBuckets = new Map();

function textToHex(buffer) {
    return [...new Uint8Array(buffer)]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}

function clientKey(request, action) {
    const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim();
    return `${action}:${ip || request.headers.get("Origin") || "unknown"}`;
}

export function assertBodyLimit(request, maxBytes) {
    const length = Number(request.headers.get("Content-Length") || 0);

    if (length > maxBytes) {
        throw new AppError(413, "PAYLOAD_TOO_LARGE", "Het bestand of formulier is te groot.");
    }
}

export function assertCooldown(request, action) {
    // Best-effort cooldown in geheugen. Dit helpt tegen spam, maar is geen permanente database.
    const now = Date.now();
    const limit = action === "upload" ? 3 : 10;
    const windowMs = action === "upload" ? 60 * 60 * 1000 : 60 * 1000;
    const key = clientKey(request, action);
    const bucket = cooldownBuckets.get(key) ?? [];
    const recent = bucket.filter((timestamp) => now - timestamp < windowMs);

    if (recent.length >= limit) {
        throw new AppError(429, "RATE_LIMITED", "Er zijn te veel aanvragen gedaan. Probeer het later opnieuw.");
    }

    recent.push(now);
    cooldownBuckets.set(key, recent);
}

export async function createVoterHash(env, posterId, browserId) {
    validateBrowserId(browserId);

    if (!env.VOTER_HASH_SECRET) {
        throw new AppError(500, "CONFIGURATION_ERROR", "De API is nog niet volledig ingesteld.");
    }

    const encoder = new TextEncoder();
    // De ruwe browser-ID wordt niet opgeslagen. Alleen deze HMAC-hash komt in data/posters.json terecht.
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(env.VOTER_HASH_SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`${posterId}:${browserId}`));
    return textToHex(signature);
}

export async function verifyTurnstileIfEnabled(env, token, request) {
    if (!env.TURNSTILE_SECRET_KEY) {
        return;
    }

    if (!token) {
        throw new AppError(403, "TURNSTILE_REQUIRED", "Verificatie is mislukt.");
    }

    const formData = new FormData();
    formData.append("secret", env.TURNSTILE_SECRET_KEY);
    formData.append("response", token);

    const remoteIp = request.headers.get("CF-Connecting-IP");

    if (remoteIp) {
        formData.append("remoteip", remoteIp);
    }

    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body: formData
    });
    const payload = await response.json().catch(() => null);

    if (!payload?.success) {
        throw new AppError(403, "TURNSTILE_FAILED", "Verificatie is mislukt.");
    }
}
