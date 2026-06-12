export function showToast(message, type = "info") {
    const region = document.querySelector("[data-toast-region]");

    if (!region) {
        return;
    }

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.dataset.type = type;
    toast.setAttribute("role", type === "error" ? "alert" : "status");
    toast.textContent = message;
    region.append(toast);

    window.setTimeout(() => {
        toast.remove();
    }, 5200);
}
