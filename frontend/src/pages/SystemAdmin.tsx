import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Email as EmailIcon,
  Send as SendIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Pending as PendingIcon,
} from "@mui/icons-material";

interface SmtpTestResult {
  success: boolean;
  data?: {
    isWorking: boolean;
    message: string;
  };
  message?: string;
  error?: string;
}

interface EmailQueueItem {
  id: string;
  to: string;
  subject: string;
  status: "PENDING" | "SENDING" | "SENT" | "FAILED" | "CANCELLED";
  attempts: number;
  createdAt: string;
  sentAt?: string;
  errorMessage?: string;
}

interface QueueStats {
  _count: { status: number };
  status: string;
}

interface BillingPeriod {
  id: string;
  periodName: string;
  periodType: string;
  startDate: string;
  endDate: string;
  readingDeadline: string;
  status: "upcoming" | "deadline_soon" | "overdue";
  daysToDeadline: number;
  hasReadings: boolean;
  _count: {
    householdMeterReadings: number;
  };
}

const SystemAdmin: React.FC = () => {
  const [smtpTestResult, setSmtpTestResult] = useState<SmtpTestResult | null>(
    null
  );
  const [queueStatus, setQueueStatus] = useState<{
    queueStats: QueueStats[];
    recentEmails: EmailQueueItem[];
  } | null>(null);
  const [testEmailForm, setTestEmailForm] = useState({
    to: "",
    templateName: "new_invoice",
    testData: {
      ownerName: "Test Användare",
      householdNumber: "20",
      invoiceNumber: "TEST-2025-001",
      periodName: "T2 2025",
      billingPeriod: "T2 2025 (Maj-Augusti)",
      dueDate: "2025-09-30",
      totalAmount: "2,847.50",
      amount: "2,847.50",
      loginUrl: "http://localhost:5174",
      paymentDate: "2025-08-25",
      daysOverdue: "5",
      readingDeadline: "2025-09-15",
      daysUntilDeadline: "3",
      missingServices: ["Vatten", "El"],
    },
  });
  const [loading, setLoading] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<
    { type: "success" | "error" | "info"; message: string }[]
  >([]);
  const [billingPeriods, setBillingPeriods] = useState<BillingPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");

  const addAlert = (type: "success" | "error" | "info", message: string) => {
    setAlerts((prev) => [...prev, { type, message }]);
    setTimeout(() => {
      setAlerts((prev) => prev.slice(1));
    }, 5000);
  };

  const getAuthToken = async (): Promise<string> => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      throw new Error("No access token found");
    }
    return token;
  };

  const testSmtpConnection = async () => {
    setLoading("smtp");
    try {
      const token = await getAuthToken();
      const response = await fetch("/api/notifications/test", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await response.json();
      setSmtpTestResult(result);

      if (result.success) {
        addAlert("success", "SMTP connection test successful!");
      } else {
        addAlert("error", "SMTP connection test failed");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      addAlert("error", `Error testing SMTP: ${errorMessage}`);
      setSmtpTestResult({ success: false, error: errorMessage });
    } finally {
      setLoading(null);
    }
  };

  const getQueueStatus = async () => {
    setLoading("queue");
    try {
      const token = await getAuthToken();
      const response = await fetch("/api/notifications/queue-status", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await response.json();

      if (result.success) {
        setQueueStatus(result.data);
        addAlert("success", "Queue status loaded");
      } else {
        addAlert("error", "Failed to load queue status");
      }
    } catch (error) {
      addAlert("error", `Error loading queue status: ${error}`);
    } finally {
      setLoading(null);
    }
  };

  const processQueue = async () => {
    setLoading("process");
    try {
      const token = await getAuthToken();
      const response = await fetch("/api/notifications/process-queue", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await response.json();

      if (result.success) {
        addAlert("success", "Email queue processed successfully");
        // Refresh queue status
        await getQueueStatus();
      } else {
        addAlert("error", "Failed to process queue");
      }
    } catch (error) {
      addAlert("error", `Error processing queue: ${error}`);
    } finally {
      setLoading(null);
    }
  };

  const sendTestEmail = async () => {
    setLoading("test-email");
    try {
      const token = await getAuthToken();
      const response = await fetch("/api/notifications/test-email", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testEmailForm),
      });
      const result = await response.json();

      if (result.success) {
        addAlert(
          "success",
          `Test email queued successfully! Email ID: ${result.data.emailId}`
        );
        // Refresh queue status
        await getQueueStatus();
      } else {
        addAlert("error", `Failed to send test email: ${result.message}`);
      }
    } catch (error) {
      addAlert("error", `Error sending test email: ${error}`);
    } finally {
      setLoading(null);
    }
  };

  const getBillingPeriods = async () => {
    setLoading("billing-periods");
    try {
      const token = await getAuthToken();
      const response = await fetch("/api/notifications/billing-periods", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await response.json();

      if (result.success) {
        setBillingPeriods(result.data);
        addAlert("success", "Billing periods loaded");
      } else {
        addAlert("error", "Failed to load billing periods");
      }
    } catch (error) {
      addAlert("error", `Error loading billing periods: ${error}`);
    } finally {
      setLoading(null);
    }
  };

  const sendMeterReadingReminders = async (
    reminderType: "advance" | "overdue"
  ) => {
    setLoading(`meter-reminder-${reminderType}`);
    try {
      const token = await getAuthToken();
      const response = await fetch(
        "/api/notifications/send-meter-reading-reminders",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            billingPeriodId: selectedPeriodId || undefined,
            reminderType,
          }),
        }
      );
      const result = await response.json();

      if (result.success) {
        addAlert("success", result.data.message);
        // Refresh queue status
        await getQueueStatus();
      } else {
        addAlert("error", "Failed to send meter reading reminders");
      }
    } catch (error) {
      addAlert("error", `Error sending meter reading reminders: ${error}`);
    } finally {
      setLoading(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "SENT":
        return <CheckCircleIcon color="success" />;
      case "FAILED":
        return <ErrorIcon color="error" />;
      case "PENDING":
        return <PendingIcon color="warning" />;
      default:
        return <PendingIcon color="info" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SENT":
        return "success";
      case "FAILED":
        return "error";
      case "PENDING":
        return "warning";
      default:
        return "info";
    }
  };

  const getPeriodStatusColor = (status: string) => {
    switch (status) {
      case "overdue":
        return "error";
      case "deadline_soon":
        return "warning";
      case "upcoming":
        return "info";
      default:
        return "default";
    }
  };

  const getPeriodStatusIcon = (status: string) => {
    switch (status) {
      case "overdue":
        return <ErrorIcon color="error" />;
      case "deadline_soon":
        return <PendingIcon color="warning" />;
      case "upcoming":
        return <CheckCircleIcon color="info" />;
      default:
        return <PendingIcon color="inherit" />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        <EmailIcon sx={{ mr: 2, verticalAlign: "middle" }} />
        System Administration - Email Testing
      </Typography>

      {/* Alerts */}
      {alerts.map((alert, index) => (
        <Alert key={index} severity={alert.type} sx={{ mb: 2 }}>
          {alert.message}
        </Alert>
      ))}

      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Top Row - SMTP Test and Queue Management */}
        <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          {/* SMTP Connection Test */}
          <Box sx={{ flex: "1 1 300px", minWidth: "300px" }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  SMTP Connection Test
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Test the connection to the SMTP server
                </Typography>

                <Button
                  variant="contained"
                  onClick={testSmtpConnection}
                  disabled={loading === "smtp"}
                  startIcon={<CheckCircleIcon />}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  {loading === "smtp" ? "Testing..." : "Test SMTP Connection"}
                </Button>

                {smtpTestResult && (
                  <Alert
                    severity={smtpTestResult.success ? "success" : "error"}
                    sx={{ mt: 2 }}
                  >
                    {smtpTestResult.data?.message ||
                      smtpTestResult.message ||
                      "Unknown result"}
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Box>

          {/* Queue Management */}
          <Box sx={{ flex: "1 1 300px", minWidth: "300px" }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Email Queue Management
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  View and manage the email queue
                </Typography>

                <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={getQueueStatus}
                    disabled={loading === "queue"}
                    startIcon={<RefreshIcon />}
                    size="small"
                  >
                    {loading === "queue" ? "Loading..." : "Refresh Status"}
                  </Button>

                  <Button
                    variant="contained"
                    onClick={processQueue}
                    disabled={loading === "process"}
                    startIcon={<SendIcon />}
                    size="small"
                  >
                    {loading === "process" ? "Processing..." : "Process Queue"}
                  </Button>
                </Box>

                {queueStatus && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Queue Statistics:
                    </Typography>
                    <Box
                      sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}
                    >
                      {queueStatus.queueStats.map((stat) => (
                        <Chip
                          key={stat.status}
                          label={`${stat.status}: ${stat._count.status}`}
                          color={
                            getStatusColor(stat.status) as
                              | "success"
                              | "error"
                              | "warning"
                              | "info"
                          }
                          size="small"
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Test Email Form */}
        <Box sx={{ width: "100%" }}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Send Test Email</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                  <Box sx={{ flex: "1 1 300px", minWidth: "300px" }}>
                    <TextField
                      fullWidth
                      label="To Email"
                      value={testEmailForm.to}
                      onChange={(e) =>
                        setTestEmailForm((prev) => ({
                          ...prev,
                          to: e.target.value,
                        }))
                      }
                      placeholder="recipient@example.com"
                    />
                  </Box>

                  <Box sx={{ flex: "1 1 300px", minWidth: "300px" }}>
                    <FormControl fullWidth>
                      <InputLabel>Template</InputLabel>
                      <Select
                        value={testEmailForm.templateName}
                        onChange={(e) =>
                          setTestEmailForm((prev) => ({
                            ...prev,
                            templateName: e.target.value,
                          }))
                        }
                      >
                        <MenuItem value="new_invoice">New Invoice</MenuItem>
                        <MenuItem value="payment_reminder">
                          Payment Reminder
                        </MenuItem>
                        <MenuItem value="payment_confirmation">
                          Payment Confirmation
                        </MenuItem>
                        <MenuItem value="meter_reading_reminder">
                          Meter Reading Reminder
                        </MenuItem>
                        <MenuItem value="meter_reading_urgent">
                          Meter Reading Urgent
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Box>

                <Box sx={{ width: "100%" }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Template Data (JSON):
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    minRows={8}
                    maxRows={20}
                    value={JSON.stringify(testEmailForm.testData, null, 2)}
                    onChange={(e) => {
                      try {
                        const data = JSON.parse(e.target.value);
                        setTestEmailForm((prev) => ({
                          ...prev,
                          testData: data,
                        }));
                      } catch {
                        // Invalid JSON, keep typing
                      }
                    }}
                    sx={{
                      "& .MuiInputBase-root": {
                        fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                        fontSize: "0.875rem",
                      },
                    }}
                    placeholder="JSON template data..."
                    helperText="JSON-data som fylls i email-mallen. Rutan expanderar automatiskt när du skriver."
                  />
                </Box>

                <Box sx={{ width: "100%" }}>
                  <Button
                    variant="contained"
                    onClick={sendTestEmail}
                    disabled={loading === "test-email" || !testEmailForm.to}
                    startIcon={<SendIcon />}
                  >
                    {loading === "test-email"
                      ? "Sending..."
                      : "Send Test Email"}
                  </Button>
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>
        </Box>

        {/* Meter Reading Reminders */}
        <Box sx={{ width: "100%" }}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Mätaravläsning Påminnelser</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Skicka påminnelser för mätaravläsningar innan eller efter
                  deadline
                </Typography>

                <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={getBillingPeriods}
                    disabled={loading === "billing-periods"}
                    startIcon={<RefreshIcon />}
                    size="small"
                  >
                    {loading === "billing-periods"
                      ? "Laddar..."
                      : "Ladda Perioder"}
                  </Button>
                </Box>

                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                  <Box sx={{ flex: "1 1 300px", minWidth: "300px" }}>
                    <FormControl fullWidth>
                      <InputLabel>Fakturaperiod (valfri)</InputLabel>
                      <Select
                        value={selectedPeriodId}
                        onChange={(e) => setSelectedPeriodId(e.target.value)}
                      >
                        <MenuItem value="">Alla perioder</MenuItem>
                        {billingPeriods.map((period) => (
                          <MenuItem key={period.id} value={period.id}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              {getPeriodStatusIcon(period.status)}
                              <span>{period.periodName}</span>
                              <Chip
                                label={
                                  period.status === "overdue"
                                    ? `${period.daysToDeadline} dagar sent`
                                    : period.status === "deadline_soon"
                                    ? `${period.daysToDeadline} dagar kvar`
                                    : `${period.daysToDeadline} dagar kvar`
                                }
                                size="small"
                                color={
                                  getPeriodStatusColor(period.status) as
                                    | "default"
                                    | "primary"
                                    | "secondary"
                                    | "error"
                                    | "info"
                                    | "success"
                                    | "warning"
                                }
                              />
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                </Box>

                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                  <Button
                    variant="contained"
                    onClick={() => sendMeterReadingReminders("advance")}
                    disabled={loading === "meter-reminder-advance"}
                    startIcon={<SendIcon />}
                    size="small"
                  >
                    {loading === "meter-reminder-advance"
                      ? "Skickar..."
                      : "Skicka Förhandsvarning"}
                  </Button>

                  <Button
                    variant="contained"
                    color="warning"
                    onClick={() => sendMeterReadingReminders("overdue")}
                    disabled={loading === "meter-reminder-overdue"}
                    startIcon={<SendIcon />}
                    size="small"
                  >
                    {loading === "meter-reminder-overdue"
                      ? "Skickar..."
                      : "Skicka Försenad Påminnelse"}
                  </Button>
                </Box>

                {billingPeriods.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Fakturaperioder Status:
                    </Typography>
                    <Box
                      sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                    >
                      {billingPeriods.slice(0, 5).map((period) => (
                        <Box
                          key={period.id}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            p: 1,
                            bgcolor: "background.paper",
                            borderRadius: 1,
                            border: 1,
                            borderColor: "divider",
                          }}
                        >
                          {getPeriodStatusIcon(period.status)}
                          <Typography variant="body2" sx={{ minWidth: 100 }}>
                            {period.periodName}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ minWidth: 120 }}
                          >
                            Deadline:{" "}
                            {new Date(
                              period.readingDeadline
                            ).toLocaleDateString("sv-SE")}
                          </Typography>
                          <Chip
                            label={
                              period.status === "overdue"
                                ? `${period.daysToDeadline} dagar sen`
                                : `${period.daysToDeadline} dagar kvar`
                            }
                            size="small"
                            color={
                              getPeriodStatusColor(period.status) as
                                | "default"
                                | "primary"
                                | "secondary"
                                | "error"
                                | "info"
                                | "success"
                                | "warning"
                            }
                          />
                          <Typography variant="body2" color="text.secondary">
                            {period.hasReadings
                              ? `${period._count.householdMeterReadings} avläsningar`
                              : "Inga avläsningar"}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>
        </Box>

        {/* Recent Emails Table */}
        {queueStatus?.recentEmails && queueStatus.recentEmails.length > 0 && (
          <Box sx={{ width: "100%" }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Emails
                </Typography>

                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Status</TableCell>
                        <TableCell>To</TableCell>
                        <TableCell>Subject</TableCell>
                        <TableCell>Attempts</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell>Sent</TableCell>
                        <TableCell>Error</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {queueStatus.recentEmails.map((email) => (
                        <TableRow key={email.id}>
                          <TableCell>
                            <Tooltip title={email.status}>
                              {getStatusIcon(email.status)}
                            </Tooltip>
                          </TableCell>
                          <TableCell>{email.to}</TableCell>
                          <TableCell>{email.subject}</TableCell>
                          <TableCell>{email.attempts}</TableCell>
                          <TableCell>
                            {new Date(email.createdAt).toLocaleString("sv-SE")}
                          </TableCell>
                          <TableCell>
                            {email.sentAt
                              ? new Date(email.sentAt).toLocaleString("sv-SE")
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {email.errorMessage && (
                              <Tooltip title={email.errorMessage}>
                                <ErrorIcon color="error" fontSize="small" />
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default SystemAdmin;
