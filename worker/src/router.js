import { assertAllowedPostOrigin, getCorsHeaders, optionsResponse } from "./cors.js";
import { AppError } from "./errors.js";
import { createPoster, getPosterById, getPosterStatistics, listPosters } from "./poster-service.js";
import { errorResponse, successResponse } from "./responses.js";
import { assertBodyLimit } from "./security.js";
import { castVote } from "./vote-service.js";

const VOTE_BODY_LIMIT = 20 * 1024;
const UPLOAD_BODY_LIMIT = 2.5 * 1024 * 1024;

function pathParts(pathname) {
    return pathname.replace(/^\/+|\/+$/g, "").split("/");
}

function healthData(env) {
    return {
        status: "ok",
        repository: `${env.GITHUB_OWNER || "RealClavo"}/${env.GITHUB_REPO || "PosterVoterKW1C"}`,
        branch: env.GITHUB_BRANCH || "main",
        time: new Date().toISOString()
    };
}

export async function handleRequest(request, env) {
    const corsHeaders = getCorsHeaders(request, env);

    if (request.method === "OPTIONS") {
        return optionsResponse(request, env);
    }

    try {
        const url = new URL(request.url);
        const parts = pathParts(url.pathname);

        if (parts[0] !== "api") {
            throw new AppError(404, "NOT_FOUND", "Endpoint niet gevonden.");
        }

        if (request.method === "GET" && parts[1] === "health" && parts.length === 2) {
            return successResponse(healthData(env), 200, corsHeaders);
        }

        if (request.method === "GET" && parts[1] === "posters" && parts.length === 2) {
            return successResponse(await listPosters(request, env), 200, corsHeaders);
        }

        if (request.method === "GET" && parts[1] === "posters" && parts.length === 3) {
            return successResponse(await getPosterById(request, env, parts[2]), 200, corsHeaders);
        }

        if (request.method === "GET" && parts[1] === "statistics" && parts.length === 2) {
            return successResponse(await getPosterStatistics(env), 200, corsHeaders);
        }

        if (request.method === "POST") {
            assertAllowedPostOrigin(request, env);
        }

        if (request.method === "POST" && parts[1] === "posters" && parts.length === 2) {
            assertBodyLimit(request, UPLOAD_BODY_LIMIT);
            return successResponse(await createPoster(request, env), 201, corsHeaders);
        }

        if (request.method === "POST" && parts[1] === "posters" && parts[3] === "vote" && parts.length === 4) {
            assertBodyLimit(request, VOTE_BODY_LIMIT);
            return successResponse(await castVote(request, env, parts[2]), 200, corsHeaders);
        }

        throw new AppError(404, "NOT_FOUND", "Endpoint niet gevonden.");
    } catch (error) {
        return errorResponse(error, corsHeaders);
    }
}
