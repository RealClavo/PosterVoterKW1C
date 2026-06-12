function getDefaultApiBaseUrl() {
    const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);

    if (localHosts.has(window.location.hostname)) {
        return "http://localhost:8787/api";
    }

    return "https://postervoter-api.realclavo.workers.dev/api";
}

export const CONFIG = {
    apiBaseUrl: getDefaultApiBaseUrl(),
    turnstileSiteKey: "",
    environment: window.location.hostname.includes("github.io") ? "production" : "development",
    requestTimeoutMs: 12000
};
