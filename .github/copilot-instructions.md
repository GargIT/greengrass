# Gröngräset Utility Billing System - AI Coding Agent Instructions

## Project Overview

Swedish samfällighetsförening (joint facility association) utility billing system. Replaces Excel-based billing with a modern React/TypeScript web app supporting a dynamic number of households with equal shares, tertiary (3x/year) billing, and role-based access.

## Architecture & Technology Stack

### Backend: Node.js/Express/TypeScript/Prisma/PostgreSQL

- **Entry point**: `backend/src/index.ts` - Express server with security middleware (helmet, CORS, rate limiting)
- **Database**: PostgreSQL with Prisma ORM (`backend/prisma/schema.prisma`)
- **Authentication**: JWT with refresh tokens via `JWTService` class in `backend/src/lib/jwt.ts`
- **Role-based access**: `ADMIN` (full access) vs `MEMBER` (own household only)

### Frontend: React 18/TypeScript/Vite/Material-UI

- **Entry point**: `frontend/src/main.tsx` → `App.tsx`
- **Routing**: React Router with `ProtectedRoute` component for role-based access
- **Theme**: Custom Material-UI theming with dark/light mode in `frontend/src/theme/`
- **State**: React Context for auth, no external state management

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

## Key Business Logic

### Household Model (Equal Shares)

- Each active household gets an equal share (andelstal removed - equal distribution)
- Households identified by `householdNumber`, not by ownership percentages

### Billing System Architecture

- **Invoices per Tertiary Periods**: Official billing periods every 4 months with member fees + utilities + shared costs
- **Service Types**: `WATER|ELECTRICITY|HEATING|INTERNET|MEMBERSHIP|OTHER`
- **Reconciliation**: Main meters vs household meters for services like water
- **Volume-based Billing**: All utility costs based on volume (m³) with reconciliation adjustments as separate line items

### Database Relationships

```
Household 1:N HouseholdMeter M:1 UtilityService
Household 1:N MeterReading (via HouseholdMeter)
BillingPeriod 1:N Invoice M:1 Household
UtilityService 1:N UtilityPricing (historical pricing)
```

## Development Workflows

### Database Operations

```bash
# Start PostgreSQL container
docker compose up -d

# Backend setup from root
cd backend && npm install && npx prisma generate && npx prisma db push
```

### Development Servers

```bash
# Use existing VS Code tasks (preferred)
# Tasks: dev-backend, dev-frontend, docker-up, prisma-migrate

# Or start manually
./start-dev.sh  # Automated setup script
# Backend: localhost:3000, Frontend: localhost:5173
```

### Testing

```bash
./test-backend.sh  # API endpoint testing with curl/jq
npm test          # Backend unit tests (from backend/)
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

## Current Development Status

- ✅ Complete backend API with role-based access
- ✅ Full tertiary billing system (monthly billing removed for simplicity)
- ✅ Member vs Admin UI differences implemented
- ✅ Historical data import from Excel completed
- ✅ PDF invoice generation with polished output
- ✅ Mark bills as paid functionality
- 🔲 Email notifications system
- 🔲 Advanced reporting dashboard

## Key Files for Understanding

- `ANALYSIS_AND_INSTRUCTIONS.md` - Detailed project analysis and roadmap
- `backend/prisma/schema.prisma` - Complete database schema
- `backend/src/routes/auth.ts` - Authentication patterns
- `backend/src/routes/meterReadings.ts` - Role-based data filtering example
- `frontend/src/pages/MeterReadings.tsx` - Role-based UI patterns
