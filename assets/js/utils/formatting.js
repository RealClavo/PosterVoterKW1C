const LOCATION_LABELS = {
    veghel: "Veghel",
    "den-bosch": "Den Bosch"
};

const dateFormatter = new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric"
});

export function getLocationLabel(location) {
    return LOCATION_LABELS[location] ?? "Onbekend";
}

export function formatDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Datum onbekend";
    }

    return dateFormatter.format(date);
}

export function formatVotes(count) {
    const safeCount = Number.isFinite(count) ? count : 0;
    return safeCount === 1 ? "1 stem" : `${safeCount} stemmen`;
}

export function formatFileSize(bytes) {
    if (!Number.isFinite(bytes)) {
        return "";
    }

    if (bytes < 1024 * 1024) {
        return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }

    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
