import { describe, expect, it } from "vitest";
import { sortPublicPosters } from "../src/sorting.js";
import { makeDatabase } from "./fixtures/database.js";

describe("sortering", () => {
    it("sorteert standaard op meeste stemmen en daarna nieuwste", () => {
        const database = makeDatabase();
        const sorted = sortPublicPosters(database.posters.filter((poster) => poster.isVisible), "votes");
        expect(sorted[0].title).toBe("Techniek Festival");
    });

    it("sorteert op maker en titel", () => {
        const database = makeDatabase();
        const visible = database.posters.filter((poster) => poster.isVisible);
        expect(sortPublicPosters(visible, "creator")[0].creatorName).toBe("Rens");
        expect(sortPublicPosters(visible, "title")[0].title).toBe("Open Dag Poster");
    });
});
