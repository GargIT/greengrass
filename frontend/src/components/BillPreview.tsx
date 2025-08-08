import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
} from "@mui/icons-material";

interface UtilityBilling {
  id: string;
  consumption: number; // consumption amount (volume/quantity)
  costPerUnit: number; // price per unit
  consumptionCost: number; // variable cost (consumption * costPerUnit)
  fixedCost: number; // fixed fee cost
  totalUtilityCost: number; // total cost for this line
  service: {
    id: string;
    name: string;
    description: string;
    unit: string;
    serviceType: string;
  };
  reconciliation?: {
    mainMeterTotal: number;
    householdTotal: number;
    difference: number;
    adjustmentPerHousehold: number;
  };
}

interface DetailedQuarterlyBill {
  id: string;
  totalUtilityCosts: number;
  memberFee: number;
  sharedCosts: number;
  totalAmount: number;
  dueDate: string;
  status: string;
  household: {
    id: string;
    householdNumber: number;
    ownerName: string;
    address: string;
  };
  billingPeriod: {
    id: string;
    periodName: string;
    startDate: string;
    endDate: string;
    readingDeadline: string;
  };
  utilityBillings: UtilityBilling[];
  payments: Array<{
    id: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    notes?: string;
  }>;
}

interface BillPreviewProps {
  open: boolean;
  onClose: () => void;
  billId: string | null;
}

