import { AppError } from "./errors.js";
import { publicPoster } from "./database-service.js";
import { commitFilesAtomically } from "./git-commit-service.js";
import { assertCooldown, createVoterHash, verifyTurnstileIfEnabled } from "./security.js";
import { assertHoneypotIsEmpty, validateBrowserId, validateUuid, validateVoterName } from "./validation.js";

async function parseJson(request) {
    try {
        return await request.json();
    } catch (error) {
        throw new AppError(400, "VALIDATION_ERROR", "Controleer de ingevulde gegevens.");
    }
}

export async function addVoteToDatabase(database, input, env, now = new Date().toISOString()) {
    const posterId = validateUuid(input.posterId, "Poster-ID");
    const voterName = validateVoterName(input.voterName);
    const browserId = validateBrowserId(input.browserId);
    const poster = database.posters.find((item) => item.id === posterId);

    if (!poster) {
        throw new AppError(404, "POSTER_NOT_FOUND", "De poster is niet gevonden.");
    }

    if (!poster.isVisible) {
        throw new AppError(404, "POSTER_NOT_FOUND", "De poster is niet gevonden.");
    }

    const voterHash = await createVoterHash(env, posterId, browserId);

    if (poster.votes.some((vote) => vote.voterHash === voterHash)) {
        throw new AppError(409, "ALREADY_VOTED", "Je hebt al op deze poster gestemd.");
    }

    const vote = {
        id: crypto.randomUUID(),
        voterName,
        voterHash,
        createdAt: now
    };

    poster.votes.push(vote);

    return {
        poster,
        vote,
        voterHash
    };
}

export async function castVote(request, env, posterId) {
    assertCooldown(request, "vote");
    const body = await parseJson(request);

    assertHoneypotIsEmpty(body.website);
    await verifyTurnstileIfEnabled(env, body.turnstileToken || "", request);

    let updatedPoster;

    const result = await commitFilesAtomically(env, async (database) => {
        const voteResult = await addVoteToDatabase(database, {
            posterId,
            voterName: body.voterName,
            browserId: body.browserId
        }, env);

        updatedPoster = voteResult.poster;

        return {
            data: { poster: voteResult.poster }
        };
    }, {
        message: `data: register vote for poster ${posterId}`
    });

    const poster = await publicPoster(updatedPoster || result.data.poster, env, body.browserId);

    return {
        posterId,
        votesCount: poster.votesCount,
        hasVoted: true,
        poster,
        commitSha: result.commitSha
    };
}
