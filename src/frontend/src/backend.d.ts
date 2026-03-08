import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface HighScoreEntry {
    player: Principal;
    mode: GameMode;
    score: bigint;
    timestamp: bigint;
}
export interface UserProfile {
    name: string;
}
export enum GameMode {
    freeKick = "freeKick",
    penalty = "penalty",
    kickoff = "kickoff"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getPlayerBestScore(player: Principal, mode: GameMode): Promise<HighScoreEntry | null>;
    getPlayerTopScores(player: Principal): Promise<{
        freeKick?: HighScoreEntry;
        penalty?: HighScoreEntry;
        kickoff?: HighScoreEntry;
    }>;
    getTopScores(mode: GameMode): Promise<Array<HighScoreEntry>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    submitHighScore(score: bigint, timestamp: bigint, mode: GameMode): Promise<void>;
}
