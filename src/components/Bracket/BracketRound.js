import React from "react";

export const BracketRound = ({ teams }) => {
  return (
    <div className="flex flex-col space-y-2">
      {teams.map((team, index) => (
        <div
          key={index}
          className={`w-24 h-10 bg-white border-2 rounded-md flex justify-center items-center ${
            index % 2 === 0 ? "border-blue-600" : "border-red-600"
          }`}
        >
          <p className="text-sm">{team}</p>
        </div>
      ))}
    </div>
  );
};
