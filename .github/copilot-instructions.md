# Gröngräset Utility Billing System - AI Coding Agent Instructions

## Project Overview

Swedish samfällighetsförening (joint facility association) utility billing system. Replaces Excel-based billing with a modern React/TypeScript web app supporting a dynamic number of households with equal shares, tertiary (3x/year) billing, and role-based access.

## Architecture & Technology Stack

### Backend: Node.js/Express/TypeScript/Prisma/PostgreSQL

- **Entry point**: `backend/src/index.ts` - Express server with security middleware (helmet, CORS, rate limiting)
- **Database**: PostgreSQL with Prisma ORM (`backend/prisma/schema.prisma`)
- **Authentication**: JWT with refresh tokens via `JWTService` class in `backend/src/lib/jwt.ts`
- **Email System**: nodemailer + SMTP queue system with automated notifications
- **Role-based access**: `ADMIN` (full access) vs `MEMBER` (own household only)

### Frontend: React 18/TypeScript/Vite/Material-UI

- **Entry point**: `frontend/src/main.tsx` → `App.tsx`
- **Routing**: React Router with `ProtectedRoute` component for role-based access
- **Theme**: Custom Material-UI theming with dark/light mode in `frontend/src/theme/`
- **State**: React Context for auth, no external state management
- **Admin Tools**: SystemAdmin page for email testing and system management

## Critical Development Patterns

### Authentication & Authorization

```typescript
// All protected routes use authenticate middleware
app.use("/api/users", authenticate, userRoutes);

// Role checks in routes
if (req.user?.role !== "ADMIN") {
  return res
    .status(403)
    .json({ success: false, message: "Access denied. Admin role required." });
}

// Member data filtering
if (req.user?.role === "MEMBER" && req.user?.householdId) {
  householdFilter = req.user.householdId; // Restrict to own household
}
```

### API Response Pattern

```typescript
// Consistent success/error structure
res.json({ success: true, data: result });
res
  .status(400)
  .json({ success: false, message: "Error description", errors: details });
```

### Validation with Zod

```typescript
const schema = z.object({
  email: z.string().email(),
  householdId: z.string().uuid().optional(),
});
const validatedData = schema.parse(req.body); // Throws ZodError on failure
```

### Email Notification Patterns

```typescript
// Send automatic notifications on business events
await notificationService.sendNewInvoiceNotifications(billingPeriodId);

// Manual email testing (admin only)
await emailService.sendTemplateEmail(
  "new_invoice",
  "user@example.com",
  templateData
);

// Queue email for later sending
await emailService.queueEmail({
  to: household.email,
  subject: "Test",
  htmlContent: "<p>Hello</p>",
  scheduledFor: new Date(Date.now() + 3600000), // 1 hour later
});
```

## Key Business Logic

### Household Model (Equal Shares)

- Each active household gets an equal share (andelstal removed - equal distribution)
- Households identified by `householdNumber`, not by ownership percentages

### Billing System Architecture

- **Invoices per Tertiary Periods**: Official billing periods every 4 months with member fees + utilities + shared costs
- **Service Types**: `WATER|ELECTRICITY|HEATING|INTERNET|MEMBERSHIP|OTHER`
- **Reconciliation**: Main meters vs household meters for services like water
- **Volume-based Billing**: All utility costs based on volume (m³) with reconciliation adjustments as separate line items
- **Email Notifications**: Automatic emails for new invoices, payment reminders, and confirmations

### Email Business Logic

- **New Invoice Notifications**: Sent automatically when bills are generated
- **Payment Reminders**: Daily cron job checks for overdue invoices
- **Payment Confirmations**: Sent when invoice status changes to "paid"
- **Template System**: HTML/text templates with Swedish localization
- **Queue Processing**: Emails processed every 5 minutes with retry logic

### Database Relationships

