let activeModal = null;

function getFocusableElements(root) {
    return [...root.querySelectorAll("a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])")];
}

export function openModal({ title, content, className = "" }) {
    if (activeModal) {
        activeModal.close();
    }

    const lastFocusedElement = document.activeElement;
    const backdrop = document.createElement("div");
    const panel = document.createElement("section");
    const titleElement = document.createElement("h2");
    const closeButton = document.createElement("button");
    const contentWrap = document.createElement("div");
    const titleId = `modal-title-${crypto.randomUUID()}`;

    backdrop.className = "modal-backdrop";
    panel.className = `modal-panel ${className}`.trim();
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-labelledby", titleId);
    titleElement.className = "modal-title";
    titleElement.id = titleId;
    titleElement.textContent = title;
    closeButton.className = "modal-close";
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Sluiten");
    closeButton.textContent = "×";

    if (content instanceof Node) {
        contentWrap.append(content);
    }

    panel.append(closeButton, titleElement, contentWrap);
    backdrop.append(panel);
    document.body.append(backdrop);
    document.body.classList.add("modal-open");

    const close = () => {
        backdrop.remove();
        document.body.classList.remove("modal-open");
        document.removeEventListener("keydown", handleKeydown);

        if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
            lastFocusedElement.focus();
        }

        activeModal = null;
    };

    const handleKeydown = (event) => {
        if (event.key === "Escape") {
            close();
            return;
        }

        if (event.key !== "Tab") {
            return;
        }

        const focusableElements = getFocusableElements(panel);

        if (focusableElements.length === 0) {
            event.preventDefault();
            panel.focus();
            return;
        }

        // Focus trapping: Tab blijft binnen de modal, zodat toetsenbordgebruikers niet achter de popup komen.
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
        }
    };

    closeButton.addEventListener("click", close);
    backdrop.addEventListener("click", (event) => {
        if (event.target === backdrop) {
            close();
        }
    });
    document.addEventListener("keydown", handleKeydown);

    activeModal = { close, panel };

    window.requestAnimationFrame(() => {
        const focusableElements = getFocusableElements(panel);
        (focusableElements[0] ?? closeButton).focus();
    });

    return activeModal;
}
