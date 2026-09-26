import { z } from "zod";

/** Playable gorilla-tag modes. */
export const gorillaModeSchema = z.enum(["roam", "tag", "tagger"]);

export type GorillaMode = z.infer<typeof gorillaModeSchema>;

export const gorillaModeOptionSchema = z.object({
  id: gorillaModeSchema,
  title: z.string(),
  description: z.string(),
  hint: z.string(),
});

export type GorillaModeOption = z.infer<typeof gorillaModeOptionSchema>;

/** Start-screen cards and in-game hints for each mode. */
export const GORILLA_MODE_OPTIONS: GorillaModeOption[] = [
  {
    id: "roam",
    title: "ROAM",
    description: "No taggers. Slam around the forest.",
    hint: "Mouse — arm · Slam ground — jump · A/D — look",
  },
  {
    id: "tag",
    title: "TAG",
    description: "Taggers chase you. Don't get tagged.",
    hint: "Mouse — arm · Slam ground — jump · A/D — look · Avoid the taggers",
  },
  {
    id: "tagger",
    title: "TAGGER",
    description: "You are the tagger. Hunt the other gorillas.",
    hint: "Mouse — arm · Slam ground — jump · A/D — look · Tag the brown gorillas",
  },
];

/**
 * Returns start-screen copy for a mode.
 *
 * @param mode - Selected mode.
 */
export function getGorillaModeOption(mode: GorillaMode): GorillaModeOption {
  const option = GORILLA_MODE_OPTIONS.find((entry) => entry.id === mode);
  return option ?? GORILLA_MODE_OPTIONS[1]!;
}
