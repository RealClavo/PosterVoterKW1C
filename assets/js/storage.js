const VOTER_ID_KEY = "postervoter_voter_id";
let memoryVoterId = "";

function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function getVoterId() {
    try {
        const storedValue = window.localStorage.getItem(VOTER_ID_KEY);

        if (isUuid(storedValue)) {
            return storedValue;
        }

        const nextValue = crypto.randomUUID();
        window.localStorage.setItem(VOTER_ID_KEY, nextValue);
        return nextValue;
    } catch (error) {
        if (!isUuid(memoryVoterId)) {
            memoryVoterId = crypto.randomUUID();
        }

        return memoryVoterId;
    }
}
