# Gröngräset Utility Billing System

A modern web application for managing utility billing for Swedish samfällighetsförening (joint facility associations).

## Overview

This system replaces an Excel-based utility billing system with a comprehensive web application that supports:

- **Dynamic household management** - Any number of households with equal shares by default (andelstal removed)
- **Tertiary billing system** - streamlined to focus on 3 billing periods per year (every 4 months)
- **Volume-based utility billing** - all costs calculated based on consumption (m³)
- **Multiple utility services** - water, electricity, heating, internet, membership fees
- **Reconciliation system** - main meters vs household meters with adjustments as separate line items
- **Role-based access** - ADMIN (full access) vs MEMBER (own household only)
- **Professional invoice generation** - PDF invoices with detailed cost breakdowns
- **Payment tracking** - mark bills as paid with full audit trail
- **Swedish localization** - proper currency formatting and Swedish terminology

## Technology Stack

### Backend

- **Node.js** with **Express.js** - REST API server
- **Prisma** - Database ORM and migration tool
- **PostgreSQL** - Primary database
- **TypeScript** - Type-safe development
- **Zod** - Runtime type validation
- **JWT** - Authentication with refresh tokens
- **Puppeteer** - PDF generation for invoices

### Frontend

- **React** with **TypeScript** - User interface
- **Vite** - Build tool and development server
- **Material-UI (MUI)** - Component library
- **React Router** - Client-side routing
- **Date-fns** - Date manipulation with Swedish localization
- **Role-based routing** - Different interfaces for ADMIN vs MEMBER users

## Project Structure

```
greengrass/
├── backend/                 # Node.js/Express API server
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema (tertiary periods only)
│   │   └── seed.ts         # Initial data seeding
│   ├── scripts/            # Utility scripts
│   │   ├── import-excel-complete.ts  # Excel data import
│   │   └── reset-data.ts   # Database reset utility
│   ├── src/
│   │   ├── index.ts        # Main server file
│   │   ├── lib/
│   │   │   ├── prisma.ts   # Prisma client setup
│   │   │   ├── jwt.ts      # JWT authentication
│   │   │   └── pdfGenerator.ts  # PDF invoice generation
│   │   ├── middleware/     # Express middleware (auth, error handling)
│   │   ├── routes/         # API route handlers
│   │   └── prisma/         # Database utilities
│   └── package.json
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable React components
│   │   │   ├── Layout.tsx  # Main layout with navigation
│   │   │   ├── ProtectedRoute.tsx  # Role-based routing
│   │   │   └── BillPreview.tsx     # Invoice preview dialog
│   │   ├── pages/          # Page components (Dashboard, Billing, etc.)
│   │   ├── theme/          # Material-UI theming
│   │   ├── App.tsx         # Main application component
│   │   └── main.tsx        # Application entry point
│   └── package.json
├── ANALYSIS_AND_INSTRUCTIONS.md  # Detailed system analysis
├── docker-compose.yml     # PostgreSQL container setup
├── start-dev.sh          # Development environment startup script
└── test-backend.sh       # Backend API testing script
```

## Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **PostgreSQL** (v12 or higher)
- **npm** or **yarn**

### Database Setup

1. **Start PostgreSQL with Docker:**

   ```bash
   docker compose up -d
   ```

2. **Alternative: Local PostgreSQL setup**
   - Create a PostgreSQL database named `greengrass`
   - Create a user with appropriate permissions
   - Update the `DATABASE_URL` in `backend/.env`

Example connection string:

```
DATABASE_URL="postgresql://username:password@localhost:5432/greengrass"
```

### Quick Start

1. **Clone and setup:**

   ```bash
   # Make sure you're in the project root directory
   cd greengrass
   ```

2. **Start development environment:**

   ```bash
   ./start-dev.sh
   ```

   This script will:

   - Install dependencies for both backend and frontend
   - Set up the database schema
   - Seed initial data
   - Start both development servers

3. **Access the application:**

   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000

4. **Login credentials:**
   - **Admin:** admin@grongraset.se / admin123 (full access)
   - **Member:** member@grongraset.se / member123 (own household only)

### Manual Setup

If you prefer to set up manually:

#### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database connection
npx prisma generate
npx prisma db push
npx prisma db seed
npm run dev
```

#### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## Features

### Current Implementation

- ✅ **Database Schema**: Complete PostgreSQL schema focused on tertiary periods (3x/year)
- ✅ **Authentication System**: JWT-based auth with ADMIN/MEMBER roles
- ✅ **API Routes**: Full CRUD operations for all major entities
- ✅ **Frontend Application**: Complete React/TypeScript app with Material-UI
- ✅ **Role-based Access**: Different interfaces for admins vs members
- ✅ **Household Management**: Dynamic household count (equal shares by default)
- ✅ **Utility Services**: Water, electricity, membership fees, etc.
- ✅ **Meter Management**: Both main meters and household meters
- ✅ **Meter Readings**: Role-based reading management with consumption calculations
- ✅ **Invoice Generation**: Complete invoices with volume-based calculations
- ✅ **Reconciliation System**: Main vs household meter reconciliation as separate line items
- ✅ **PDF Invoice Generation**: Professional invoices with detailed cost breakdowns
- ✅ **Payment Tracking**: Mark bills as paid with audit trail
- ✅ **Historical Data Import**: Excel import with UTC date handling
- ✅ **Swedish Localization**: Currency formatting and Swedish terminology

### Planned Features

- 🔲 **Email Notifications**: Automated billing and reminder notifications
- 🔲 **Advanced Reporting**: Consumption trends and cost analysis dashboards
- 🔲 **Data Export**: Enhanced CSV and Excel export functionality
- 🔲 **Mobile Optimization**: Progressive Web App features
- 🔲 **Advanced User Management**: Multiple admin levels and permissions
- 🔲 **Audit Trail**: Enhanced logging and change tracking
- 🔲 **Integration APIs**: Banking integration for payment automation

## API Endpoints

### Households

- `GET /api/households` - List all households
- `GET /api/households/:id` - Get household details
- `POST /api/households` - Create new household
- `PUT /api/households/:id` - Update household
- `DELETE /api/households/:id` - Deactivate household

### Utility Services

- `GET /api/utility-services` - List all services
- `GET /api/utility-services/:id` - Get service details
- `POST /api/utility-services` - Create new service
- `PUT /api/utility-services/:id` - Update service

### Meter Readings

- `GET /api/meter-readings` - List readings with filters
- `POST /api/meter-readings` - Create new reading
- `PUT /api/meter-readings/:id` - Update reading
- `DELETE /api/meter-readings/:id` - Delete reading
- `POST /api/meter-readings/bulk` - Bulk create readings

### Billing

- `GET /api/billing/periods` - List billing periods
- `POST /api/billing/periods` - Create billing period
- `GET /api/billing/quarterly` - List quarterly bills with filters (legacy alias; use tertiary periods/invoices endpoints)
- `POST /api/billing/generate` - Generate bills for period
- `GET /api/billing/quarterly/:id` - Get specific bill details (legacy alias; use invoices endpoint)
- `GET /api/billing/quarterly/:id/pdf` - Download bill as PDF (legacy alias; use invoices PDF endpoint)
- `PATCH /api/billing/quarterly/:id/mark-paid` - Mark bill as paid (legacy alias; use invoices mark-paid)
- `POST /api/billing/generate-pdfs` - Bulk generate PDF files
- `GET /api/billing/check-readiness/:periodId` - Check if period is ready for billing

### Reports

- `GET /api/reports/dashboard` - Dashboard overview data
- `GET /api/reports/consumption/:serviceId` - Consumption report
- `GET /api/reports/billing/:periodId` - Billing period report
- `GET /api/reports/payments` - Payments report
- `GET /api/reports/analytics/household-comparison` - Yearly household comparison
- `GET /api/reports/analytics/consumption-trends` - Consumption trends per period
- `GET /api/reports/analytics/cost-analysis` - Cost analysis and breakdown

## Database Schema

The system uses a comprehensive PostgreSQL schema with the following main entities:

- **Households**: Information about each household (dynamic, equal shares by default)
- **Users**: Authentication and role management (ADMIN/MEMBER)
- **UtilityServices**: Water, electricity, membership fees, etc.
- **MainMeters**: Meters for the entire facility
- **HouseholdMeters**: Individual household meters
- **BillingPeriods**: Tertiary billing periods (3x/year, every 4 months)
- **MeterReadings**: Actual consumption readings (household and main)
- **UtilityPricing**: Historical pricing for each service
- **UtilityBilling**: Detailed billing calculations per household per service
- **UtilityReconciliation**: Reconciliation between main and household meters
- **Invoices**: Complete invoices with all costs
- **Payments**: Payment tracking and audit trail

## Development

### VS Code Tasks

The project includes VS Code tasks for common operations:

```bash
# Use Ctrl+Shift+P → "Tasks: Run Task" and select:
- docker-up          # Start PostgreSQL container
- dev-backend        # Start backend development server
- dev-frontend       # Start frontend development server
- prisma-generate    # Generate Prisma client
- prisma-migrate     # Run database migrations
- test-backend       # Run backend tests
```

### Testing Backend API

```bash
./test-backend.sh    # Test all API endpoints with sample data
```

### Database Commands

```bash
# View database in browser
npx prisma studio

# Reset database
npx prisma db push --force-reset

# Generate Prisma client after schema changes
npx prisma generate

# Push schema changes to database
npx prisma db push
```

### Frontend Development

```bash
cd frontend
npm run dev     # Start development server
npm run build   # Build for production
npm run preview # Preview production build
```

## Contributing

This project is specifically designed for Samfällighetsförening Gröngräset but can be adapted for other similar organizations.

### Code Style

- TypeScript for type safety
- ESLint for code quality
- Prettier for code formatting
- Conventional commits

### Adding Features

1. Update database schema in `prisma/schema.prisma`
2. Create/update API endpoints in `backend/src/routes/`
3. Add frontend components in `frontend/src/`
4. Update this README with new features

## License

Private project for Samfällighetsförening Gröngräset.

## Support

For technical support or questions about the system, please contact the development team.
