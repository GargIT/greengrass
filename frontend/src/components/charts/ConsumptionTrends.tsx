import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, Typography, Box } from "@mui/material";

interface ConsumptionTrendsProps {
  data: Array<{
    period: string;
    totalConsumption: number;
    avgConsumption: number;
    readingsCount: number;
  }>;
  title?: string;
  serviceUnit?: string;
}

const ConsumptionTrends: React.FC<ConsumptionTrendsProps> = ({
  data,
  title = "Förbrukningstrender",
  serviceUnit = "enheter",
}) => {
  const formatTooltip = (value: number, name: string) => {
    if (name === "totalConsumption") {
      return [`${value.toFixed(1)} ${serviceUnit}`, "Total förbrukning"];
    }
    if (name === "avgConsumption") {
      return [
        `${value.toFixed(1)} ${serviceUnit}`,
        "Genomsnittlig förbrukning",
      ];
    }
    return [value, name];
  };

  return (
    <Card sx={{ height: 400 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Box sx={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <LineChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={formatTooltip} />
              <Legend />
              <Line
                type="monotone"
                dataKey="totalConsumption"
                stroke="#1976d2"
                strokeWidth={2}
                dot={{ fill: "#1976d2", strokeWidth: 2, r: 4 }}
                name="Total förbrukning"
              />
              <Line
                type="monotone"
                dataKey="avgConsumption"
                stroke="#ed6c02"
                strokeWidth={2}
                dot={{ fill: "#ed6c02", strokeWidth: 2, r: 4 }}
                name="Genomsnitt"
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ConsumptionTrends;
