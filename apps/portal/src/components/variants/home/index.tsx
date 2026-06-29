"use client";

import { useVariant } from "@dentalos/ui";
import type { HomeData } from "./types";
import { HomeHub } from "./hub";
import { HomeTimeline } from "./timeline";
import { HomeMinimal } from "./minimal";

const LABELS = ["Action hub", "Timeline", "Minimal"];

export function HomeVariants({ initial, data }: { initial: number; data: HomeData }) {
  const v = useVariant("home", "Home layout", LABELS, initial);
  if (v === 1) return <HomeTimeline data={data} />;
  if (v === 2) return <HomeMinimal data={data} />;
  return <HomeHub data={data} />;
}
