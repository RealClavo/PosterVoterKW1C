import { initNavigation } from "./navigation.js";

function setCurrentYear() {
    const year = String(new Date().getFullYear());
    document.querySelectorAll("[data-current-year]").forEach((element) => {
        element.textContent = year;
    });
}

function initBackToTop() {
    const button = document.querySelector("[data-back-to-top]");

    if (!button) {
        return;
    }

    const updateVisibility = () => {
        button.classList.toggle("is-visible", window.scrollY > 500);
    };

    button.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

    window.addEventListener("scroll", updateVisibility, { passive: true });
    updateVisibility();
}

initNavigation();
setCurrentYear();
initBackToTop();
