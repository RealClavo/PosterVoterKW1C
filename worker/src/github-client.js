import { AppError } from "./errors.js";

export class GitHubApiError extends AppError {
    constructor(status, code, message) {
        super(status, code, message);
        this.name = "GitHubApiError";
    }
}

function getConfig(env) {
    const owner = env.GITHUB_OWNER || "RealClavo";
    const repo = env.GITHUB_REPO || "PosterVoterKW1C";
    const branch = env.GITHUB_BRANCH || "main";

    if (!env.GITHUB_TOKEN) {
        throw new AppError(500, "CONFIGURATION_ERROR", "De API is nog niet volledig ingesteld.");
    }

    return {
        owner,
        repo,
        branch,
        apiVersion: env.GITHUB_API_VERSION || "2026-03-10"
    };
}

async function parseGitHubError(response) {
    const rateRemaining = response.headers.get("X-RateLimit-Remaining");

    if (rateRemaining === "0") {
        return new GitHubApiError(429, "GITHUB_RATE_LIMIT", "GitHub heeft tijdelijk te veel aanvragen ontvangen.");
    }

    if (response.status === 401) {
        return new GitHubApiError(502, "GITHUB_UNAUTHORIZED", "GitHub-authenticatie is mislukt.");
    }

    if (response.status === 403) {
        return new GitHubApiError(502, "GITHUB_FORBIDDEN", "GitHub heeft de aanvraag geweigerd.");
    }

    if (response.status === 404) {
        return new GitHubApiError(404, "GITHUB_NOT_FOUND", "De gevraagde GitHub-bron is niet gevonden.");
    }

    if (response.status === 409 || response.status === 422) {
        return new GitHubApiError(409, "GITHUB_CONFLICT", "De gegevens zijn ondertussen gewijzigd. Probeer het opnieuw.");
    }

    return new GitHubApiError(502, "GITHUB_ERROR", "GitHub kon de aanvraag niet verwerken.");
}

export async function githubRequest(env, endpoint, options = {}) {
    const config = getConfig(env);
    const controller = new AbortController();
    const timeout = setTimeout(() => {
        controller.abort();
    }, options.timeoutMs ?? 12000);
    const fetcher = env.__fetch || fetch;
    const body = options.body ? JSON.stringify(options.body) : undefined;

    try {
        const response = await fetcher(`https://api.github.com/repos/${config.owner}/${config.repo}${endpoint}`, {
            method: options.method || "GET",
            headers: {
                Accept: "application/vnd.github+json",
                Authorization: `Bearer ${env.GITHUB_TOKEN}`,
                "Content-Type": "application/json",
                "X-GitHub-Api-Version": config.apiVersion,
                "User-Agent": "PosterVoterKW1C-Worker",
                ...(options.headers || {})
            },
            body,
            signal: controller.signal
        });

        if (!response.ok) {
            throw await parseGitHubError(response);
        }

        if (response.status === 204) {
            return null;
        }

        return response.json();
    } catch (error) {
        if (error.name === "AbortError") {
            throw new GitHubApiError(502, "GITHUB_TIMEOUT", "GitHub reageerde niet op tijd.");
        }

        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

function base64ToBytes(value) {
    const cleanValue = value.replace(/\s/g, "");

    if (typeof atob === "function") {
        const binary = atob(cleanValue);
        return Uint8Array.from(binary, (character) => character.charCodeAt(0));
    }

    return Uint8Array.from(Buffer.from(cleanValue, "base64"));
}

export function base64ToText(value) {
    return new TextDecoder().decode(base64ToBytes(value));
}

export async function getBranchHead(env) {
    const branch = env.GITHUB_BRANCH || "main";
    const ref = await githubRequest(env, `/git/ref/heads/${encodeURIComponent(branch)}`);
    const commit = await githubRequest(env, `/git/commits/${ref.object.sha}`);

    return {
        commitSha: ref.object.sha,
        treeSha: commit.tree.sha
    };
}

export async function readFileAtCommit(env, commitSha, path) {
    // We lezen de JSON vanaf een exacte commit. Daardoor werkt de latere write met optimistic concurrency.
    const commit = await githubRequest(env, `/git/commits/${commitSha}`);
    const tree = await githubRequest(env, `/git/trees/${commit.tree.sha}?recursive=1`);

    if (tree.truncated) {
        throw new AppError(500, "GITHUB_TREE_TRUNCATED", "De repository is te groot om veilig te lezen.");
    }

    const item = tree.tree.find((entry) => entry.path === path && entry.type === "blob");

    if (!item) {
        throw new AppError(500, "DATABASE_MISSING", "De database is tijdelijk niet beschikbaar.");
    }

    const blob = await githubRequest(env, `/git/blobs/${item.sha}`);

    if (blob.encoding !== "base64") {
        throw new AppError(500, "DATABASE_INVALID", "De database is tijdelijk niet beschikbaar.");
    }

    return {
        content: base64ToText(blob.content),
        blobSha: item.sha,
        treeSha: commit.tree.sha
    };
}

export async function createBlob(env, file) {
    const blob = await githubRequest(env, "/git/blobs", {
        method: "POST",
        body: {
            content: file.content,
            encoding: file.encoding
        }
    });

    return blob.sha;
}

export async function createTree(env, baseTreeSha, entries) {
    return githubRequest(env, "/git/trees", {
        method: "POST",
        body: {
            base_tree: baseTreeSha,
            tree: entries
        }
    });
}

export async function createCommit(env, message, treeSha, parentSha) {
    return githubRequest(env, "/git/commits", {
        method: "POST",
        body: {
            message,
            tree: treeSha,
            parents: [parentSha]
        }
    });
}

export async function updateBranchHead(env, commitSha) {
    const branch = env.GITHUB_BRANCH || "main";
    return githubRequest(env, `/git/refs/heads/${encodeURIComponent(branch)}`, {
        method: "PATCH",
        body: {
            sha: commitSha,
            force: false
        }
    });
}
