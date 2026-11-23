"use client";
import React from "react";
import { motion } from "framer-motion";
import { TournamentRound } from "@/src/components";
import styles from "@/src/components/Tournament/css/Tournament.module.css";
import type { BracketRound, ColumnLayout } from "@/src/functions/tournament";
import type { TournamentRegion } from "@/types";

type Half = "top" | "bottom";

interface ColumnStyle {
  testId: string;
  regions: Record<Half, TournamentRegion[]>;
  /** Wide-layout classes after `col-span-1 flex flex-col gap-y-16 min-w-300`. */
  wide: Record<Half, string>;
  /** Narrow-layout CSS grid area class. */
  grid: Record<Half, string>;
}

const HALF_REGIONS: Record<Half, TournamentRegion[]> = {
  top: ["west", "east"],
  bottom: ["south", "midwest"],
};

const COLUMNS: Record<BracketRound, ColumnStyle> = {
  1: {
    testId: "bracket-column-1",
    regions: HALF_REGIONS,
    wide: { top: "", bottom: "" },
    grid: { top: styles.gridRound64Top, bottom: styles.gridRound64Bottom },
  },
  2: {
    testId: "bracket-column-2",
    regions: HALF_REGIONS,
    wide: { top: "relative", bottom: "relative" },
    grid: { top: styles.gridRound32Top, bottom: styles.gridRound32Bottom },
  },
  "sweet sixteen": {
    testId: "bracket-column-sweet-sixteen",
    regions: HALF_REGIONS,
    wide: { top: "absolute left-120", bottom: "absolute right-120" },
    grid: { top: styles.gridSweetSixteenTop, bottom: styles.gridSweetSixteenBottom },
  },
  "elite eight": {
    testId: "bracket-column-elite-eight",
    regions: HALF_REGIONS,
    wide: { top: "relative left-20", bottom: "relative right-20" },
    grid: { top: styles.gridEliteEightTop, bottom: styles.gridEliteEightBottom },
  },
  "final four": {
    testId: "bracket-column-final-four",
    regions: { top: ["eastWest"], bottom: ["southMidwest"] },
    wide: { top: "absolute left-156", bottom: "absolute right-156" },
    grid: { top: styles.gridFinalFourTop, bottom: styles.gridFinalFourBottom },
  },
};

interface BracketColumnProps {
  round: BracketRound;
  half: Half;
  layout: ColumnLayout;
  /** The wide (single-row) bracket layout, as opposed to the narrow grid. */
  wide: boolean;
}

/** One bracket round on one half of the bracket, collapsing to width 0 when scrolled away. */
export const BracketColumn: React.FC<BracketColumnProps> = ({ round, half, layout, wide }) => {
  const column = COLUMNS[round];
  const size = layout.expanded ? "max-content" : 0;
  // the bottom round-1 column has always clipped both axes
  const overflow = round === 1 && half === "bottom" ? "overflow-hidden" : "overflow-x-clip";
  const placement = wide
    ? ["col-span-1 flex flex-col gap-y-16 min-w-300", column.wide[half]].filter(Boolean).join(" ")
    : column.grid[half];

  return (
    <motion.div
      data-testid={column.testId}
      initial={false}
      animate={{ width: size, height: size }}
      className={`${overflow} h-max ${placement}`}
    >
      {column.regions[half].map((region) => (
        <TournamentRound
          key={region}
          region={region}
          round={round}
          roundUIPosition={layout.position}
        />
      ))}
    </motion.div>
  );
};
