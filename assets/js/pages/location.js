import { castVote, getPosters } from "../services/api-service.js";
import { getVoterId } from "../storage.js";
import { validateVoteName } from "../validation.js";
import { renderSkeletonGrid } from "../components/loading-state.js";
import { renderPosterGrid } from "../components/poster-grid.js";
import { openModal } from "../components/modal.js";
import { showToast } from "../components/toast.js";
import { filterPosters, sortPosters } from "../utils/sorting.js";
import { formatVotes, getLocationLabel } from "../utils/formatting.js";

const state = {
    posters: [],
    isLoading: false
};

const location = document.body.dataset.location;
const grid = document.querySelector("[data-poster-grid]");
const statusLine = document.querySelector("[data-status-line]");
const searchInput = document.querySelector("[data-search-input]");
const sortSelect = document.querySelector("[data-sort-select]");
const retryButton = document.querySelector("[data-retry-button]");
const highlightId = new URLSearchParams(window.location.search).get("poster") ?? "";
const MIN_LIGHTBOX_ZOOM = 1;
const MAX_LIGHTBOX_ZOOM = 4;

function setStatus(message) {
    if (statusLine) {
        statusLine.textContent = message;
    }
}

function updateLocationStats(posters) {
    const totalVotes = posters.reduce((sum, poster) => sum + (poster.votesCount ?? 0), 0);

    document.querySelector("[data-location-stat='posters']").textContent = String(posters.length);
    document.querySelector("[data-location-stat='votes']").textContent = String(totalVotes);
}

function getVisiblePosters() {
    return sortPosters(filterPosters(state.posters, searchInput?.value ?? ""), sortSelect?.value ?? "votes");
}

function scrollToHighlightedPoster() {
    const target = document.querySelector("[data-highlighted-poster='true']");

    if (target) {
        target.scrollIntoView({ block: "center", behavior: "smooth" });
    }
}

function render() {
    const visiblePosters = getVisiblePosters();

    renderPosterGrid(grid, visiblePosters, {
        onVote: openVoteModal,
        onPreview: openPreviewModal,
        highlightId
    });
    setStatus(`${visiblePosters.length} poster${visiblePosters.length === 1 ? "" : "s"} gevonden.`);
    window.setTimeout(scrollToHighlightedPoster, 120);
}

async function loadPosters() {
    state.isLoading = true;
    setStatus("De posters worden geladen...");
    renderSkeletonGrid(grid);

    try {
        const data = await getPosters({
            location,
            sort: "votes",
            browserId: getVoterId()
        });
        state.posters = data.posters ?? [];
        updateLocationStats(state.posters);
        render();
    } catch (error) {
        state.posters = [];
        updateLocationStats([]);
        setStatus("De poster kon niet worden geladen.");
        grid.replaceChildren();
        showToast("De poster kon niet worden geladen.", "error");
    } finally {
        state.isLoading = false;
    }
}