```
Household 1:N HouseholdMeter M:1 UtilityService
Household 1:N MeterReading (via HouseholdMeter)
BillingPeriod 1:N Invoice M:1 Household
UtilityService 1:N UtilityPricing (historical pricing)
Household 1:1 NotificationSettings (email preferences)
EmailQueue M:1 EmailTemplate (template-based emails)
```

## Development Workflows

### Environment Configuration

```bash
# Required .env variables for backend
DATABASE_URL="postgresql://user:password@localhost:5432/greengrass"
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"
SMTP_HOST="mailout.privat.bahnhof.se"
SMTP_PORT="587"
SMTP_USER="your-smtp-user"
SMTP_PASS="your-smtp-password"
SMTP_FROM="noreply@grongraset.se"
FRONTEND_URL="http://localhost:5174"
```

### Database Operations

```bash
# Start PostgreSQL container
docker compose up -d

# Backend setup from root
cd backend && npm install && npx prisma generate && npx prisma db push

# Complete database reset and Excel import
cd backend && npx tsx scripts/import-excel-complete.ts
# WARNING: This clears ALL data and reimports from Gröngräset.xlsx
```

### Development Servers

```bash
# Use existing VS Code tasks (preferred)
# Tasks: dev-backend, dev-frontend, docker-up, prisma-migrate

# Or start manually
./start-dev.sh  # Automated setup script
# Backend: localhost:3001, Frontend: localhost:5174
```

### Testing

```bash
./test-backend.sh  # API endpoint testing with curl/jq
./test-email.sh    # Email system testing with SMTP verification
npm test          # Backend unit tests (from backend/)
```

### Email System Testing

```bash
# CLI-based email testing
./test-email.sh

# GUI-based testing (admin only)
# Navigate to http://localhost:5174/system-admin
# Test SMTP connection, send test emails, view queue status
```

### Terminal Usage for AI Agents

```bash
# For clean output parsing (no colors, minimal prompt):
PS1="$ " bash --rcfile /dev/null -c "command_here"

# User's normal terminal uses default "bash" profile
# AI-friendly "copilot-terminal" profile available but use explicit commands for reliability
```

## Project-Specific Conventions

### File Organization

- **Backend routes**: One file per entity in `backend/src/routes/` (households.ts, auth.ts, etc.)
- **Frontend pages**: One component per route in `frontend/src/pages/`
- **Database scripts**: Utility scripts in `backend/scripts/` (import-excel-complete.ts, etc.)

### Role-Based UI Components

```typescript
// ProtectedRoute with role restrictions
<ProtectedRoute requiredRole="ADMIN">
  <AdminOnlyComponent />
</ProtectedRoute>;

// Conditional rendering by role
{
  user?.role === "ADMIN" && <AdminFeatures />;
}
{
  user?.role === "MEMBER" && <SimplifiedMemberView />;
}
```

### Swedish Localization

- Currency formatting: Use Swedish locale (SEK with proper formatting)
- Date handling: `sv` locale from date-fns in Material-UI DatePicker
- Text: Swedish terms like "andelstal", "mätaravläsning", "faktura"

### Error Handling Pattern

```typescript
// Comprehensive error handling in errorHandler middleware
// Prisma errors (P2002 = conflict, P2025 = not found)
// Zod validation errors → 400 with field details
// JWT errors → 401 with clear messages
```

## Integration Points

### Prisma Client Usage

```typescript
import { prisma } from "../lib/prisma";
// Use transactions for complex operations
// Include relations with proper select/include patterns
```

### Material-UI Patterns

- Use `DataGrid` for tables, `Card` for metrics, `Dialog` for modals
- Consistent theme usage via `ThemeContextProvider`
- Responsive design with Material-UI breakpoints

### Authentication Flow

1. Login → JWT tokens stored in localStorage
2. `authenticate` middleware validates Bearer tokens
3. Role-based route filtering in both frontend and backend
4. Automatic token refresh using refresh tokens

## Common Development Scenarios

### Adding New Email Templates

