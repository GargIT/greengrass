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

interface HouseholdComparisonProps {
  data: Array<{
    household: {
      number: number;
      owner: string;
    };
    costs: {
      total: number;
      utilities: number;
      average: number;
    };
    consumption: {
      total: number;
      average: number;
    };
  }>;
  title?: string;
  showCosts?: boolean;
  showConsumption?: boolean;
}

const HouseholdComparison: React.FC<HouseholdComparisonProps> = ({
  data,
  title = "Jämförelse mellan hushåll",
  showCosts = true,
  showConsumption = false,
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: "SEK",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatYAxis = (value: number) => {
    if (showConsumption && !showCosts) {
      return `${value.toFixed(1)} m³`;
    }
    return showCosts ? formatCurrency(value) : value.toString();
  };

  const formatTooltip = (value: number, name: string) => {
    const labels: { [key: string]: string } = {
      total: "Total kostnad",
      utilities: "Förbrukningskostnad",
      totalConsumption: "Total förbrukning",
      avgConsumption: "Genomsnittlig förbrukning",
    };

    const isConsumption = name.includes("Consumption");
    const isCostData = name === "total" || name === "utilities";

    let formattedValue: string;
    if (isConsumption) {
      formattedValue = `${value.toFixed(1)} m³`;
    } else if (isCostData && showCosts) {
      formattedValue = formatCurrency(value);
    } else {
      formattedValue = value.toFixed(1);
    }

    return [formattedValue, labels[name] || name];
  };

  const chartData = data.map((item) => ({
    household: `Hushåll ${item.household.number}`,
    total: item.costs.total,
    utilities: item.costs.utilities,
    totalConsumption: item.consumption.total,
    avgConsumption: item.consumption.average,
  }));

  return (
    <Card sx={{ height: 400 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Box sx={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="household"
                tick={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={formatYAxis} />
              <Tooltip
                formatter={formatTooltip}
                labelStyle={{ color: "#000" }}
              />
              <Legend />

              {showCosts && (
                <>
                  <Bar dataKey="total" fill="#1976d2" name="Total kostnad" />
                  <Bar
                    dataKey="utilities"
                    fill="#ed6c02"
                    name="Förbrukningskostnad"
                  />
                </>
              )}

              {showConsumption && (
                <>
                  <Bar
                    dataKey="totalConsumption"
                    fill="#2e7d32"
                    name="Total förbrukning"
                  />
                  <Bar
                    dataKey="avgConsumption"
                    fill="#9c27b0"
                    name="Genomsnittlig förbrukning"
                  />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

export default HouseholdComparison;
