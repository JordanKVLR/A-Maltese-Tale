import type { TrackId } from "./tracks";

/**
 * Which piece plays where. Kept apart from the screens so the choices can be tested.
 *
 * Every map plays the recorded world song and every battle the recorded battle song; the scored
 * pieces they replaced are still in the Music Room.
 */
export function mapTrack(_stage?: { gym?: unknown; biomes: readonly string[] }): TrackId {
  return "overworld";
}

export function battleTrack(_trainer?: { isGymLeader?: boolean } | null): TrackId {
  return "battleWild";
}