```typescript
// 1. Add template to emailTemplates.ts
export const emailTemplates = {
  newTemplate: {
    name: "new_template",
    subject: "Subject with {{variable}}",
    htmlContent: `<h1>Hello {{ownerName}}</h1>`,
    variables: ["ownerName", "customData"],
  },
};

// 2. Use in notification service
await emailService.sendTemplateEmail("new_template", household.email, {
  ownerName: "Test",
  customData: "Value",
});
```

### Creating Role-Protected Routes

```typescript
// Backend route protection
router.get("/admin-only", async (req, res) => {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ success: false, message: "Admin required" });
  }
  // Admin logic here
});

// Frontend route protection
<ProtectedRoute requiredRole="ADMIN">
  <AdminOnlyPage />
</ProtectedRoute>;
```

### Adding New Utility Services

```typescript
// 1. Database: Add service via API or script
const service = await prisma.utilityService.create({
  data: {
    name: "New Service",
    serviceType: "OTHER",
    unit: "kWh",
    requiresReadings: true,
  },
});

// 2. Frontend: Service appears automatically in dropdowns
// 3. Billing: Included automatically in calculations
```

### Database Reset and Excel Import

```bash
# Complete database reset with Excel import
cd backend && npx tsx scripts/import-excel-complete.ts

# This script will:
# 1. 🧹 Reset existing data (except users)
# 2. 💧 Setup utility services and pricing
# 3. 📥 Import households and readings from Gröngräset.xlsx
# 4. 📊 Import main meter readings
# 5. ⚖️ Calculate reconciliation for all periods
# 6. 💰 Generate bills for all periods
# 7. 📋 Create quarterly bills with proper dates

# WARNING: This deletes ALL billing data and starts fresh
```

## Troubleshooting

### Common Issues

**Email not sending:**

1. Check SMTP connection: `curl localhost:3001/api/notifications/test`
2. Verify .env SMTP configuration
3. Check email queue status in SystemAdmin

**Database connection issues:**

```bash
# Restart PostgreSQL container
docker compose down && docker compose up -d

# Regenerate Prisma client
cd backend && npx prisma generate
```

**Need fresh data from Excel:**

```bash
# Complete database reset and import
cd backend && npx tsx scripts/import-excel-complete.ts
# This will clear ALL data and reimport from Gröngräset.xlsx

# Check import status
cd backend && npx tsx scripts/check-services.ts
```

**Authentication problems:**

```bash
# Clear browser localStorage
localStorage.clear()

# Check JWT secret in .env
# Verify user exists in database
```

