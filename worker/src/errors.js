export class AppError extends Error {
    constructor(status, code, message) {
        super(message);
        this.name = "AppError";
        this.status = status;
        this.code = code;
        this.publicMessage = message;
    }
}

export function isAppError(error) {
    return error instanceof AppError || (Number.isInteger(error?.status) && typeof error?.code === "string");
}
