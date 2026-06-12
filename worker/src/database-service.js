import { AppError } from "./errors.js";
import { getBranchHead, readFileAtCommit } from "./github-client.js";
import { createVoterHash } from "./security.js";
import { assertDatabaseIsValid, isUuid } from "./validation.js";

export function getDatabasePath(env) {
    return env.DATABASE_PATH || "data/posters.json";
}

export function cloneDatabase(database) {
    return JSON.parse(JSON.stringify(database));
}

export async function readDatabaseAtRef(env, ref) {
    const file = await readFileAtCommit(env, ref, getDatabasePath(env));
    let database;

    try {
        database = JSON.parse(file.content);
    } catch (error) {
        throw new AppError(500, "DATABASE_INVALID", "De database is tijdelijk niet beschikbaar.");
    }

    assertDatabaseIsValid(database);

    return {
        database,
        blobSha: file.blobSha,
        treeSha: file.treeSha,
        commitSha: ref
    };
}

export async function readCurrentDatabase(env) {
    const head = await getBranchHead(env);
    return readDatabaseAtRef(env, head.commitSha);
}

function encodePath(path) {
    return path.split("/").map((part) => encodeURIComponent(part)).join("/");
}

export async function publicPoster(poster, env, browserId = "") {
    const owner = env.GITHUB_OWNER || "RealClavo";
    const repo = env.GITHUB_REPO || "PosterVoterKW1C";
    const branch = env.GITHUB_BRANCH || "main";
    let hasVoted = false;

    if (browserId && isUuid(browserId) && env.VOTER_HASH_SECRET) {
        const voterHash = await createVoterHash(env, poster.id, browserId);
        hasVoted = poster.votes.some((vote) => vote.voterHash === voterHash);
    }

    return {
        id: poster.id,
        title: poster.title,
        creatorName: poster.creatorName,
        location: poster.location,
        imageUrl: `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(branch)}/${encodePath(poster.imagePath)}`,
        createdAt: poster.createdAt,
        votesCount: poster.votes.length,
        voterNames: poster.votes.map((vote) => vote.voterName),
        hasVoted
    };
}

export async function publicPosters(posters, env, browserId = "") {
    return Promise.all(posters.map((poster) => publicPoster(poster, env, browserId)));
}

export function getStatistics(database) {
    const visiblePosters = database.posters.filter((poster) => poster.isVisible);
    const locations = {
        veghel: { posters: 0, votes: 0 },
        "den-bosch": { posters: 0, votes: 0 }
    };

    visiblePosters.forEach((poster) => {
        locations[poster.location].posters += 1;
        locations[poster.location].votes += poster.votes.length;
    });

    return {
        totalPosters: visiblePosters.length,
        totalVotes: visiblePosters.reduce((sum, poster) => sum + poster.votes.length, 0),
        locations,
        updatedAt: database.updatedAt
    };
}
