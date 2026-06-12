# PosterVoter

PosterVoter is een Nederlandstalige poster-votingwebsite voor studenten van het Koning Willem I College. Studenten bekijken posters per locatie, geven uitsluitend een positieve +1-stem en kunnen zelf een poster uploaden.

Verwachte GitHub Pages URL:

```text
https://realclavo.github.io/PosterVoterKW1C/
```

## Screenshots

Screenshots kunnen na de eerste GitHub Pages-deployment worden toegevoegd:

- Homepagina
- Veghel-ranglijst
- Den Bosch-ranglijst
- Uploadformulier
- Stemmodal en lightbox

## Functies

- Homepagina met live statistieken en top 3 posters.
- Locatiepagina's voor Veghel en Den Bosch.
- Zoeken op titel en maker.
- Sorteren op meeste stemmen, nieuwste, oudste, maker A-Z en titel A-Z.
- Posterkaarten met rangnummer, afbeelding, maker, datum, locatiebadge en +1-knop.
- Toegankelijke lightbox met Escape, klik buiten modal en focus trapping.
- Stemmodal met naam- of aliasvalidatie.
- Browser-ID in `localStorage` onder `postervoter_voter_id`.
- HMAC-SHA-256-hash in de Worker, zodat de ruwe browser-ID niet in GitHub staat.
- Uploadformulier met drag-and-drop, preview, validatie en lokale WebP-conversie.
- Cloudflare Worker API met GitHub REST API en Git Database API.
- GitHub Pages workflow die niet draait bij alleen data- of uploadcommits.
- Worker unit tests met mocks.

## Technologieen

- HTML5
- CSS3
- Vanilla JavaScript met ES Modules
- GitHub Pages
- Cloudflare Workers
- Wrangler
- GitHub REST API
- GitHub Git Database API
- JSON als centrale bron van waarheid

## Architectuur

```text
Browser
  |
GitHub Pages
  |
Cloudflare Worker API
  |
GitHub REST API + Git Database API
  |
data/posters.json + assets/uploads/
  |
Git commit naar main
```

De Worker gebruikt geen Cloudflare KV, D1, R2, Supabase, Firebase of andere database. De enige centrale bron van waarheid is:

```text
data/posters.json
```

Geuploade posterbestanden staan uitsluitend in:

```text
assets/uploads/
```

## Paginaoverzicht

- `index.html`: home, locatiekaarten, top 3 en statistieken.
- `veghel.html`: ranglijst voor Veghel.
- `den-bosch.html`: ranglijst voor Den Bosch.
- `uploaden.html`: posterupload met drag-and-drop.
- `privacy.html`: uitleg over gegevensopslag en beperkingen.
- `404.html`: foutpagina.

## Projectstructuur

```text
assets/
  css/
  js/
  images/
  icons/
  uploads/
data/posters.json
worker/
  src/
  test/
.github/workflows/
```

## JSON-database

Productie start leeg:

```json
{
  "version": 1,
  "updatedAt": "2026-06-12T00:00:00.000Z",
  "posters": []
}
```

Een poster bevat een UUID, titel, makernaam of alias, locatie, imagePath, createdAt, isVisible en votes. Het aantal stemmen wordt altijd berekend uit `poster.votes.length`.

De publieke API-response stuurt nooit `voterHash` terug.

## Afbeeldingen

De browser verwerkt de afbeelding voor upload:

- langste zijde maximaal 1800 pixels;
- conversie naar WebP;
- kwaliteit rond 0.85;
- doel onder 1,5 MB;
- metadata wordt verwijderd door opnieuw via Canvas te exporteren.

De Worker controleert opnieuw:

- MIME moet `image/webp` zijn;
- bestand maximaal 1,5 MB;
- WebP magic bytes moeten kloppen;
- server genereert zelf de UUID-bestandsnaam.

Bestanden krijgen deze vorm:

```text
assets/uploads/{posterId}.webp
```

## API-endpoints

Basis-URL staat in:

```text
assets/js/config.js
```

Voor lokale ontwikkeling gebruikt de frontend automatisch:

```text
http://localhost:8787/api
```

Voor productie staat de URL standaard op:

```text
https://postervoter-api.realclavo.workers.dev/api
```

Pas deze waarde aan als Cloudflare een andere Worker-subdomain gebruikt.

Endpoints:

- `GET /api/health`
- `GET /api/posters`
- `GET /api/posters/:id`
- `GET /api/statistics`
- `POST /api/posters`
- `POST /api/posters/:id/vote`
- `OPTIONS /api/*`

Queryparameters:

- `location=veghel`
- `location=den-bosch`
- `sort=votes|newest|oldest|creator|title`
- `search=zoekterm`
- `browserId=uuid`

## Stemmen

Een stem werkt zo:

1. De frontend vraagt om een voornaam of alias.
2. De frontend stuurt `posterId`, `voterName` en `browserId` naar de Worker.
3. De Worker maakt `HMAC_SHA256(VOTER_HASH_SECRET, posterId + ":" + browserId)`.
4. Alleen de hash wordt in `data/posters.json` opgeslagen.
5. De Worker commit de nieuwe JSON naar `main`.
6. Pas na een geslaagde GitHub-commit krijgt de gebruiker succes terug.

