import { describe, expect, it } from "vitest";
import { createVoterHash } from "../src/security.js";
import { addVoteToDatabase } from "../src/vote-service.js";
import { browserId, hiddenPosterId, makeDatabase, posterId, secondPosterId } from "./fixtures/database.js";

const env = {
    VOTER_HASH_SECRET: "test-secret"
};

describe("stemmen", () => {
    it("voegt een stem toe met HMAC-hash zonder ruwe browser-ID", async () => {
        const database = makeDatabase();
        const result = await addVoteToDatabase(database, {
            posterId,
            voterName: "Rens",
            browserId
        }, env, "2026-06-12T13:00:00.000Z");

        expect(result.poster.votes).toHaveLength(1);
        expect(result.vote.voterName).toBe("Rens");
        expect(result.vote.voterHash).toMatch(/^[0-9a-f]{64}$/);
        expect(result.vote.voterHash).not.toBe(browserId);
    });

    it("blokkeert dubbele stemmen voor dezelfde poster en browser", async () => {
        const database = makeDatabase();
        await addVoteToDatabase(database, { posterId, voterName: "Rens", browserId }, env);
        await expect(addVoteToDatabase(database, { posterId, voterName: "Rens", browserId }, env)).rejects.toMatchObject({
            code: "ALREADY_VOTED",
            status: 409
        });
    });

    it("weigert onbekende en verborgen posters", async () => {
        const database = makeDatabase();
        await expect(addVoteToDatabase(database, {
            posterId: "550e8400-e29b-41d4-a716-446655449999",
            voterName: "Rens",
            browserId
        }, env)).rejects.toMatchObject({ code: "POSTER_NOT_FOUND" });

        await expect(addVoteToDatabase(database, {
            posterId: hiddenPosterId,
            voterName: "Rens",
            browserId
        }, env)).rejects.toMatchObject({ code: "POSTER_NOT_FOUND" });
    });

    it("maakt deterministische hashes per poster en browser", async () => {
        const first = await createVoterHash(env, posterId, browserId);
        const repeat = await createVoterHash(env, posterId, browserId);
        const otherPoster = await createVoterHash(env, secondPosterId, browserId);

        expect(first).toBe(repeat);
        expect(first).not.toBe(otherPoster);
    });
});
