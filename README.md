# Gröngräset Utility Billing System

A modern web application for managing utility billing for Swedish samfällighetsförening (joint facility associations).

## Overview

This system replaces an Excel-based utility billing system with a comprehensive web application that supports:

- 14 households with equal share ratios (andelstal)
- Quarterly mandatory meter readings (every 4th month)
- Optional monthly readings with optional monthly billing
- Multiple utility services (water, electricity, gas, etc.)
- Both variable (consumption-based) and fixed fees
- Meter reconciliation between main meters and household meters
- Flexible billing periods
- Shared costs and member fees
- Payment tracking

## Technology Stack

### Backend
- **Node.js** with **Express.js** - REST API server
- **Prisma** - Database ORM and migration tool
- **PostgreSQL** - Primary database
- **TypeScript** - Type-safe development
- **Zod** - Runtime type validation
- **JWT** - Authentication (to be implemented)

### Frontend
- **React** with **TypeScript** - User interface
- **Vite** - Build tool and development server
- **Material-UI (MUI)** - Component library
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Date-fns** - Date manipulation
- **Recharts** - Charts and visualizations

## Project Structure

```
greengrass/
├── backend/                 # Node.js/Express API server
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   └── seed.ts         # Initial data seeding
│   ├── src/
│   │   ├── index.ts        # Main server file
│   │   ├── lib/
│   │   │   └── prisma.ts   # Prisma client setup
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # API route handlers
│   │   └── prisma/         # Database utilities
│   └── package.json
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable React components
│   │   ├── pages/          # Page components
│   │   ├── App.tsx         # Main application component
│   │   └── main.tsx        # Application entry point
│   └── package.json
├── ANALYSIS_AND_INSTRUCTIONS.md  # Detailed system analysis
├── start-dev.sh           # Development environment startup script
└── test-backend.sh        # Backend API testing script
```

## Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **PostgreSQL** (v12 or higher)
- **npm** or **yarn**

### Database Setup

1. Create a PostgreSQL database named `greengrass`
2. Create a user with appropriate permissions
3. Update the `DATABASE_URL` in `backend/.env`

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

- ✅ **Database Schema**: Complete PostgreSQL schema with all entities
- ✅ **API Routes**: Full CRUD operations for all major entities
- ✅ **Authentication Skeleton**: JWT-ready authentication structure
- ✅ **Frontend Layout**: Responsive Material-UI layout with navigation
- ✅ **Dashboard**: Overview with statistics and recent activities
- ✅ **Billing Logic**: Quarter and monthly bill generation
- ✅ **Meter Reading Management**: Support for both main and household meters
- ✅ **Reconciliation**: Utility consumption reconciliation between meters
- ✅ **Reports**: Various reporting endpoints

### Planned Features

- 🔲 **Full Frontend Implementation**: Complete all page components
- 🔲 **Authentication**: JWT-based login system
- 🔲 **Data Import**: Excel file import for migration
- 🔲 **Export Features**: PDF bills, CSV reports
- 🔲 **Email Notifications**: Automated billing notifications
- 🔲 **User Roles**: Admin, household member, read-only access
- 🔲 **Audit Trail**: Track all changes and actions
- 🔲 **Backup/Restore**: Database backup and restore functionality

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
- `GET /api/billing/quarterly` - List quarterly bills
- `GET /api/billing/monthly` - List monthly bills
- `POST /api/billing/generate` - Generate bills for period
- `GET /api/billing/reconciliation/:serviceId/:periodId` - Reconciliation data

### Reports
- `GET /api/reports/dashboard` - Dashboard overview data
- `GET /api/reports/consumption/:serviceId` - Consumption report
- `GET /api/reports/billing/:periodId` - Billing period report
- `GET /api/reports/payments` - Payments report

## Database Schema

The system uses a comprehensive PostgreSQL schema with the following main entities:

- **Households**: Information about each household (14 total)
- **UtilityServices**: Water, electricity, gas, etc.
- **MainMeters**: Meters for the entire facility
- **HouseholdMeters**: Individual household meters
- **BillingPeriods**: Quarter/monthly billing periods
- **MeterReadings**: Actual consumption readings
- **QuarterlyBills**: Complete quarterly bills with shared costs
- **MonthlyBills**: Utility-only monthly bills
- **Payments**: Payment tracking
- **SharedCosts**: Common expenses distributed among households
- **UtilityPricing**: Historical pricing for each service

## Development

### Testing Backend API
```bash
./test-backend.sh
```

### Database Commands
```bash
# View database in browser
npx prisma studio

# Reset database
npx prisma db push --force-reset

# Generate new migration
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
