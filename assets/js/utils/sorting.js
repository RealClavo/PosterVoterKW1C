function byDateDescending(a, b) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export function sortPosters(posters, sortMode = "votes") {
    const sorted = [...posters];

    sorted.sort((a, b) => {
        if (sortMode === "newest") {
            return byDateDescending(a, b);
        }

        if (sortMode === "oldest") {
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }

        if (sortMode === "creator") {
            return a.creatorName.localeCompare(b.creatorName, "nl", { sensitivity: "base" });
        }

        if (sortMode === "title") {
            return a.title.localeCompare(b.title, "nl", { sensitivity: "base" });
        }

        const voteDifference = (b.votesCount ?? 0) - (a.votesCount ?? 0);

        if (voteDifference !== 0) {
            return voteDifference;
        }

        return byDateDescending(a, b);
    });

    return sorted;
}

export function filterPosters(posters, searchTerm = "") {
    const normalized = searchTerm.trim().toLowerCase();

    if (!normalized) {
        return [...posters];
    }

    return posters.filter((poster) => {
        return poster.title.toLowerCase().includes(normalized) || poster.creatorName.toLowerCase().includes(normalized);
    });
}
