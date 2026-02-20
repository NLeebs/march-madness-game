"use client";
import { useMediaQuery } from "@/src/hooks";
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

const formatShortDate = (str: string) => {
  const date = new Date(str);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

export const UserBracketChart = ({
  data,
  lineColor,
}: UserBracketChartProps) => {
  const isMobile = useMediaQuery("(max-width: 640px)");

  return (
    <div className="w-full bg-blue-50 px-2 py-3 sm:p-4 rounded-md">
      <h2 className="text-base sm:text-lg text-center font-bold normal-case mb-2">
        Your Bracket Scores
      </h2>
      <ResponsiveContainer width="100%" height={isMobile ? 220 : 300}>
        <LineChart
          data={data}
          margin={
            isMobile
              ? { top: 5, right: 10, bottom: 20, left: -10 }
              : { top: 5, right: 20, bottom: 5, left: 0 }
          }
        >
          <XAxis
            dataKey="created_at"
            tickFormatter={formatShortDate}
            tick={{ fontSize: isMobile ? 10 : 12 }}
            angle={isMobile ? -45 : 0}
            textAnchor={isMobile ? "end" : "middle"}
          />
          <YAxis
            hide={isMobile}
            tick={{ fontSize: 12 }}
            width={40}
          />
          <Tooltip
            labelFormatter={(label) =>
              new Date(label).toLocaleDateString(undefined, {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            }
          />
          <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey="score"
            stroke={lineColor}
            strokeWidth={2}
            dot={{ r: isMobile ? 3 : 4 }}
            activeDot={{ r: isMobile ? 5 : 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
