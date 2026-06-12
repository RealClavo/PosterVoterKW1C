export function renderSkeletonGrid(container, count = 6) {
    container.replaceChildren();

    for (let index = 0; index < count; index += 1) {
        const item = document.createElement("article");
        item.className = "poster-card skeleton";
        item.setAttribute("aria-hidden", "true");
        container.append(item);
    }
}

export function renderEmptyState(container, title, message) {
    const wrapper = document.createElement("div");
    const image = document.createElement("img");
    const heading = document.createElement("h3");
    const paragraph = document.createElement("p");

    wrapper.className = "empty-state";
    image.src = "./assets/images/placeholders/poster-empty.svg";
    image.alt = "";
    image.setAttribute("aria-hidden", "true");
    heading.textContent = title;
    paragraph.textContent = message;
    wrapper.append(image, heading, paragraph);
    container.replaceChildren(wrapper);
}
