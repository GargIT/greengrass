import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, Typography, Box } from "@mui/material";

interface ServiceCostBreakdownProps {
  data: Array<{
    serviceType: string;
    totalCost: number;
    avgCostPerUnit: number;
    totalConsumption: number;
  }>;
  title?: string;
}

const ServiceCostBreakdown: React.FC<ServiceCostBreakdownProps> = ({
  data,
  title = "Kostnadsfördelning per tjänst",
}) => {
  const colors = [
    "#1976d2", // Blue
    "#ed6c02", // Orange
    "#2e7d32", // Green
    "#9c27b0", // Purple
    "#d32f2f", // Red
    "#f57c00", // Amber
    "#5d4037", // Brown
    "#455a64", // Blue Grey
  ];

  const serviceTypeLabels: { [key: string]: string } = {
    WATER: "Vatten",
    ELECTRICITY: "El",
    HEATING: "Värme",
    INTERNET: "Internet",
    MEMBERSHIP: "Medlemsavgift",
    OTHER: "Övrigt",
  };

  const chartData = data.map((item, index) => ({
    ...item,
    name: serviceTypeLabels[item.serviceType] || item.serviceType,
    fill: colors[index % colors.length],
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: "SEK",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatTooltip = (value: number, name: string) => {
    if (name === "totalCost") {
      return [formatCurrency(value), "Total kostnad"];
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
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} ${((percent || 0) * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="totalCost"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={formatTooltip} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ServiceCostBreakdown;
