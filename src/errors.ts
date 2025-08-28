import { Agent } from "./agent";


export class BlockedError extends Error {
    constructor(public phone: string) {
        super("Account is possibly blocked");
    }
}

export class InUseError extends Error {
    constructor(public phone: string) {
        super("Account is already in use");
    }
}