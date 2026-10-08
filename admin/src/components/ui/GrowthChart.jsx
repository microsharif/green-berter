import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function formatTick(value) {
  // value is "YYYY-MM-DD" or "YYYY-MM"
  const parts = String(value).split("-");
  if (parts.length === 3) return `${parts[1]}/${parts[2]}`;
  if (parts.length === 2) {
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    return months[Number(parts[1]) - 1] ?? value;
  }
  return value;
}

const PRIMARY = "#1f8f4e";

export default function GrowthChart({ data, type = "area", height = 280 }) {
  const series = data ?? [];
  return (
    <ResponsiveContainer width="100%" height={height}>
      {type === "bar" ? (
        <BarChart data={series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f0" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatTick}
            tick={{ fontSize: 11, fill: "#8a978f" }}
            axisLine={false}
            tickLine={false}
            minTickGap={16}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "#8a978f" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            labelFormatter={formatTick}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e4e9e6",
              fontSize: 12,
            }}
          />
          <Bar dataKey="count" fill={PRIMARY} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      ) : (
        <AreaChart data={series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={PRIMARY} stopOpacity={0.28} />
              <stop offset="95%" stopColor={PRIMARY} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f0" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatTick}
            tick={{ fontSize: 11, fill: "#8a978f" }}
            axisLine={false}
            tickLine={false}
            minTickGap={16}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "#8a978f" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            labelFormatter={formatTick}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e4e9e6",
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke={PRIMARY}
            strokeWidth={2}
            fill="url(#growthFill)"
          />
        </AreaChart>
      )}
    </ResponsiveContainer>
  );
}
