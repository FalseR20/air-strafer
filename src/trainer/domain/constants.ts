import type { TickQuality } from "./types";

export const TICK_RATE = 64;
export const TICK_MS = 1000 / TICK_RATE;
export const JUMP_TICK_COUNT = 48;
export const RESULT_TICK_COUNT = 64;
export const DEADZONE = 0;
export const MOUSE_WINDOW = 6;

export const qualityLabels: Record<TickQuality, string> = {
  sync: "Synced",
  miss: "No key",
  wrong: "Wrong key",
  overlap: "Overlap",
  neutral: "Neutral",
};
