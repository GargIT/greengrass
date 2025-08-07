import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
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
  Add as AddIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import {
  DataGrid,
  type GridColDef,
  type GridRowParams,
  GridActionsCellItem,
} from "@mui/x-data-grid";
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

interface BillingReadiness {
  billingPeriodId: string;
  periodName: string;
  readingDeadline: string;
  totalHouseholds: number;
  householdsReady: number;
  householdsMissingReadings: number;
  allReadingsComplete: boolean;
  missingReadings: Array<{
    householdNumber: number;
    ownerName: string;
    missingServices: string[];
  }>;
  householdStatus: Array<{
    householdId: string;
    householdNumber: number;
    ownerName: string;
    hasAllReadings: boolean;
    missingServices: string[];
    submittedReadings: number;
    totalMeters: number;
  }>;
}

const Billing: React.FC = () => {
  // Get current user for role-based access
  const userString = localStorage.getItem("user");
  const currentUser = userString ? JSON.parse(userString) : null;
  const isAdmin = currentUser?.role === "ADMIN";

  const [bills, setBills] = useState<QuarterlyBill[]>([]);
  const [periods, setPeriods] = useState<BillingPeriod[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [readiness, setReadiness] = useState<BillingReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [selectedHousehold, setSelectedHousehold] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Bill preview dialog
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState<string>("");

  // Bulk operations
  const [bulkPdfLoading, setBulkPdfLoading] = useState(false);

  // Bill generation and readiness
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [billGenerationLoading, setBillGenerationLoading] = useState(false);
  const [selectedPeriodForGeneration, setSelectedPeriodForGeneration] =
    useState<string>("");

  // Bill deletion (development only)
  const [billDeletionLoading, setBillDeletionLoading] = useState(false);

  // DataGrid columns for bills
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

  const handleMarkAsPaid = async (billId: string) => {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        `/api/billing/quarterly/${billId}/mark-paid`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentDate: new Date().toISOString().split("T")[0],
            paymentMethod: "manual",
            notes: "Markerad som betald via admin-gränssnitt",
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Kunde inte markera fakturan som betald");
      }

      const result = await response.json();

      // Show success message
      setError(null);

      // Refresh data to show updated status
      await fetchData();

      console.log("Faktura markerad som betald:", result.message);
    } catch (error) {
      console.error("Fel vid markering som betald:", error);
      setError(
        `Kunde inte markera som betald: ${
          error instanceof Error ? error.message : "Okänt fel"
        }`
      );
    }
  };

  const handleDownloadPdf = async (billId: string, householdNumber: number) => {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`/api/billing/quarterly/${billId}/pdf`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Kunde inte ladda ner PDF");
      }

      // Get the filename from the Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `Faktura_Hushall_${householdNumber}.pdf`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte ladda ner PDF");
    }
  };

  const columns: GridColDef[] = [
    {
      field: "id",
      headerName: "ID",
      width: 90,
      sortable: false,
      filterable: false,
    },
    {
      field: "householdInfo",
      headerName: "Hushåll",
      width: 200,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {params.row.household.ownerName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Hus {params.row.household.householdNumber}
          </Typography>
        </Box>
      ),
    },
    {
      field: "periodName",
      headerName: "Period",
      width: 150,
      valueGetter: (_, row) => row.billingPeriod?.periodName || "",
    },
    {
      field: "totalUtilityCosts",
      headerName: "Vattenkostnad",
      width: 130,
      type: "number",
      align: "right",
      headerAlign: "right",
      valueFormatter: (value: number) =>
        `${Math.round(value).toLocaleString("sv-SE")} kr`,
    },
    {
      field: "memberFee",
      headerName: "Medlemsavgift",
      width: 130,
      type: "number",
      align: "right",
      headerAlign: "right",
      valueFormatter: (value: number) =>
        `${Math.round(value).toLocaleString("sv-SE")} kr`,
    },
    {
      field: "totalAmount",
      headerName: "Totalt",
      width: 130,
      type: "number",
      align: "right",
      headerAlign: "right",
      valueFormatter: (value: number) =>
        `${Math.round(value).toLocaleString("sv-SE")} kr`,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="medium">
          {Math.round(params.value).toLocaleString("sv-SE")} kr
        </Typography>
      ),
    },
    {
      field: "dueDate",
      headerName: "Förfallodag",
      width: 120,
      valueFormatter: (value: string) =>
        value ? new Date(value).toLocaleDateString("sv-SE") : "",
    },
    {
      field: "status",
      headerName: "Status",
      width: 120,
      renderCell: (params) => (
        <Chip
          label={getStatusText(params.value)}
          color={getStatusColor(params.value)}
          size="small"
        />
      ),
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Åtgärder",
      width: 150,
      getActions: (params) => {
        const actions = [
          <GridActionsCellItem
            key="view"
            icon={
              <Tooltip title="Visa detaljer">
                <ViewIcon />
              </Tooltip>
            }
            label="Visa detaljer"
            onClick={() => handleViewBill(params.row.id)}
          />,
          <GridActionsCellItem
            key="download"
            icon={
              <Tooltip title="Ladda ner PDF">
                <DownloadIcon />
              </Tooltip>
            }
            label="Ladda ner PDF"
            onClick={() =>
              handleDownloadPdf(
                params.row.id,
                params.row.household.householdNumber
              )
            }
          />,
        ];

        if (params.row.status === "pending") {
          actions.push(
            <GridActionsCellItem
              key="payment"
              icon={
                <Tooltip title="Markera som betald">
                  <PaymentIcon color="success" />
                </Tooltip>
              }
              label="Markera som betald"
              onClick={() => {
                handleMarkAsPaid(params.row.id);
              }}
            />
          );
        }

        return actions;
      },
    },
  ];

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

  const handleBulkPdfDownload = async () => {
    if (!selectedPeriod) {
      setError("Välj en faktureringsperiod först");
      return;
    }

    setBulkPdfLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch("/api/billing/generate-pdfs", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          billingPeriodId: selectedPeriod,
        }),
      });

      if (!response.ok) {
        throw new Error("Kunde inte generera PDF-filer");
      }

      const result = await response.json();

      // Show success message
      const { successful, failed } = result.data.summary;
      if (successful > 0) {
        setError(null);
        // You could show a success snackbar here
        console.log(
          `Successfully generated ${successful} PDFs${
            failed > 0 ? `, ${failed} failed` : ""
          }`
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Kunde inte generera PDF-filer"
      );
    } finally {
      setBulkPdfLoading(false);
    }
  };

  // Check billing readiness for a period
  const checkBillingReadiness = async (periodId: string) => {
    if (!periodId) return;

    setReadinessLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`/api/billing/check-readiness/${periodId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Kunde inte kontrollera faktureringsbereder");
      }

      const data = await response.json();
      setReadiness(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ett fel uppstod");
    } finally {
      setReadinessLoading(false);
    }
  };

  // Generate bills for a period
  const generateBills = async (periodId: string, billType: "quarterly") => {
    setBillGenerationLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch("/api/billing/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          billingPeriodId: periodId,
          billType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (errorData && errorData.message) {
          throw new Error(errorData.message);
        }
        throw new Error("Kunde inte generera fakturor");
      }

      const data = await response.json();

      // Refresh data after successful generation
      await fetchData();

      // Show success message
      setError(null);
      alert(
        `Framgångsrikt genererade ${data.data.length} ${
          billType === "quarterly" ? "periodfakturor" : "månadsfakturor"
        }!`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ett fel uppstod");
    } finally {
      setBillGenerationLoading(false);
    }
  };

  // Delete bills for a period (development only)
  const deleteBillsForPeriod = async (periodId: string) => {
    setBillDeletionLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch("/api/billing/delete-period-bills", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          billingPeriodId: periodId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (errorData && errorData.message) {
          throw new Error(errorData.message);
        }
        throw new Error("Kunde inte ta bort fakturor");
      }

      const data = await response.json();

      // Refresh data after successful deletion
      await fetchData();

      // Show success message
      setError(null);
      const {
        totalDeleted,
        periodName,
        deletedQuarterlyBills,
        deletedUtilityBilling,
        deletedUtilityReconciliation,
      } = data.data;

      let message = `Framgångsrikt borttagna ${totalDeleted} poster för period ${periodName}!`;
      if (
        deletedQuarterlyBills > 0 ||
        deletedUtilityBilling > 0 ||
        deletedUtilityReconciliation > 0
      ) {
        message += `\n\nDetaljer:`;
        if (deletedQuarterlyBills > 0)
          message += `\n• ${deletedQuarterlyBills} periodfakturor`;
        if (deletedUtilityBilling > 0)
          message += `\n• ${deletedUtilityBilling} faktureringsposter`;
        if (deletedUtilityReconciliation > 0)
          message += `\n• ${deletedUtilityReconciliation} avstämningsposter`;
      }

      alert(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ett fel uppstod");
    } finally {
      setBillDeletionLoading(false);
    }
  };

  // Handle period selection for generation
  const handleGenerationPeriodChange = async (event: SelectChangeEvent) => {
    const periodId = event.target.value;
    setSelectedPeriodForGeneration(periodId);

    if (periodId) {
      await checkBillingReadiness(periodId);
    } else {
      setReadiness(null);
    }
  };

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
          💰 Periodfakturor
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Hantera och granska periodfakturor för samfällighetsföreningen
          (4-månaders perioder)
        </Typography>
        {/* Debug info - remove in production */}
        <Typography
          variant="caption"
          color="info.main"
          sx={{ display: "block", mt: 1 }}
        >
          Debug: Användarroll = {currentUser?.role || "Ingen"} | isAdmin ={" "}
          {isAdmin ? "Ja" : "Nej"}
        </Typography>
      </Box>

      {/* Bill Generation Section - Only for admins */}
      {isAdmin && (
        <Card
          sx={{
            mb: 3,
            bgcolor: "success.50",
            border: "2px solid",
            borderColor: "success.main",
            overflow: "unset",
          }}
        >
          <CardContent>
            <Typography
              variant="h6"
              gutterBottom
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                color: "success.dark",
              }}
            >
              <AddIcon color="success" />
              🚀 NYTT: Skapa nya fakturor med säkerhetskontroll
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              ⚡ Kontrollera automatiskt att alla hushåll har lämnat in
              mätaravläsningar innan du skapar fakturor. Endast slutförda
              perioder kan faktureras.
            </Typography>

            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              alignItems={{ xs: "stretch", md: "flex-start" }}
            >
              <FormControl sx={{ minWidth: 300 }}>
                <InputLabel>Välj period för fakturering</InputLabel>
                <Select
                  value={selectedPeriodForGeneration}
                  label="Välj period för fakturering"
                  onChange={handleGenerationPeriodChange}
                  disabled={readinessLoading}
                >
                  <MenuItem value="">Välj period...</MenuItem>
                  {periods
                    .filter((period) => {
                      // Only show completed periods (end date is in the past)
                      const periodEnd = new Date(period.endDate);
                      const now = new Date();
                      return periodEnd <= now;
                    })
                    .map((period) => (
                      <MenuItem key={period.id} value={period.id}>
                        {period.periodName}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>

              {readinessLoading && <CircularProgress size={24} />}
            </Stack>

            {/* Readiness Status */}
            {readiness && (
              <Box sx={{ mt: 3 }}>
                <Card
                  variant="outlined"
                  sx={{
                    bgcolor: readiness.allReadingsComplete
                      ? "success.50"
                      : "warning.50",
                  }}
                >
                  <CardContent>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={2}
                      sx={{ mb: 2 }}
                    >
                      {readiness.allReadingsComplete ? (
                        <CheckCircleIcon color="success" />
                      ) : (
                        <WarningIcon color="warning" />
                      )}
                      <Box>
                        <Typography variant="h6">
                          {readiness.allReadingsComplete
                            ? "✅ Alla avläsningar kompletta - Redo för fakturering!"
                            : "⚠️ Avläsningar saknas"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Period: {readiness.periodName} | Deadline:{" "}
                          {new Date(
                            readiness.readingDeadline
                          ).toLocaleDateString("sv-SE")}
                        </Typography>
                      </Box>
                    </Stack>

                    <Box
                      display="grid"
                      gridTemplateColumns={{ xs: "1fr", sm: "repeat(3, 1fr)" }}
                      gap={2}
                      sx={{ mb: 2 }}
                    >
                      <Box textAlign="center">
                        <Typography variant="h4" color="text.primary">
                          {readiness.householdsReady}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Hushåll klara
                        </Typography>
                      </Box>
                      <Box textAlign="center">
                        <Typography
                          variant="h4"
                          color={
                            readiness.householdsMissingReadings > 0
                              ? "warning.main"
                              : "text.primary"
                          }
                        >
                          {readiness.householdsMissingReadings}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Hushåll saknar avläsningar
                        </Typography>
                      </Box>
                      <Box textAlign="center">
                        <Typography variant="h4" color="text.primary">
                          {readiness.totalHouseholds}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Totalt hushåll
                        </Typography>
                      </Box>
                    </Box>

                    {!readiness.allReadingsComplete &&
                      readiness.missingReadings.length > 0 && (
                        <Box>
                          <Typography
                            variant="subtitle2"
                            color="warning.main"
                            sx={{ mb: 1 }}
                          >
                            Hushåll som saknar avläsningar:
                          </Typography>
                          <Box sx={{ maxHeight: 200, overflow: "auto" }}>
                            {readiness.missingReadings.map((missing) => (
                              <Alert
                                key={missing.householdNumber}
                                severity="warning"
                                sx={{ mb: 1 }}
                              >
                                <Typography variant="body2">
                                  <strong>
                                    Hushåll {missing.householdNumber}
                                  </strong>{" "}
                                  ({missing.ownerName})
                                  <br />
                                  Saknar: {missing.missingServices.join(", ")}
                                </Typography>
                              </Alert>
                            ))}
                          </Box>
                        </Box>
                      )}

                    {/* Action Buttons - Generate and Delete */}
                    {selectedPeriodForGeneration && (
                      <Stack direction="row" spacing={3} sx={{ mt: 3 }}>
                        {/* Generate Bills Button */}
                        {readiness.allReadingsComplete && (
                          <Stack direction="row" spacing={2}>
                            <IconButton
                              onClick={() =>
                                generateBills(
                                  readiness.billingPeriodId,
                                  "quarterly"
                                )
                              }
                              disabled={billGenerationLoading}
                              sx={{
                                bgcolor: "success.main",
                                color: "white",
                                "&:hover": { bgcolor: "success.dark" },
                                padding: 2,
                              }}
                            >
                              {billGenerationLoading ? (
                                <CircularProgress size={20} color="inherit" />
                              ) : (
                                <AddIcon />
                              )}
                            </IconButton>
                            <Box>
                              <Typography variant="body1">
                                Generera periodfakturor
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Skapa fakturor för alla{" "}
                                {readiness.totalHouseholds} hushåll
                              </Typography>
                            </Box>
                          </Stack>
                        )}

                        {/* Delete Bills Button (Development) */}
                        <Stack direction="row" spacing={2}>
                          <IconButton
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Är du säker på att du vill ta bort ALL faktureringsdata för period ${
                                    periods.find(
                                      (p) =>
                                        p.id === selectedPeriodForGeneration
                                    )?.periodName || "vald period"
                                  }?\n\nDetta kommer att ta bort:\n• Periodfakturor\n• Faktureringsposter (utility_billing)\n• Avstämningar (utility_reconciliation)\n\nDetta kan inte ångras!`
                                )
                              ) {
                                deleteBillsForPeriod(
                                  selectedPeriodForGeneration
                                );
                              }
                            }}
                            disabled={billDeletionLoading}
                            sx={{
                              bgcolor: "error.main",
                              color: "white",
                              "&:hover": { bgcolor: "error.dark" },
                              padding: 2,
                            }}
                          >
                            {billDeletionLoading ? (
                              <CircularProgress size={20} color="inherit" />
                            ) : (
                              <DeleteIcon />
                            )}
                          </IconButton>
                          <Box>
                            <Typography variant="body1" color="error.main">
                              Ta bort all faktureringsdata
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              🚧 Utvecklingsfunktion - tar bort fakturor,
                              faktureringsposter och avstämningar
                            </Typography>
                          </Box>
                        </Stack>
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Show info for non-admins */}
      {!isAdmin && (
        <Card sx={{ mb: 3, bgcolor: "grey.100" }}>
          <CardContent>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ color: "text.secondary" }}
            >
              ℹ️ Fakturagenerering
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Funktioner för att skapa nya fakturor är endast tillgängliga för
              administratörer.
            </Typography>
          </CardContent>
        </Card>
      )}

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
      <Card sx={{ mb: 3, overflow: "unset" }}>
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
                {periods
                  .filter((period) => {
                    // Only show completed periods (end date is in the past)
                    const periodEnd = new Date(period.endDate);
                    const now = new Date();
                    return periodEnd <= now;
                  })
                  .map((period) => (
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

            <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
              <Tooltip title="Ladda ner alla PDFs för vald period">
                <IconButton
                  onClick={handleBulkPdfDownload}
                  disabled={!selectedPeriod || bulkPdfLoading}
                  color="primary"
                >
                  {bulkPdfLoading ? (
                    <CircularProgress size={24} />
                  ) : (
                    <DownloadIcon />
                  )}
                </IconButton>
              </Tooltip>
              <Tooltip title="Uppdatera">
                <IconButton onClick={fetchData}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Bills DataGrid */}
      <Card sx={{ flexGrow: 1, overflow: "hidden" }}>
        <Box sx={{ height: 600, width: "100%" }}>
          <DataGrid
            rows={filteredBills}
            columns={columns}
            loading={loading}
            disableRowSelectionOnClick
            pageSizeOptions={[25, 50, 100]}
            initialState={{
              pagination: { paginationModel: { pageSize: 25 } },
              columns: {
                columnVisibilityModel: {
                  id: false,
                },
              },
            }}
            onRowDoubleClick={(params: GridRowParams) =>
              handleViewBill(params.row.id)
            }
            sx={{
              "& .MuiDataGrid-row": {
                cursor: "pointer",
              },
            }}
          />
        </Box>
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
