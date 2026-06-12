import { AppError } from "./errors.js";
import { readCurrentDatabase, publicPoster, publicPosters, getStatistics } from "./database-service.js";
import { commitFilesAtomically } from "./git-commit-service.js";
import { validateWebpFile, arrayBufferToBase64 } from "./image-validation.js";
import { assertCooldown, verifyTurnstileIfEnabled } from "./security.js";
import { assertHoneypotIsEmpty, isUuid, validateBrowserId, validateCreatorName, validateLocation, validateSearchTerm, validateTitle, validateUuid } from "./validation.js";
import { sortPublicPosters } from "./sorting.js";

const SORT_MODES = new Set(["votes", "newest", "oldest", "creator", "title"]);

function normalizeSort(value) {
    return SORT_MODES.has(value) ? value : "votes";
}

function getUploadsPath(env) {
    return env.UPLOADS_PATH || "assets/uploads";
}

export async function listPosters(request, env) {
    const url = new URL(request.url);
    const location = url.searchParams.get("location");
    const sort = normalizeSort(url.searchParams.get("sort") || "votes");
    const search = validateSearchTerm(url.searchParams.get("search") || "");
    const browserId = url.searchParams.get("browserId") || "";
    const data = await readCurrentDatabase(env);
    let posters = data.database.posters.filter((poster) => poster.isVisible);

    if (location) {
        validateLocation(location);
        posters = posters.filter((poster) => poster.location === location);
    }

    if (search) {
        const normalized = search.toLowerCase();
        posters = posters.filter((poster) => poster.title.toLowerCase().includes(normalized) || poster.creatorName.toLowerCase().includes(normalized));
    }

    posters = sortPublicPosters(posters, sort);

    return {
        posters: await publicPosters(posters, env, isUuid(browserId) ? browserId : ""),
        updatedAt: data.database.updatedAt
    };
}

export async function getPosterById(request, env, posterId) {
    validateUuid(posterId, "Poster-ID");
    const url = new URL(request.url);
    const browserId = url.searchParams.get("browserId") || "";
    const data = await readCurrentDatabase(env);
    const poster = data.database.posters.find((item) => item.id === posterId && item.isVisible);

    if (!poster) {
        throw new AppError(404, "POSTER_NOT_FOUND", "De poster is niet gevonden.");
    }

    return {
        poster: await publicPoster(poster, env, isUuid(browserId) ? browserId : ""),
        updatedAt: data.database.updatedAt
    };
}

export async function getPosterStatistics(env) {
    const data = await readCurrentDatabase(env);
    return getStatistics(data.database);
}

export async function createPoster(request, env) {
    assertCooldown(request, "upload");
    const form = await request.formData();
    const title = validateTitle(form.get("title"));
    const creatorName = validateCreatorName(form.get("creatorName"));
    const location = validateLocation(form.get("location"));
    const consent = form.get("consent") === "true";
    const browserId = form.get("browserId") || "";

    assertHoneypotIsEmpty(form.get("website"));
    await verifyTurnstileIfEnabled(env, form.get("turnstileToken") || "", request);

    if (!consent) {
        throw new AppError(400, "VALIDATION_ERROR", "Bevestig dat je deze poster mag uploaden.");
    }

    if (browserId) {
        validateBrowserId(browserId);
    }

    const imageBuffer = await validateWebpFile(form.get("image"));
    const posterId = crypto.randomUUID();
    // Het bestandspad komt volledig van de server. Gebruikersnamen, titels en originele bestandsnamen worden nooit padnamen.
    const imagePath = `${getUploadsPath(env)}/${posterId}.webp`;
    const imageBase64 = arrayBufferToBase64(imageBuffer);
    const now = new Date().toISOString();
    const locationName = location === "veghel" ? "Veghel" : "Den Bosch";
    let createdPoster;

    const result = await commitFilesAtomically(env, async (database) => {
        const poster = {
            id: posterId,
            title,
            creatorName,
            location,
            imagePath,
            createdAt: now,
            isVisible: true,
            votes: []
        };

        database.posters.push(poster);
        createdPoster = poster;

        return {
            files: [
                {
                    path: imagePath,
                    content: imageBase64,
                    encoding: "base64"
                }
            ],
            data: { poster }
        };
    }, {
        message: `data: add poster for ${locationName}`
    });

    return {
        poster: await publicPoster(createdPoster || result.data.poster, env, browserId),
        commitSha: result.commitSha
    };
}
