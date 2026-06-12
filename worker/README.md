# PosterVoter Worker

Cloudflare Worker API voor PosterVoter. De Worker gebruikt zelf geen database. Alle reads en writes lopen via de GitHub REST API en Git Database API naar `data/posters.json` en `assets/uploads/`.

## Lokaal starten

```bash
cd worker
npm install
cp .dev.vars.example .dev.vars
npx wrangler dev
```

Vul in `worker/.dev.vars` alleen lokale secretwaarden in. Commit dit bestand nooit.

## Secrets

```bash
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put VOTER_HASH_SECRET
npx wrangler secret put TURNSTILE_SECRET_KEY
```

`TURNSTILE_SECRET_KEY` is alleen nodig wanneer Turnstile wordt ingeschakeld.

## Deploy

```bash
cd worker
npx wrangler deploy
```

## Tests

```bash
cd worker
npm test
```

De unit tests gebruiken mocks en voeren geen echte GitHub-writes uit.
