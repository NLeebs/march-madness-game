import React from "react";

interface BracketRoundProps {
  teamNames: string[];
}

export const BracketRound: React.FC<BracketRoundProps> = ({ teamNames }) => {
  return (
    <div className="flex flex-col space-y-2">
      {teamNames.map((teamName, index) => (
        <div
          key={index}
          className={`w-24 h-10 bg-white border-2 rounded-md flex justify-center items-center ${
            index % 2 === 0 ? "border-blue-600" : "border-red-600"
          }`}
        >
          <p className="text-sm">{teamName}</p>
        </div>
      ))}
    </div>
  );
};
