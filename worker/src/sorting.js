export function sortPublicPosters(posters, sortMode = "votes") {
    const sorted = [...posters];

    sorted.sort((a, b) => {
        if (sortMode === "newest") {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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

        const voteDifference = b.votes.length - a.votes.length;

        if (voteDifference !== 0) {
            return voteDifference;
        }

        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return sorted;
}
