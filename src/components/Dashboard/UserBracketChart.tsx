"use client";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface UserBracketChartProps {
  data: { score: number; created_at: string }[];
  lineColor: string;
}

export const UserBracketChart = ({
  data,
  lineColor,
}: UserBracketChartProps) => {
  return (
    <div className="w-full">
      <h2 className="text-lg text-center font-bold normal-case">
        Your Bracket Scores
      </h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <XAxis
            dataKey="created_at"
            tickFormatter={(str) => new Date(str).toLocaleDateString()}
          />
          <YAxis />
          <Tooltip
            labelFormatter={(label) =>
              new Date(label).toLocaleDateString(undefined, {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            }
          />
          <CartesianGrid stroke="#eee" />
          <Line type="monotone" dataKey="score" stroke={lineColor} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
