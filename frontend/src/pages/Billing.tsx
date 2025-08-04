import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  IconButton,
  Tooltip,
  Stack,
  type SelectChangeEvent,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Payment as PaymentIcon,
} from "@mui/icons-material";
import BillPreview from "../components/BillPreview";

interface Household {
  id: string;
  householdNumber: number;
  ownerName: string;
}

interface BillingPeriod {
  id: string;
  periodName: string;
  startDate: string;
  endDate: string;
}

interface Payment {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
}

interface QuarterlyBill {
  id: string;
  totalUtilityCosts: number;
  memberFee: number;
  sharedCosts: number;
  totalAmount: number;
  dueDate: string;
  status: "pending" | "paid" | "overdue";
  household: Household;
  billingPeriod: BillingPeriod;
  payments: Payment[];
}

const Billing: React.FC = () => {
  const [bills, setBills] = useState<QuarterlyBill[]>([]);
  const [periods, setPeriods] = useState<BillingPeriod[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [selectedHousehold, setSelectedHousehold] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Bill preview dialog
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState<string>("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("accessToken");
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      // Fetch bills
      const billsUrl = new URL(
        "/api/billing/quarterly",
        window.location.origin
      );
      if (selectedPeriod) billsUrl.searchParams.set("periodId", selectedPeriod);
      if (selectedHousehold)
        billsUrl.searchParams.set("householdId", selectedHousehold);

      const [billsRes, periodsRes, householdsRes] = await Promise.all([
        fetch(billsUrl.toString(), { headers }),
        fetch("/api/billing/periods", { headers }),
        fetch("/api/households", { headers }),
      ]);

      if (!billsRes.ok || !periodsRes.ok || !householdsRes.ok) {
        throw new Error("Kunde inte hämta data");
      }

      const [billsData, periodsData, householdsData] = await Promise.all([
        billsRes.json(),
        periodsRes.json(),
        householdsRes.json(),
      ]);

      setBills(billsData.data || []);
      setPeriods(periodsData.data || []);
      setHouseholds(householdsData.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ett fel uppstod");
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, selectedHousehold]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePeriodChange = (event: SelectChangeEvent) => {
    setSelectedPeriod(event.target.value);
  };

  const handleHouseholdChange = (event: SelectChangeEvent) => {
    setSelectedHousehold(event.target.value);
  };

  const handleStatusChange = (event: SelectChangeEvent) => {
    setStatusFilter(event.target.value);
  };

  const getStatusColor = (status: string): "success" | "error" | "warning" => {
    switch (status) {
      case "paid":
        return "success";
      case "overdue":
        return "error";
      case "pending":
      default:
        return "warning";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "paid":
        return "Betald";
      case "overdue":
        return "Förfallen";
      case "pending":
      default:
        return "Väntande";
    }
  };

  const handleViewBill = (billId: string) => {
    setSelectedBillId(billId);
    setPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    setSelectedBillId("");
  };

  const filteredBills = bills.filter((bill) => {
    if (statusFilter !== "all" && bill.status !== statusFilter) {
      return false;
    }
    return true;
  });

  const totalAmount = filteredBills.reduce(
    (sum, bill) => sum + Number(bill.totalAmount),
    0
  );
  const paidAmount = filteredBills
    .filter((bill) => bill.status === "paid")
    .reduce((sum, bill) => sum + Number(bill.totalAmount), 0);
  const pendingAmount = filteredBills
    .filter((bill) => bill.status === "pending")
    .reduce((sum, bill) => sum + Number(bill.totalAmount), 0);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        width: "100%",
        overflow: "hidden",
        p: { xs: 2, sm: 3, md: 4 },
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          💰 Kvartalsfakturor
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Hantera och granska kvartalsfakturor för samfällighetsföreningen
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Box
        display="grid"
        gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" }}
        gap={3}
        sx={{ mb: 3 }}
      >
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Totalt belopp
            </Typography>
            <Typography variant="h5">
              {Math.round(totalAmount).toLocaleString("sv-SE")} kr
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Betalda fakturor
            </Typography>
            <Typography variant="h5" color="success.main">
              {Math.round(paidAmount).toLocaleString("sv-SE")} kr
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Väntande betalning
            </Typography>
            <Typography variant="h5" color="warning.main">
              {Math.round(pendingAmount).toLocaleString("sv-SE")} kr
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Antal fakturor
            </Typography>
            <Typography variant="h5">{filteredBills.length}</Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems="center"
          >
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Period</InputLabel>
              <Select
                value={selectedPeriod}
                label="Period"
                onChange={handlePeriodChange}
              >
                <MenuItem value="">Alla perioder</MenuItem>
                {periods.map((period) => (
                  <MenuItem key={period.id} value={period.id}>
                    {period.periodName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Hushåll</InputLabel>
              <Select
                value={selectedHousehold}
                label="Hushåll"
                onChange={handleHouseholdChange}
              >
                <MenuItem value="">Alla hushåll</MenuItem>
                {households.map((household) => (
                  <MenuItem key={household.id} value={household.id}>
                    {household.ownerName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={handleStatusChange}
              >
                <MenuItem value="all">Alla</MenuItem>
                <MenuItem value="pending">Väntande</MenuItem>
                <MenuItem value="paid">Betalda</MenuItem>
                <MenuItem value="overdue">Förfallna</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ ml: "auto" }}>
              <Tooltip title="Uppdatera">
                <IconButton onClick={fetchData}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Bills Table */}
      <Card sx={{ flexGrow: 1, overflow: "hidden" }}>
        <TableContainer sx={{ height: "100%" }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Hushåll</TableCell>
                <TableCell>Period</TableCell>
                <TableCell align="right">Vattenkostnad</TableCell>
                <TableCell align="right">Medlemsavgift</TableCell>
                <TableCell align="right">Totalt</TableCell>
                <TableCell>Förfallodag</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Åtgärder</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredBills.map((bill) => (
                <TableRow key={bill.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {bill.household.ownerName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Hus {bill.household.householdNumber}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {bill.billingPeriod.periodName}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {Math.round(bill.totalUtilityCosts).toLocaleString(
                        "sv-SE"
                      )}{" "}
                      kr
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {Math.round(bill.memberFee).toLocaleString("sv-SE")} kr
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="medium">
                      {Math.round(bill.totalAmount).toLocaleString("sv-SE")} kr
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(bill.dueDate).toLocaleDateString("sv-SE")}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusText(bill.status)}
                      color={getStatusColor(bill.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <Tooltip title="Visa detaljer">
                        <IconButton
                          size="small"
                          onClick={() => handleViewBill(bill.id)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Ladda ner PDF">
                        <IconButton size="small">
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>
                      {bill.status === "pending" && (
                        <Tooltip title="Markera som betald">
                          <IconButton size="small" color="success">
                            <PaymentIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {filteredBills.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ py: 4 }}
                    >
                      Inga fakturor hittades
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Bill Preview Dialog */}
      <BillPreview
        open={previewOpen}
        onClose={handleClosePreview}
        billId={selectedBillId}
      />
    </Box>
  );
};

export default Billing;
