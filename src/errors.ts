import { Agent } from "./agent";


export class BlockedError extends Error {
    constructor(public phone: string) {
        super("Blocked!");
    }
}