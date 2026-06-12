import { AppError } from "./errors.js";
import { createBlob, createCommit, createTree, getBranchHead, readFileAtCommit, updateBranchHead } from "./github-client.js";
import { cloneDatabase, getDatabasePath } from "./database-service.js";
import { assertDatabaseIsValid } from "./validation.js";

function isWriteConflict(error) {
    return error?.code === "GITHUB_CONFLICT" || error?.status === 409;
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function readDatabaseFromHead(env, head) {
    const file = await readFileAtCommit(env, head.commitSha, getDatabasePath(env));
    let database;

    try {
        database = JSON.parse(file.content);
    } catch (error) {
        throw new AppError(500, "DATABASE_INVALID", "De database is tijdelijk niet beschikbaar.");
    }

    assertDatabaseIsValid(database);

    return {
        database,
        treeSha: file.treeSha
    };
}

export async function commitFilesAtomically(env, buildChange, options) {
    // Elke poging leest eerst de nieuwste main-head en bouwt daar een nieuwe commit bovenop.
    const maxAttempts = options.maxAttempts ?? 5;
    let lastConflict = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            const head = await getBranchHead(env);
            const { database, treeSha } = await readDatabaseFromHead(env, head);
            const nextDatabase = cloneDatabase(database);
            const change = await buildChange(nextDatabase);

            nextDatabase.updatedAt = new Date().toISOString();
            assertDatabaseIsValid(nextDatabase);

            // Uploads en JSON-wijzigingen gaan samen in een tree, dus een posterbestand en database-update zijn atomair.
            const files = [
                {
                    path: getDatabasePath(env),
                    content: `${JSON.stringify(nextDatabase, null, 2)}\n`,
                    encoding: "utf-8"
                },
                ...(change.files ?? [])
            ];
            const treeEntries = [];

            for (const file of files) {
                const sha = await createBlob(env, file);
                treeEntries.push({
                    path: file.path,
                    mode: "100644",
                    type: "blob",
                    sha
                });
            }

            const tree = await createTree(env, treeSha, treeEntries);
            const commit = await createCommit(env, options.message, tree.sha, head.commitSha);
            await updateBranchHead(env, commit.sha);

            return {
                commitSha: commit.sha,
                data: change.data,
                database: nextDatabase
            };
        } catch (error) {
            if (!isWriteConflict(error)) {
                throw error;
            }

            lastConflict = error;

            if (attempt < maxAttempts) {
                // Bij gelijktijdige stemmen wachten we kort en proberen we opnieuw met de nieuwste database.
                await sleep(80 + Math.floor(Math.random() * 180));
            }
        }
    }

    throw new AppError(409, "WRITE_CONFLICT", lastConflict?.publicMessage || "De gegevens zijn ondertussen gewijzigd. Probeer het opnieuw.");
}
