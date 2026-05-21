// Wisconsin overlay — ported from prototype in Phase G.
import type { WisconsinOverlayResult } from "@/lib/engine/primacy";

export type { WisconsinOverlayResult };

export interface WisconsinOverlayInput {
  claim: Record<string, unknown>;
  recovery?: Record<string, unknown>;
}

// Phase G: port Wisconsin overlay logic from prototype lines ~60–100 verbatim.
export function wisconsinOverlay(
  _input: WisconsinOverlayInput
): WisconsinOverlayResult {
  throw new Error("WI overlay not yet implemented — complete in Phase G");
}
