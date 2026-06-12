import { AppError } from "./errors.js";

const DEFAULT_ALLOWED_ORIGINS = [
    "https://realclavo.github.io",
    "http://localhost:5500",
    "http://127.0.0.1:5500"
];

export function getAllowedOrigins(env) {
    const configuredOrigins = String(env.ALLOWED_ORIGINS || "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);

    return configuredOrigins.length > 0 ? configuredOrigins : DEFAULT_ALLOWED_ORIGINS;
}

export function getCorsHeaders(request, env) {
    const origin = request.headers.get("Origin");
    const headers = {
        Vary: "Origin"
    };

    if (origin && getAllowedOrigins(env).includes(origin)) {
        headers["Access-Control-Allow-Origin"] = origin;
        headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS";
        headers["Access-Control-Allow-Headers"] = "Content-Type";
        headers["Access-Control-Max-Age"] = "86400";
    }

    return headers;
}

export function optionsResponse(request, env) {
    return new Response(null, {
        status: 204,
        headers: getCorsHeaders(request, env)
    });
}

export function assertAllowedPostOrigin(request, env) {
    const origin = request.headers.get("Origin");

    if (!origin || !getAllowedOrigins(env).includes(origin)) {
        throw new AppError(403, "FORBIDDEN_ORIGIN", "Deze aanvraag is niet toegestaan.");
    }
}
