import { isAppError } from "./errors.js";

export function jsonResponse(payload, status = 200, headers = {}) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            ...headers
        }
    });
}

export function successResponse(data = {}, status = 200, headers = {}) {
    return jsonResponse({ success: true, data }, status, headers);
}

export function errorResponse(error, headers = {}) {
    if (isAppError(error)) {
        return jsonResponse({
            success: false,
            error: {
                code: error.code,
                message: error.publicMessage || error.message
            }
        }, error.status, headers);
    }

    console.error("Unhandled API error", error?.message || error);
    return jsonResponse({
        success: false,
        error: {
            code: "INTERNAL_ERROR",
            message: "Er ging iets mis. Probeer het later opnieuw."
        }
    }, 500, headers);
}
