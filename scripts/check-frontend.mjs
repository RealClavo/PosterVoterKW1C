import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const htmlFiles = ["index.html", "veghel.html", "den-bosch.html", "uploaden.html", "privacy.html", "404.html"];
const secretPatterns = [
    /github_pat_[A-Za-z0-9_]+/g,
    /ghp_[A-Za-z0-9_]+/g,
    /GITHUB_TOKEN[ \t]*=[ \t]*[^\s\r\n]+/g,
    /VOTER_HASH_SECRET[ \t]*=[ \t]*[^\s\r\n]+/g,
    /TURNSTILE_SECRET_KEY[ \t]*=[ \t]*[^\s\r\n]+/g
];
const allowedEmptySecretLines = new Set([
    "GITHUB_TOKEN=",
    "VOTER_HASH_SECRET=",
    "TURNSTILE_SECRET_KEY="
]);

function walk(directory, files = []) {
    for (const entry of readdirSync(directory)) {
        const path = join(directory, entry);
        const relative = path.slice(root.length + 1).replace(/\\/g, "/");

        if (relative.includes("node_modules") || relative.includes(".git/") || relative.includes(".wrangler")) {
            continue;
        }

        if (statSync(path).isDirectory()) {
            walk(path, files);
        } else {
            files.push(path);
        }
    }

    return files;
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function checkSecrets() {
    const files = walk(root);

    for (const file of files) {
        const extension = extname(file);

        if (![".html", ".css", ".js", ".json", ".jsonc", ".md", ".yml", ".yaml", ".example", ""].includes(extension)) {
            continue;
        }

        const content = readFileSync(file, "utf8");

        for (const pattern of secretPatterns) {
            const matches = content.match(pattern) ?? [];

            for (const match of matches) {
                if (!allowedEmptySecretLines.has(match.trim())) {
                    throw new Error(`Mogelijk geheim gevonden in ${file}: ${match}`);
                }
            }
        }
    }
}

function checkHtmlAssets() {
    for (const htmlFile of htmlFiles) {
        const path = join(root, htmlFile);
        const content = readFileSync(path, "utf8");

        assert(!content.includes('href="/assets/'), `${htmlFile} bevat een root href naar /assets/`);
        assert(!content.includes('src="/assets/'), `${htmlFile} bevat een root src naar /assets/`);
        assert(content.includes('lang="nl"'), `${htmlFile} mist lang="nl"`);

        const matches = [...content.matchAll(/\b(?:href|src)="(\.\/[^"#?]+)(?:[?#][^"]*)?"/g)];

        for (const match of matches) {
            const assetPath = join(root, match[1].replace("./", ""));
            assert(existsSync(assetPath), `${htmlFile} verwijst naar ontbrekend bestand: ${match[1]}`);
        }
    }
}

function checkJsonDatabase() {
    const database = JSON.parse(readFileSync(join(root, "data/posters.json"), "utf8"));
    assert(database.version === 1, "data/posters.json mist version 1");
    assert(Array.isArray(database.posters), "data/posters.json mist posters array");
}

checkSecrets();

if (!process.argv.includes("--secrets-only")) {
    checkHtmlAssets();
    checkJsonDatabase();
}

console.log("Frontendcontrole geslaagd.");