Dubbele stem vanuit dezelfde browser:

```json
{
  "success": false,
  "error": {
    "code": "ALREADY_VOTED",
    "message": "Je hebt al op deze poster gestemd."
  }
}
```

Deze bescherming beperkt stemmen per browser. Door browsergegevens te verwijderen of een ander apparaat te gebruiken kan iemand opnieuw stemmen.

## Lokale frontend

```bash
npm run serve
```

Open:

```text
http://localhost:5500
```

Of:

```bash
python -m http.server 5500
```

## Worker lokaal starten

```bash
cd worker
npm install
cp .dev.vars.example .dev.vars
npx wrangler dev
```

Vul `worker/.dev.vars` lokaal met eigen waarden. Commit dit bestand nooit.

## GitHub-token maken

Maak een fine-grained GitHub Personal Access Token:

- Resource owner: `RealClavo`
- Repository access: `Only select repositories`
- Repository: `PosterVoterKW1C`
- Repository permissions: `Contents: Read and write`

Geef geen extra rechten.

Sla het token alleen op als Cloudflare Worker secret:

```bash
cd worker
npx wrangler secret put GITHUB_TOKEN
```

Zet het token nooit in `config.js`, `.env` in Git, `wrangler.jsonc`, GitHub Pages, screenshots, README of commits.

## Worker secrets

```bash
cd worker
npx wrangler login
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put VOTER_HASH_SECRET
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler deploy
```

`TURNSTILE_SECRET_KEY` is alleen nodig wanneer Turnstile is ingeschakeld.

## Wrangler-config

Niet-geheime configuratie staat in `worker/wrangler.jsonc`:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "postervoter-api",
  "main": "src/index.js",
  "compatibility_date": "2026-06-12",
  "vars": {
    "GITHUB_OWNER": "RealClavo",
    "GITHUB_REPO": "PosterVoterKW1C",
    "GITHUB_BRANCH": "main",
    "DATABASE_PATH": "data/posters.json",
    "UPLOADS_PATH": "assets/uploads",
    "ALLOWED_ORIGINS": "https://realclavo.github.io,http://localhost:5500,http://127.0.0.1:5500"
  }
}
```

## Worker deployen

```bash
cd worker
npm install
npx wrangler deploy
```

Controleer daarna:

```bash
curl https://jouw-worker-url/api/health
```

## GitHub Pages activeren

1. Ga naar de repository op GitHub.
2. Open Settings.
3. Open Pages.
4. Kies GitHub Actions als source.
5. Push naar `main` of start de workflow handmatig.

De workflow staat in:

```text
.github/workflows/pages.yml
```

Hij draait bij wijzigingen aan HTML, CSS, frontend-JavaScript, vaste afbeeldingen, icons, README of de workflow zelf. Hij draait niet bij commits die uitsluitend `data/posters.json` of `assets/uploads/**` wijzigen.

## Worker tests

```bash
cd worker
npm test
```

De tests gebruiken mocks voor GitHub en doen geen echte writes.

## Alle checks lokaal

```bash
npm test
```

Dit draait:

- frontendcontrole op pagina's, relatieve assetpaden en secrets;
- Worker unit tests.

## CORS

Toegestane origins:

- `https://realclavo.github.io`
- `http://localhost:5500`
- `http://127.0.0.1:5500`

POST-aanvragen vanaf onbekende origins worden geblokkeerd. CORS is geen volledige beveiliging; daarom valideert de Worker alle invoer opnieuw en ondersteunt de API Turnstile en bodylimieten.

## Privacy

PosterVoter vraagt geen accounts, wachtwoorden, e-mailadressen, studentnummers, telefoonnummers of geboortedata.

Omdat de repository openbaar kan zijn, kunnen opgeslagen postergegevens technisch zichtbaar zijn. Gebruik daarom alleen een voornaam of alias.

## Anti-spam

De Worker bevat:

- honeypotveld;
- Turnstile-ondersteuning;
- bodylimieten;
- strikte Origin-controle;
- best-effort in-memory cooldown.

De in-memory cooldown is niet wereldwijd persistent. Gebruik in productie bij voorkeur Cloudflare platform Rate Limiting Rules.

## Herstel bij corrupte JSON

Als `data/posters.json` corrupt is:

1. De Worker overschrijft niets.
2. Mutaties stoppen met een veilige 500-fout.
3. Open de laatste goede commit in GitHub.
4. Herstel `data/posters.json` handmatig of via een nieuwe commit.
5. Controleer lokaal met `npm test`.
6. Push naar `main`.

## Token vervangen of intrekken

1. Trek het oude token in via GitHub Developer Settings.
2. Maak een nieuw fine-grained token met alleen Contents read/write voor deze repository.
3. Zet het nieuwe token in Cloudflare:

```bash
cd worker
npx wrangler secret put GITHUB_TOKEN
```

4. Test `GET /api/health` en een veilige testupload.

## Bekende beperkingen

- Geen accounts: dubbele stemmen worden per browser beperkt, niet per persoon.
- GitHub is de centrale opslag: writes zijn afhankelijk van GitHub API-limieten en repositoryrechten.
- GitHub Pages kan statische assets cachen; de frontend leest live data daarom via de Worker.
- Turnstile is optioneel totdat een site key en secret zijn ingesteld.