const BillPreview: React.FC<BillPreviewProps> = ({ open, onClose, billId }) => {
  const [bill, setBill] = React.useState<DetailedQuarterlyBill | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [downloadingPDF, setDownloadingPDF] = React.useState(false);
  const [showSuccess, setShowSuccess] = React.useState(false);

  const fetchBillDetails = React.useCallback(async () => {
    if (!billId) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`/api/billing/quarterly/${billId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Kunde inte hämta fakturadetaljer");
      }

      const data = await response.json();
      setBill(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ett fel uppstod");
    } finally {
      setLoading(false);
    }
  }, [billId]);

  React.useEffect(() => {
    if (open && billId) {
      fetchBillDetails();
    }
  }, [open, billId, fetchBillDetails]);

  const formatCurrency = (amount: number) => {
    return Math.round(Number(amount)).toLocaleString("sv-SE") + " kr";
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("sv-SE");
  };

  const handleDownloadPDF = async () => {
    if (!billId || !bill) return;

    setDownloadingPDF(true);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`/api/billing/quarterly/${billId}/pdf`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Kunde inte generera PDF");
      }

      // Get the filename from the Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `Faktura_Hushall_${bill.household.householdNumber}.pdf`;

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

      setShowSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte ladda ner PDF");
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handlePrint = () => {
    if (bill) {
      window.print();
    }
  };

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: "600px" },
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5">
            📄 Faktura - {bill?.billingPeriod.periodName}
          </Typography>
          <Box>
            <IconButton color="primary" disabled={!bill} onClick={handlePrint}>
              <PrintIcon />
            </IconButton>
            <IconButton
              color="primary"
              disabled={!bill}
              onClick={handleDownloadPDF}
            >
              {downloadingPDF ? (
                <CircularProgress size={24} />
              ) : (
                <DownloadIcon />
              )}
            </IconButton>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {loading && (
          <Box display="flex" justifyContent="center" py={4}>
            <Typography>Laddar fakturadetaljer...</Typography>
          </Box>
        )}

        {error && (
          <Box py={2}>
            <Typography color="error">{error}</Typography>
          </Box>
        )}

        {bill && (
          <Box>
            {/* Header Information */}
            <Box
              display="flex"
              flexDirection={{ xs: "column", md: "row" }}
              gap={3}
              sx={{ mb: 3 }}
            >
              <Box flex={1}>
                <Typography variant="h6" gutterBottom>
                  Fakturainformation
                </Typography>
                <Typography variant="body2">
                  <strong>Fakturanummer:</strong> {bill.id.substring(0, 8)}
                </Typography>
                <Typography variant="body2">
                  <strong>Period:</strong> {bill.billingPeriod.periodName}
                </Typography>
                <Typography variant="body2">
                  <strong>Förfallodag:</strong> {formatDate(bill.dueDate)}
                </Typography>
                <Typography variant="body2">
                  <strong>Status:</strong>{" "}
                  {bill.status === "paid"
                    ? "Betald"
                    : bill.status === "pending"
                    ? "Väntande"
                    : "Förfallen"}
                </Typography>
              </Box>
              <Box flex={1}>
                <Typography variant="h6" gutterBottom>
                  Kund
                </Typography>
                <Typography variant="body2">
                  <strong>Hushåll:</strong> {bill.household.ownerName}
                </Typography>
                <Typography variant="body2">
                  <strong>Husnummer:</strong> {bill.household.householdNumber}
                </Typography>
                <Typography variant="body2">
                  <strong>Adress:</strong> {bill.household.address}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Billing Details */}
            <Typography variant="h6" gutterBottom>
              Fakturarader
            </Typography>

            <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <strong>Tjänst</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>Förbrukning</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>Pris/enhet</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>Rörlig kostnad</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>Fast avgift</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>Totalt</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bill.utilityBillings.map((billing) => {
                    // Simplified logic - each billing line now represents one specific cost type
                    let lineType = "";
                    let description = "";
                    let consumption = "";
                    let pricePerUnit = "";
                    let variableCost = "";
                    let fixedCost = "";

                    // Determine line type based on what's populated
                    if (Number(billing.fixedCost) !== 0) {
                      // Fixed fee line
                      lineType = "Fast avgift";
                      description = `Fast avgift för ${billing.service.name.toLowerCase()}`;
                      consumption = "1 st";
                      pricePerUnit = `${formatCurrency(
                        billing.fixedCost
                      )}/tertiärperiod`;
                      variableCost = "-";
                      fixedCost = formatCurrency(billing.fixedCost);
                    } else if (Number(billing.consumptionCost) !== 0) {
                      // Variable consumption line (including reconciliation)
                      if (billing.reconciliation) {
                        lineType = "Utjämning";
                        description = `Utjämning för ${billing.service.name.toLowerCase()}`;
                        // For reconciliation, show the consumption volume from the billing record
                        consumption = `${Number(billing.consumption).toFixed(
                          1
                        )} ${billing.service.unit}`;
                        pricePerUnit = `${formatCurrency(
                          billing.costPerUnit
                        )}/${billing.service.unit}`;
                        // Use the actual consumptionCost from the billing record
                        variableCost = formatCurrency(billing.consumptionCost);
                      } else {
                        lineType = "Rörlig kostnad";
                        description = `Förbrukning av ${billing.service.name.toLowerCase()}`;
                        consumption = `${Number(billing.consumption).toFixed(
                          1
                        )} ${billing.service.unit}`;
                        pricePerUnit = `${formatCurrency(
                          billing.costPerUnit
                        )}/${billing.service.unit}`;
                        variableCost = formatCurrency(billing.consumptionCost);
                      }
                      fixedCost = "-";
                    } else {
                      // Edge case - zero cost line (should not happen normally)
                      lineType = billing.service.name;
                      description =
                        billing.service.description ||
                        `${billing.service.name.toLowerCase()}`;
                      consumption = `${Number(billing.consumption).toFixed(
                        1
                      )} ${billing.service.unit}`;
                      pricePerUnit = "-";
                      variableCost = "-";
                      fixedCost = "-";
                    }

                    return (
                      <TableRow key={billing.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {billing.service.name} - {lineType}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {description}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{consumption}</TableCell>
                        <TableCell align="right">{pricePerUnit}</TableCell>
                        <TableCell align="right">
                          <strong>{variableCost}</strong>
                        </TableCell>
                        <TableCell align="right">
                          <strong>{fixedCost}</strong>
                        </TableCell>
                        <TableCell align="right">
                          <strong>
                            {formatCurrency(billing.totalUtilityCost)}
                          </strong>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Summary */}
            <Box sx={{ borderTop: 2, borderColor: "primary.main", pt: 2 }}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="h6">Totalt att betala:</Typography>
                <Typography variant="h5" color="primary.main" fontWeight="bold">
                  {formatCurrency(bill.totalAmount)}
                </Typography>
              </Box>
            </Box>

            {/* Payment Information */}
            {bill.payments && bill.payments.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Betalningar
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          <strong>Datum</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Metod</strong>
                        </TableCell>
                        <TableCell align="right">
                          <strong>Belopp</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Anteckningar</strong>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {bill.payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {formatDate(payment.paymentDate)}
                          </TableCell>
                          <TableCell>{payment.paymentMethod}</TableCell>
                          <TableCell align="right">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell>{payment.notes || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          Stäng
        </Button>
      </DialogActions>

      {/* Success notification */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={4000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setShowSuccess(false)} severity="success">
          PDF-faktura har laddats ner framgångsrikt!
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default BillPreview;
