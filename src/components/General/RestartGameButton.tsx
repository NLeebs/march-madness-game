"use client";
import React from "react";
import { useRestartTheGame } from "@/src/hooks";
import { Button } from "@/src/components";
import { PRIMARY_COLOR } from "@/src/constants";

export const RestartGameButton: React.FC = () => {
  const { restartTheGame } = useRestartTheGame();
  const [isRestarting, setIsRestarting] = React.useState(false);

  const restartButtonClickHandler = async () => {
    if (isRestarting) return;
    setIsRestarting(true);
    await restartTheGame();
    setIsRestarting(false);
  };

  return (
    <Button
      onClick={restartButtonClickHandler}
      text={isRestarting ? "Restarting..." : "Play Again"}
      backgroundColor={PRIMARY_COLOR}
      disabled={isRestarting}
    />
  );
};