function openPreviewModal(poster) {
    const content = document.createElement("div");
    const zoomStage = document.createElement("div");
    const controls = document.createElement("div");
    const image = document.createElement("img");
    const resetButton = document.createElement("button");
    const maker = document.createElement("p");
    const votes = document.createElement("p");
    const zoomState = {
        scale: MIN_LIGHTBOX_ZOOM,
        x: 0,
        y: 0,
        isDragging: false,
        startX: 0,
        startY: 0,
        originX: 0,
        originY: 0
    };

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    const clampPan = () => {
        const maxX = (zoomStage.clientWidth * (zoomState.scale - MIN_LIGHTBOX_ZOOM)) / 2;
        const maxY = (zoomStage.clientHeight * (zoomState.scale - MIN_LIGHTBOX_ZOOM)) / 2;

        zoomState.x = clamp(zoomState.x, -maxX, maxX);
        zoomState.y = clamp(zoomState.y, -maxY, maxY);
    };

    const applyZoom = () => {
        if (zoomState.scale === MIN_LIGHTBOX_ZOOM) {
            zoomState.x = 0;
            zoomState.y = 0;
        }

        clampPan();
        image.style.transform = `translate(${zoomState.x}px, ${zoomState.y}px) scale(${zoomState.scale})`;
        zoomStage.dataset.zoomed = String(zoomState.scale > MIN_LIGHTBOX_ZOOM);
        resetButton.disabled = zoomState.scale === MIN_LIGHTBOX_ZOOM;
    };

    zoomStage.className = "lightbox-zoom-stage";
    controls.className = "lightbox-controls";
    image.className = "lightbox-image";
    image.src = poster.imageUrl;
    image.alt = `Poster ${poster.title} van ${poster.creatorName}`;
    resetButton.className = "button button-outline";
    resetButton.type = "button";
    resetButton.textContent = "Reset zoom";
    resetButton.disabled = true;
    maker.textContent = `Maker: ${poster.creatorName} · ${getLocationLabel(poster.location)}`;
    votes.textContent = formatVotes(poster.votesCount ?? 0);

    zoomStage.append(image);
    controls.append(resetButton);
    content.append(zoomStage, controls, maker, votes);

    zoomStage.addEventListener("wheel", (event) => {
        event.preventDefault();
        const previousScale = zoomState.scale;
        const direction = event.deltaY < 0 ? 1 : -1;
        const nextScale = clamp(previousScale + direction * 0.25, MIN_LIGHTBOX_ZOOM, MAX_LIGHTBOX_ZOOM);

        if (nextScale === previousScale) {
            return;
        }

        const rect = zoomStage.getBoundingClientRect();
        const pointerX = event.clientX - rect.left - rect.width / 2;
        const pointerY = event.clientY - rect.top - rect.height / 2;

        // Bij scrollen blijft het punt onder de muis ongeveer op dezelfde plek, zoals bij een kaartviewer.
        zoomState.x = pointerX - (nextScale / previousScale) * (pointerX - zoomState.x);
        zoomState.y = pointerY - (nextScale / previousScale) * (pointerY - zoomState.y);
        zoomState.scale = nextScale;
        applyZoom();
    }, { passive: false });

    zoomStage.addEventListener("pointerdown", (event) => {
        if (zoomState.scale === MIN_LIGHTBOX_ZOOM) {
            return;
        }

        // Slepen werkt alleen als er is ingezoomd; anders blijft de poster rustig op zijn plek.
        zoomState.isDragging = true;
        zoomState.startX = event.clientX;
        zoomState.startY = event.clientY;
        zoomState.originX = zoomState.x;
        zoomState.originY = zoomState.y;
        zoomStage.setPointerCapture(event.pointerId);
    });

    zoomStage.addEventListener("pointermove", (event) => {
        if (!zoomState.isDragging) {
            return;
        }

        zoomState.x = zoomState.originX + event.clientX - zoomState.startX;
        zoomState.y = zoomState.originY + event.clientY - zoomState.startY;
        applyZoom();
    });

    zoomStage.addEventListener("pointerup", () => {
        zoomState.isDragging = false;
    });

    zoomStage.addEventListener("pointercancel", () => {
        zoomState.isDragging = false;
    });

    resetButton.addEventListener("click", () => {
        zoomState.scale = MIN_LIGHTBOX_ZOOM;
        applyZoom();
    });

    openModal({
        title: poster.title,
        content,
        className: "lightbox-panel"
    });
}

function openVoteModal(poster) {
    const form = document.createElement("form");
    const intro = document.createElement("p");
    const field = document.createElement("div");
    const label = document.createElement("label");
    const input = document.createElement("input");
    const hint = document.createElement("p");
    const error = document.createElement("p");
    const actions = document.createElement("div");
    const cancelButton = document.createElement("button");
    const submitButton = document.createElement("button");
    const modal = openModal({ title: `Stem op ${poster.title}`, content: form });

    form.className = "vote-form";
    intro.textContent = "Gebruik alleen je voornaam of een alias. Deze naam wordt bij de stem opgeslagen.";
    field.className = "field";
    label.htmlFor = "vote-name";
    label.textContent = "Voornaam of alias";
    input.id = "vote-name";
    input.name = "voterName";
    input.type = "text";
    input.minLength = 2;
    input.maxLength = 32;
    input.autocomplete = "given-name";
    input.required = true;
    hint.className = "field-hint";
    hint.textContent = "Geen achternaam, e-mailadres of studentnummer nodig.";
    error.className = "form-status";
    error.setAttribute("aria-live", "polite");
    actions.className = "form-actions";
    cancelButton.className = "button button-outline";
    cancelButton.type = "button";
    cancelButton.textContent = "Annuleren";
    submitButton.className = "button button-primary";
    submitButton.type = "submit";
    submitButton.textContent = "Stem bevestigen";

    field.append(label, input, hint);
    actions.append(cancelButton, submitButton);
    form.append(intro, field, error, actions);

    cancelButton.addEventListener("click", () => {
        modal.close();
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const validation = validateVoteName(input.value);

        if (!validation.valid) {
            error.textContent = validation.message;
            input.focus();
            return;
        }

        submitButton.disabled = true;
        cancelButton.disabled = true;
        error.textContent = "De wijzigingen worden veilig opgeslagen...";

        try {
            await castVote(poster.id, validation.value, getVoterId());
            modal.close();
            showToast("Je stem is toegevoegd!", "success");
            await loadPosters();
        } catch (apiError) {
            if (apiError.code === "ALREADY_VOTED") {
                error.textContent = "Je hebt al op deze poster gestemd.";
                showToast("Je hebt al op deze poster gestemd.", "error");
                await loadPosters();
            } else {
                error.textContent = apiError.message;
                showToast(apiError.message, "error");
            }
        } finally {
            submitButton.disabled = false;
            cancelButton.disabled = false;
        }
    });
}

searchInput?.addEventListener("input", render);
sortSelect?.addEventListener("change", render);
retryButton?.addEventListener("click", loadPosters);

loadPosters();
