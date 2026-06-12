import { getPosters, getStatistics } from "../services/api-service.js";
import { showToast } from "../components/toast.js";
import { formatVotes, getLocationLabel } from "../utils/formatting.js";
import { sortPosters } from "../utils/sorting.js";

function setStat(name, value) {
    document.querySelectorAll(`[data-stat="${name}"]`).forEach((element) => {
        element.textContent = String(value);
    });
}

function createTopCard(poster, rank) {
    const card = document.createElement("article");
    const image = document.createElement("img");
    const body = document.createElement("div");
    const rankElement = document.createElement("span");
    const title = document.createElement("h3");
    const maker = document.createElement("p");
    const meta = document.createElement("p");
    const link = document.createElement("a");
    const target = poster.location === "veghel" ? "./veghel.html" : "./den-bosch.html";

    card.className = "top-card";
    image.src = poster.imageUrl;
    image.alt = `Poster ${poster.title} van ${poster.creatorName}`;
    image.loading = "lazy";
    image.addEventListener("error", () => {
        image.src = "./assets/images/placeholders/poster-empty.svg";
    });
    body.className = "top-card-body";
    rankElement.className = "top-rank";
    rankElement.textContent = `Plaats ${rank}`;
    title.textContent = poster.title;
    maker.textContent = `Maker: ${poster.creatorName}`;
    meta.textContent = `${getLocationLabel(poster.location)} · ${formatVotes(poster.votesCount ?? 0)}`;
    link.className = "text-link";
    link.href = `${target}?poster=${encodeURIComponent(poster.id)}`;
    link.textContent = "Bekijk poster";
    body.append(rankElement, title, maker, meta, link);
    card.append(image, body);
    return card;
}

function renderTopPosters(posters) {
    const container = document.querySelector("[data-top-posters]");

    if (!container) {
        return;
    }

    if (posters.length === 0) {
        return;
    }

    const list = document.createElement("div");
    list.className = "top-list";

    posters.slice(0, 3).forEach((poster, index) => {
        list.append(createTopCard(poster, index + 1));
    });

    container.replaceChildren(list);
}

async function initHome() {
    try {
        const [statistics, posterData] = await Promise.all([
            getStatistics(),
            getPosters({ sort: "votes" })
        ]);
        const locationStats = statistics.locations ?? {};

        setStat("total-posters", statistics.totalPosters ?? 0);
        setStat("total-votes", statistics.totalVotes ?? 0);
        setStat("veghel-posters", locationStats.veghel?.posters ?? 0);
        setStat("veghel-votes", locationStats.veghel?.votes ?? 0);
        setStat("denbosch-posters", locationStats["den-bosch"]?.posters ?? 0);
        setStat("denbosch-votes", locationStats["den-bosch"]?.votes ?? 0);
        renderTopPosters(sortPosters(posterData.posters ?? [], "votes"));
    } catch (error) {
        showToast("Live gegevens konden niet worden geladen. Controleer de API-configuratie.", "error");
    }
}

initHome();
