import { describe, expect, it } from "vitest";
import { readCurrentDatabase } from "../src/database-service.js";
import { makeDatabase } from "./fixtures/database.js";

function base64Json(value) {
    return Buffer.from(typeof value === "string" ? value : JSON.stringify(value), "utf8").toString("base64");
}

function makeMockFetch(databaseContent) {
    return async (url) => {
        const parsedUrl = new URL(url);

        if (parsedUrl.pathname.endsWith("/git/ref/heads/main")) {
            return Response.json({ object: { sha: "commit-1" } });
        }

        if (parsedUrl.pathname.endsWith("/git/commits/commit-1")) {
            return Response.json({ tree: { sha: "tree-1" } });
        }

        if (parsedUrl.pathname.endsWith("/git/trees/tree-1")) {
            if (databaseContent === null) {
                return Response.json({ tree: [] });
            }

            return Response.json({
                truncated: false,
                tree: [
                    {
                        path: "data/posters.json",
                        type: "blob",
                        sha: "blob-1"
                    }
                ]
            });
        }

        if (parsedUrl.pathname.endsWith("/git/blobs/blob-1")) {
            return Response.json({
                encoding: "base64",
                content: base64Json(databaseContent)
            });
        }

        return new Response("not found", { status: 404 });
    };
}

describe("database lezen", () => {
    it("leest en valideert data/posters.json via GitHub API mocks", async () => {
        const env = {
            GITHUB_TOKEN: "test",
            VOTER_HASH_SECRET: "secret",
            __fetch: makeMockFetch(makeDatabase())
        };
        const result = await readCurrentDatabase(env);
        expect(result.database.posters).toHaveLength(3);
    });

    it("weigert corrupte JSON zonder te overschrijven", async () => {
        const env = {
            GITHUB_TOKEN: "test",
            __fetch: makeMockFetch("{geen json")
        };
        await expect(readCurrentDatabase(env)).rejects.toMatchObject({ code: "DATABASE_INVALID" });
    });

    it("meldt een ontbrekend JSON-bestand veilig", async () => {
        const env = {
            GITHUB_TOKEN: "test",
            __fetch: makeMockFetch(null)
        };
        await expect(readCurrentDatabase(env)).rejects.toMatchObject({ code: "DATABASE_MISSING" });
    });
});
