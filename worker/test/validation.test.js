import { describe, expect, it } from "vitest";
import { validateWebpFile } from "../src/image-validation.js";
import { assertHoneypotIsEmpty, assertDatabaseIsValid, validateBrowserId, validateLocation, validateVoterName } from "../src/validation.js";
import { makeDatabase, posterId } from "./fixtures/database.js";

function makeWebpFile(bytes = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]) {
    return new File([new Uint8Array(bytes)], "poster.webp", { type: "image/webp" });
}

describe("validatie", () => {
    it("accepteert een geldige database", () => {
        expect(assertDatabaseIsValid(makeDatabase())).toBe(true);
    });

    it("weigert dubbele poster-ID's", () => {
        const database = makeDatabase();
        database.posters[1].id = posterId;
        expect(() => assertDatabaseIsValid(database)).toThrow("database");
    });

    it("weigert onveilige namen en HTML-tags", () => {
        expect(() => validateVoterName("<b>Rens</b>")).toThrow();
        expect(() => validateVoterName("Rens<script>")).toThrow();
        expect(validateVoterName("Rens-01")).toBe("Rens-01");
    });

    it("valideert locatie en browser-ID streng", () => {
        expect(validateLocation("veghel")).toBe("veghel");
        expect(() => validateLocation("utrecht")).toThrow();
        expect(() => validateBrowserId("niet-uuid")).toThrow();
    });

    it("blokkeert de honeypot", () => {
        expect(() => assertHoneypotIsEmpty("")).not.toThrow();
        expect(() => assertHoneypotIsEmpty("https://spam.test")).toThrow();
    });

    it("controleert WebP magic bytes en MIME", async () => {
        await expect(validateWebpFile(makeWebpFile())).resolves.toBeInstanceOf(ArrayBuffer);
        await expect(validateWebpFile(new File(["x"], "poster.png", { type: "image/png" }))).rejects.toThrow();
        await expect(validateWebpFile(makeWebpFile([1, 2, 3]))).rejects.toThrow();
    });
});
