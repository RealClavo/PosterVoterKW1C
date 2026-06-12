import { CONFIG } from "../config.js";

export class ApiError extends Error {
    constructor(message, code = "API_ERROR", status = 0) {
        super(message);
        this.name = "ApiError";
        this.code = code;
        this.status = status;
    }
}

function buildUrl(path, params = {}) {
    const base = CONFIG.apiBaseUrl.replace(/\/$/, "");
    const url = new URL(`${base}${path}`);

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            url.searchParams.set(key, value);
        }
    });

    return url;
}

async function safeJson(response) {
    try {
        return await response.json();
    } catch (error) {
        return null;
    }
}

async function request(path, options = {}) {
    // Alle API-calls lopen door deze functie, zodat time-outs en foutmeldingen overal hetzelfde werken.
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
        controller.abort();
    }, CONFIG.requestTimeoutMs);

    try {
        const response = await fetch(path, {
            ...options,
            signal: controller.signal,
            headers: {
                Accept: "application/json",
                ...(options.headers ?? {})
            }
        });
        const payload = await safeJson(response);

        if (!response.ok || !payload?.success) {
            const error = payload?.error ?? {};
            throw new ApiError(error.message || "De API-aanvraag is mislukt.", error.code || "API_ERROR", response.status);
        }

        return payload.data;
    } catch (error) {
        if (error.name === "AbortError") {
            throw new ApiError("De aanvraag duurde te lang. Probeer het opnieuw.", "REQUEST_TIMEOUT", 0);
        }

        if (error instanceof ApiError) {
            throw error;
        }

        throw new ApiError("De API is niet bereikbaar.", "NETWORK_ERROR", 0);
    } finally {
        window.clearTimeout(timeoutId);
    }
}

export async function healthCheck() {
    return request(buildUrl("/health"));
}

export async function getPosters(options = {}) {
    return request(buildUrl("/posters", options));
}

export async function getPoster(id, browserId = "") {
    return request(buildUrl(`/posters/${encodeURIComponent(id)}`, { browserId }));
}

export async function getStatistics() {
    return request(buildUrl("/statistics"));
}

export async function castVote(posterId, voterName, browserId, turnstileToken = "") {
    return request(buildUrl(`/posters/${encodeURIComponent(posterId)}/vote`), {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            voterName,
            browserId,
            turnstileToken,
            website: ""
        })
    });
}

export async function uploadPoster(formData) {
    return request(buildUrl("/posters"), {
        method: "POST",
        body: formData
    });
}
