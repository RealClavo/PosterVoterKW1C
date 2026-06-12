export const posterId = "550e8400-e29b-41d4-a716-446655440000";
export const secondPosterId = "550e8400-e29b-41d4-a716-446655440001";
export const hiddenPosterId = "550e8400-e29b-41d4-a716-446655440002";
export const browserId = "550e8400-e29b-41d4-a716-446655440010";

export function makeDatabase() {
    return {
        version: 1,
        updatedAt: "2026-06-12T00:00:00.000Z",
        posters: [
            {
                id: posterId,
                title: "Open Dag Poster",
                creatorName: "Rens",
                location: "veghel",
                imagePath: `assets/uploads/${posterId}.webp`,
                createdAt: "2026-06-12T12:00:00.000Z",
                isVisible: true,
                votes: []
            },
            {
                id: secondPosterId,
                title: "Techniek Festival",
                creatorName: "Sam",
                location: "den-bosch",
                imagePath: `assets/uploads/${secondPosterId}.webp`,
                createdAt: "2026-06-13T12:00:00.000Z",
                isVisible: true,
                votes: [
                    {
                        id: "550e8400-e29b-41d4-a716-446655440011",
                        voterName: "Alex",
                        voterHash: "a".repeat(64),
                        createdAt: "2026-06-13T13:00:00.000Z"
                    }
                ]
            },
            {
                id: hiddenPosterId,
                title: "Verborgen Poster",
                creatorName: "Noor",
                location: "veghel",
                imagePath: `assets/uploads/${hiddenPosterId}.webp`,
                createdAt: "2026-06-14T12:00:00.000Z",
                isVisible: false,
                votes: []
            }
        ]
    };
}
