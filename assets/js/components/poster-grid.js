import { createPosterCard } from "./poster-card.js";
import { renderEmptyState } from "./loading-state.js";

export function renderPosterGrid(container, posters, callbacks = {}) {
    container.replaceChildren();

    if (posters.length === 0) {
        renderEmptyState(container, "Er zijn nog geen posters voor deze locatie.", "Upload de eerste poster of probeer een andere zoekterm.");
        return;
    }

    const fragment = document.createDocumentFragment();

    posters.forEach((poster, index) => {
        fragment.append(createPosterCard(poster, index + 1, callbacks));
    });

    container.append(fragment);
}
