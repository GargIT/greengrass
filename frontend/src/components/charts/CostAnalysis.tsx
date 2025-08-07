import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, Typography, Box } from "@mui/material";

interface CostAnalysisProps {
  data: Array<{
    period: string;
    totalAmount: number;
    memberFees: number;
    utilityCosts: number;
    sharedCosts: number;
  }>;
  title?: string;
}

const CostAnalysis: React.FC<CostAnalysisProps> = ({
  data,
  title = "Kostnadsanalys per period",
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: "SEK",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatTooltip = (value: number, name: string) => {
    const labels: { [key: string]: string } = {
      memberFees: "Medlemsavgifter",
      utilityCosts: "Förbrukningskostnader",
      sharedCosts: "Gemensamma kostnader",
      totalAmount: "Total kostnad",
    };
    return [formatCurrency(value), labels[name] || name];
  };

  return (
    <Card sx={{ height: 400 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Box sx={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={formatCurrency} />
              <Tooltip
                formatter={formatTooltip}
                labelStyle={{ color: "#000" }}
              />
              <Legend />
              <Bar
                dataKey="memberFees"
                stackId="a"
                fill="#1976d2"
                name="Medlemsavgifter"
              />
              <Bar
                dataKey="utilityCosts"
                stackId="a"
                fill="#ed6c02"
                name="Förbrukningskostnader"
              />
              <Bar
                dataKey="sharedCosts"
                stackId="a"
                fill="#2e7d32"
                name="Gemensamma kostnader"
              />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

export default CostAnalysis;
