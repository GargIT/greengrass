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
} from "@mui/material";
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
} from "@mui/icons-material";

interface UtilityBilling {
  id: string;
  rawConsumption: number;
  reconciliationAdjustment: number;
  adjustedConsumption: number;
  costPerUnit: number;
  consumptionCost: number;
  fixedFeeShare: number;
  totalUtilityCost: number;
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
            <IconButton color="primary" disabled={!bill}>
              <PrintIcon />
            </IconButton>
            <IconButton color="primary" disabled={!bill}>
              <DownloadIcon />
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
                  {bill.utilityBillings.map((billing) => (
                    <React.Fragment key={billing.id}>
                      {billing.service.serviceType === "WATER" && (
                        <>
                          {/* Vatten - Rörlig kostnad */}
                          <TableRow>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {billing.service.name} - Rörlig kostnad
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {Number(billing.rawConsumption).toFixed(1)} m³
                                {billing.reconciliationAdjustment !== 0 &&
                                  ` + ${Number(
                                    billing.reconciliationAdjustment
                                  ).toFixed(1)} m³ utjämning`}
                                {billing.reconciliationAdjustment !== 0 &&
                                  ` = ${Number(
                                    billing.adjustedConsumption
                                  ).toFixed(1)} m³`}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              {Number(billing.adjustedConsumption).toFixed(1)}{" "}
                              {billing.service.unit}
                            </TableCell>
                            <TableCell align="right">
                              {formatCurrency(billing.costPerUnit)}/
                              {billing.service.unit}
                            </TableCell>
                            <TableCell align="right">
                              <strong>
                                {formatCurrency(billing.consumptionCost)}
                              </strong>
                            </TableCell>
                            <TableCell align="right">-</TableCell>
                            <TableCell align="right">
                              <strong>
                                {formatCurrency(billing.consumptionCost)}
                              </strong>
                            </TableCell>
                          </TableRow>

                          {/* Vatten - Fast avgift */}
                          <TableRow>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {billing.service.name} - Fast avgift
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Kvartalsavgift för vattenförsörjning
                              </Typography>
                            </TableCell>
                            <TableCell align="right">1 st</TableCell>
                            <TableCell align="right">
                              {formatCurrency(billing.fixedFeeShare)}/kvartal
                            </TableCell>
                            <TableCell align="right">-</TableCell>
                            <TableCell align="right">
                              <strong>
                                {formatCurrency(billing.fixedFeeShare)}
                              </strong>
                            </TableCell>
                            <TableCell align="right">
                              <strong>
                                {formatCurrency(billing.fixedFeeShare)}
                              </strong>
                            </TableCell>
                          </TableRow>
                        </>
                      )}

                      {billing.service.serviceType === "MEMBERSHIP" && (
                        <TableRow>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {billing.service.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {billing.service.description}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">1 st</TableCell>
                          <TableCell align="right">
                            {formatCurrency(billing.fixedFeeShare)}/kvartal
                          </TableCell>
                          <TableCell align="right">-</TableCell>
                          <TableCell align="right">
                            <strong>
                              {formatCurrency(billing.totalUtilityCost)}
                            </strong>
                          </TableCell>
                          <TableCell align="right">
                            <strong>
                              {formatCurrency(billing.totalUtilityCost)}
                            </strong>
                          </TableCell>
                        </TableRow>
                      )}

                      {billing.service.serviceType === "OTHER" && (
                        <TableRow>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {billing.service.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {billing.service.description}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">1 st</TableCell>
                          <TableCell align="right">
                            {formatCurrency(billing.fixedFeeShare)}/kvartal
                          </TableCell>
                          <TableCell align="right">-</TableCell>
                          <TableCell align="right">
                            <strong>
                              {formatCurrency(billing.totalUtilityCost)}
                            </strong>
                          </TableCell>
                          <TableCell align="right">
                            <strong>
                              {formatCurrency(billing.totalUtilityCost)}
                            </strong>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
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
    </Dialog>
  );
};

export default BillPreview;
