import React from "react";

import BracketRound from "./BracketRound";
import BracketLine from "./BracketLine";

function TournamentBracket() {
  const teams = Array.from({ length: 64 }, (_, index) => `Team ${index + 1}`);
  console.log(teams);

  return (
    <div className="flex flex-col justify-center items-center">
      <div className="flex flex-col space-y-12">
        <BracketRound teams={[teams[0], teams[1]]} />
        <BracketLine />
        <BracketRound teams={[teams[2], teams[3]]} />
        <BracketLine />
      </div>
    </div>
  );
}

export default TournamentBracket;
