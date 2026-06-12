export function initNavigation() {
    const page = document.body.dataset.page;
    const navList = document.querySelector("[data-nav-list]");
    const toggle = document.querySelector(".nav-toggle");

    document.querySelectorAll("[data-nav-link]").forEach((link) => {
        if (link.dataset.navLink === page) {
            link.setAttribute("aria-current", "page");
        }
    });

    if (!navList || !toggle) {
        return;
    }

    const setOpen = (isOpen) => {
        navList.classList.toggle("is-open", isOpen);
        toggle.setAttribute("aria-expanded", String(isOpen));
        toggle.querySelector(".sr-only").textContent = isOpen ? "Menu sluiten" : "Menu openen";
    };

    toggle.addEventListener("click", () => {
        setOpen(!navList.classList.contains("is-open"));
    });

    navList.addEventListener("click", (event) => {
        if (event.target.closest("a")) {
            setOpen(false);
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            setOpen(false);
        }
    });
}
