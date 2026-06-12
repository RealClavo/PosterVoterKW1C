import { formatDate, formatVotes, getLocationLabel } from "../utils/formatting.js";

const FALLBACK_IMAGE = "./assets/images/placeholders/poster-empty.svg";

function safeImageUrl(value) {
    try {
        const url = new URL(value, window.location.href);

        if (url.protocol === "https:" || url.protocol === "http:") {
            return url.href;
        }
    } catch (error) {
        return FALLBACK_IMAGE;
    }

    return FALLBACK_IMAGE;
}

function makeTextElement(tagName, className, text) {
    const element = document.createElement(tagName);
    element.className = className;
    element.textContent = text;
    return element;
}

export function createPosterCard(poster, rank, { onVote, onPreview, highlightId = "" } = {}) {
    const article = document.createElement("article");
    const media = document.createElement("div");
    const previewButton = document.createElement("button");
    const image = document.createElement("img");
    const rankElement = document.createElement("span");
    const body = document.createElement("div");
    const title = makeTextElement("h3", "", poster.title);
    const maker = makeTextElement("p", "", `Maker: ${poster.creatorName}`);
    const meta = document.createElement("div");
    const locationBadge = makeTextElement("span", "badge", getLocationLabel(poster.location));
    const date = makeTextElement("span", "", formatDate(poster.createdAt));
    const voteRow = document.createElement("div");
    const voteCount = makeTextElement("span", "vote-count", formatVotes(poster.votesCount ?? 0));
    const actions = document.createElement("div");
    const voteButton = document.createElement("button");
    const viewButton = document.createElement("button");

    article.className = `poster-card rank-${Math.min(rank, 3)}`;

    if (rank <= 3) {
        article.classList.add("is-highlighted");
    }

    if (poster.id === highlightId) {
        article.classList.add("is-target");
        article.dataset.highlightedPoster = "true";
    }

    media.className = "poster-media";
    previewButton.className = "poster-image-button";
    previewButton.type = "button";
    previewButton.setAttribute("aria-label", `Bekijk poster ${poster.title} groot`);
    image.src = safeImageUrl(poster.imageUrl);
    image.alt = `Poster ${poster.title} van ${poster.creatorName}`;
    image.loading = "lazy";
    image.addEventListener("error", () => {
        image.src = FALLBACK_IMAGE;
    });
    rankElement.className = "poster-rank";
    rankElement.textContent = `#${rank}`;
    previewButton.append(image);
    media.append(previewButton, rankElement);

    body.className = "poster-body";
    meta.className = "poster-meta";
    meta.append(locationBadge, date);
    voteRow.className = "vote-row";
    voteRow.append(voteCount);

    if (poster.hasVoted) {
        const voted = makeTextElement("span", "badge", "Gestemd");
        voteRow.append(voted);
    }

    actions.className = "poster-actions";
    voteButton.className = "button button-primary";
    voteButton.type = "button";
    voteButton.textContent = poster.hasVoted ? "Gestemd" : "+1 stemmen";
    voteButton.disabled = Boolean(poster.hasVoted);
    viewButton.className = "button button-outline";
    viewButton.type = "button";
    viewButton.textContent = "Bekijk groot";
    actions.append(voteButton, viewButton);

    if (Array.isArray(poster.voterNames) && poster.voterNames.length > 0) {
        const details = document.createElement("details");
        const summary = document.createElement("summary");
        const names = document.createElement("p");

        summary.textContent = "Gestemd door";
        names.textContent = poster.voterNames.join(", ");
        details.append(summary, names);
        body.append(title, maker, meta, voteRow, details, actions);
    } else {
        body.append(title, maker, meta, voteRow, actions);
    }

    previewButton.addEventListener("click", () => {
        onPreview?.(poster);
    });
    viewButton.addEventListener("click", () => {
        onPreview?.(poster);
    });
    voteButton.addEventListener("click", () => {
        onVote?.(poster);
    });

    article.append(media, body);
    return article;
}