**Frontend build errors:**

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npm run type-check
```

## Current Development Status

- ✅ Complete backend API with role-based access
- ✅ Full tertiary billing system (monthly billing removed for simplicity)
- ✅ Member vs Admin UI differences implemented
- ✅ Historical data import from Excel completed
- ✅ PDF invoice generation with polished output and Swedish localization
- ✅ Mark bills as paid functionality
- ✅ Email notifications system (komplett implementerat August 30, 2025)
- ✅ Email template system with Swedish localization and improved formatting
- ✅ Payment confirmation emails and automated payment reminders
- ✅ Default notification settings in import script
- ✅ Security audit completed (tsx updated, xlsx vulnerability documented)
- 🔲 Advanced reporting dashboard

## Recent Development Session (Latest Updates)

### Email System Enhancements (August 30, 2025)

- **Email Templates**: Enhanced with 5 complete templates including welcome_email and system_notification
- **Swedish Localization**: Improved language consistency across all email templates
- **PDF Generation**: Enhanced date/currency formatting with proper sv-SE locale
- **Payment Confirmations**: Fixed missing payment confirmation emails by ensuring notification settings
- **Import Script**: Added automatic creation of default notification settings for all households
- **Security**: Updated tsx to v4.20.5 (fixed esbuild vulnerability), documented xlsx security issue

### Email Template Improvements

- Better variable consistency (`billingPeriod` instead of mixed naming)
- Professional Swedish formatting and terminology
- Enhanced HTML structure for better email client compatibility
- Complete template coverage for all notification types

### Database Schema Updates

- **NotificationSettings**: Proper defaults created during household import
- **EmailQueue**: Enhanced cleanup during data reset operations
- **Invoice Management**: Improved payment status tracking and confirmation flow

### Development Process Improvements

- **Security Audit**: Automated vulnerability scanning and resolution workflow
- **Documentation**: Comprehensive updates to reflect all system enhancements
- **Testing**: Enhanced email system testing with household-specific scenarios

## Key Files for Understanding

### Core Architecture

- `ANALYSIS_AND_INSTRUCTIONS.md` - Detailed project analysis and roadmap
- `backend/prisma/schema.prisma` - Complete database schema
- `backend/src/index.ts` - Main server entry point with middleware setup

### Authentication & Authorization

- `backend/src/routes/auth.ts` - Authentication patterns
- `backend/src/middleware/auth.ts` - JWT middleware
- `backend/src/routes/meterReadings.ts` - Role-based data filtering example
- `frontend/src/pages/MeterReadings.tsx` - Role-based UI patterns

### Email Notification System

- `backend/src/routes/notifications.ts` - Email notification API endpoints
- `backend/src/lib/emailService.ts` - Email service with queue and templates
- `backend/src/lib/notificationService.ts` - Business logic for notifications
- `backend/src/lib/schedulerService.ts` - Automated email scheduling
- `backend/src/lib/emailTemplates.ts` - Email template definitions
- `frontend/src/pages/SystemAdmin.tsx` - Email testing GUI interface
- `test-email.sh` - CLI script for email system testing
- `SYSTEM_ADMIN_GUIDE.md` - Complete guide for email administration

### Development & Documentation

- `backend/DEVELOPMENT_IMPROVEMENTS.md` - Backend development setup and improvements
- `backend/scripts/import-excel-complete.ts` - Complete database reset and Excel import script
- `.github/copilot-instructions.md` - This file - AI agent instructions

## Documentation Maintenance Requirements

### 📝 CRITICAL: Always Update Documentation Before Commits

**MANDATORY WORKFLOW**: Before making any commit, ensure documentation reflects all changes:

1. **Update Progress Status**: Mark new features as completed in relevant documentation
2. **Sync Implementation Details**: Update code examples, API endpoints, and database schemas
3. **Maintain Consistency**: Ensure terminology is consistent across all `.md` files
4. **Update File References**: Add new important files to key documentation sections

### Documentation Files That Must Stay Current

#### Primary Documentation (Update for ALL changes)

- `ANALYSIS_AND_INSTRUCTIONS.md` - Main project documentation and roadmap
- `.github/copilot-instructions.md` - AI agent development instructions
- `README.md` - Project overview and quick start guide

#### Feature-Specific Documentation (Update when relevant)

- `SYSTEM_ADMIN_GUIDE.md` - Email system and administration
- `backend/DEVELOPMENT_IMPROVEMENTS.md` - Backend development workflows
- Any feature-specific guides in project root

### When to Update Documentation

**Always update before commit when you:**

- ✅ Add new features or endpoints
- ✅ Change database schema or business logic
- ✅ Modify authentication/authorization patterns
- ✅ Add or change email templates/notifications
- ✅ Update environment variables or configuration
- ✅ Change development workflows or scripts
- ✅ Fix bugs that affect documented behavior
- ✅ Add new dependencies or tools

### Documentation Update Checklist

Before each commit, verify:

- [ ] Progress section updated with completion status
- [ ] New code patterns added to development guides
- [ ] API endpoints documented if changed
- [ ] Environment variables documented if added
- [ ] Troubleshooting section updated if relevant
- [ ] File structure references current if changed
- [ ] Examples reflect actual implementation

**Remember**: Documentation is code. Keep it as current as your implementation.
