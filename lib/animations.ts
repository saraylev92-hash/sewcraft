// Animated demonstrations for the fiddly steps (turning, folding, binding, boxing corners…).
// An animation is a short storyboard of full scenes on the same 400×300 canvas as the template it
// belongs to, built from the SAME template args, so tones, captions and dimensions stay in sync with the
// static illustration. The last frame should match the static template. Keep 3–5 frames, ≤ 60 chars per caption.
import type { Frame } from "./types";

type Args = Record<string, unknown>;

/** template name → storyboard builder. Templates without an entry stay static. */
export const ANIMATIONS: Record<string, (a: Args) => Frame[]> = {};

export function animationFor(name: string, args: Args | undefined): Frame[] | undefined {
  const f = ANIMATIONS[name];
  return f ? f(args ?? {}) : undefined;
}
