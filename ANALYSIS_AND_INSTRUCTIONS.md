# Gröngräset - Samfällighetsförening Utility Billing System

**File:** Gröngräset.xlsx  
**Context:** Swedish Joint Facility Association (Samfällighetsförening) - Multi-Utility Billing Platform  
**Purpose:** Modern React/TypeScript web application for utility billing, member management, and financial tracking

---

## 🚀 QUICK START GUIDE

### For New Developers

1. **Clone project** and navigate to workspace directory
2. **Start database**: `docker compose up -d`
3. **Setup backend**: `cd backend && npm install && npx prisma generate && npm run dev`
4. **Setup frontend**: `cd frontend && npm install && npm run dev`
5. **Login**: http://localhost:5174 with `admin@grongraset.se` / `admin123`

### For Testing Today's Features

- **ADMIN Login**: Full access to all households and utilities
- **MEMBER Login**: `member@grongraset.se` / `member123` - simplified meter reading view
- **Key Features**: Utility services, household management, meter readings with role restrictions

---

## Project Status (August 5, 2025)

### ✅ COMPLETED FEATURES

#### Backend Infrastructure

- ✅ **PostgreSQL Database**: Full schema implemented with Prisma ORM
- ✅ **Node.js/Express API**: RESTful endpoints with TypeScript
- ✅ **Authentication System**: JWT-based auth with role management (ADMIN/MEMBER)
- ✅ **User Management**: Full CRUD operations for users and household linking
- ✅ **Data Validation**: Zod schema validation throughout
- ✅ **Security**: Helmet, CORS, rate limiting, password hashing

#### Core Data Management

- ✅ **Household Management**: 14 households with equal shares (andelstal removed)
- ✅ **Utility Services**: Configurable services (Water, Electricity, Gas, etc.)
- ✅ **Meter Management**: Both household meters and main meters
- ✅ **Meter Readings**: Full CRUD with consumption calculations
- ✅ **Billing Periods**: Quarterly and monthly period support
- ✅ **Role-based Data Access**: Members only see their own data

#### Complete Billing System ✅ NEW

- ✅ **Utility Billing Engine**: Water consumption + membership fees
- ✅ **Historical Data Import**: Complete Excel import with pricing history
- ✅ **Reconciliation System**: Main vs household meter reconciliation
- ✅ **Quarterly Bill Generation**: All historical bills with proper breakdown
- ✅ **Service Type Management**: MEMBERSHIP as dedicated service type
- ✅ **Pricing Management**: Historical pricing extracted from Excel

#### Frontend Application

- ✅ **React/TypeScript/Vite**: Modern frontend stack
- ✅ **Material-UI**: Professional UI components and theming
- ✅ **Authentication Flow**: Login/logout with role-based routing
- ✅ **Dashboard**: Overview with key metrics
- ✅ **Utility Services Management**: Full CRUD for services (ADMIN)
- ✅ **Household Management**: CRUD operations for households (ADMIN)
- ✅ **Household-Service Connections**: Link services to households
- ✅ **Meter Readings Management**:
  - **ADMIN**: Full access to all households and main meters
  - **MEMBER**: Simplified view - only their own household meters
- ✅ **User Management**: Admin interface for user/household linking
- ✅ **Billing Interface**: Complete billing dashboard with detailed invoice preview ✅ NEW

#### User Experience

- ✅ **Role-based UI**: Different interfaces for ADMIN vs MEMBER users
- ✅ **Simplified Member Experience**: Members see "Mina mätaravläsningar"
- ✅ **Responsive Design**: Works on desktop and mobile
- ✅ **Error Handling**: Comprehensive error handling and user feedback
- ✅ **Professional Billing GUI**: Invoice preview with service breakdown ✅ NEW
- ✅ **Swedish Localization**: Proper currency and date formatting ✅ NEW

### 🏗️ CURRENT ARCHITECTURE

#### Technology Stack

- **Frontend**: React 18 + TypeScript + Vite + Material-UI
- **Backend**: Node.js + Express + TypeScript + Prisma
- **Database**: PostgreSQL (containerized)
- **Authentication**: JWT with refresh tokens
- **Development**: VS Code workspace with tasks and debugging

#### Database Schema (PostgreSQL)

- **Users**: Authentication and role management
- **Households**: 14 households with owner information
- **UtilityServices**: Configurable services (Water, Electricity, etc.)
- **HouseholdMeters**: Individual meters per household per service
- **MainMeters**: Main meters for reconciliation
- **MeterReadings**: Both household and main meter readings
- **BillingPeriods**: Quarterly and monthly billing cycles

#### API Endpoints

- ✅ `/api/auth/*` - Authentication (login/logout)
- ✅ `/api/users/*` - User management (ADMIN only)
- ✅ `/api/households/*` - Household management
- ✅ `/api/utility-services/*` - Service configuration
- ✅ `/api/household-meters/*` - Household meter management
- ✅ `/api/main-meters/*` - Main meter management
- ✅ `/api/meter-readings/*` - Reading management with role restrictions
- ✅ `/api/billing/*` - Billing periods and quarterly bill details

#### 🏗️ CURRENT ARCHITECTURE UPDATES

**Latest Backend Additions:**

- Complete utility billing system with water and membership services
- Historical data import with pricing extraction
- Reconciliation algorithms for main vs household meters
- Quarterly bill generation with detailed breakdown
- Enhanced billing API with detailed invoice endpoints

**Latest Frontend Additions:**

- Professional billing dashboard with filtering
- Detailed bill preview dialog with service breakdown
- Proper handling of membership fees as separate service
- Swedish currency formatting and date localization
- Material-UI optimized responsive design

### 🎯 DEVELOPMENT PROGRESS & TODO LIST

#### ✅ RECENTLY COMPLETED (August 2025)

##### 1. � **Complete Billing System Implementation**

- ✅ Added MEMBERSHIP serviceType to Prisma schema
- ✅ Removed deprecated unitPrice field from UtilityService
- ✅ Complete Excel data import with historical pricing
- ✅ Utility billing calculations for water and membership
- ✅ Generate quarterly bills with all service types
- ✅ Reconciliation between main and household meters
- ✅ All historical bills generated and set to "paid" status

##### 2. 🎨 **Frontend Billing Interface**

- ✅ Complete Billing page with bill overview
- ✅ BillPreview component with detailed invoice breakdown
- ✅ Separate billing rows for variable and fixed costs
- ✅ Membership fee as dedicated service type display
- ✅ Filter and summary functionality
- ✅ Swedish localization and currency formatting

##### 3. � **Data Management & Import**

- ✅ Pricing history extraction from Excel (pricing-extractor.ts)
- ✅ Complete import script (import-excel-complete.ts)
- ✅ Historical water and membership pricing import
- ✅ Utility billing records for all periods
- ✅ Cleaned up development artifacts and scripts

#### High Priority (Next Sprint)

##### 1. 🔍 **System Testing & Quality**

- [ ] End-to-end testing of complete billing flow
- [ ] Test all role-based access controls
- [ ] Validate billing calculations with Excel data
- [ ] Performance testing with full dataset
- [ ] Error handling improvements

##### 2. 📄 **Invoice Features**

- [ ] PDF invoice generation
- [ ] Invoice printing functionality
- [ ] Email invoice delivery
- [ ] Invoice templates and customization
- [ ] Payment status management

##### 3. 📈 **Reports & Analytics Dashboard**

- [ ] Consumption reports per household
- [ ] Cost analysis and trends
- [ ] Reconciliation reports (main vs household meters)
- [ ] Financial statements
- [ ] Export functionality (PDF/Excel)
- [ ] Visual charts with Chart.js/Recharts

#### Medium Priority

##### 4. 💰 **Advanced Financial Management**

- [ ] Shared costs management and allocation
- [ ] Budget planning and tracking
- [ ] Reserve fund calculations
- [ ] Payment method integration (Bankgiro/Plusgiro)
- [ ] Automatic reconciliation algorithms
- [ ] Multi-currency support (if needed)

##### 5. 🏠 **Enhanced Member Features**

- [ ] Member self-service portal improvements
- [ ] Consumption history and trends
- [ ] Usage alerts and notifications
- [ ] Mobile app optimization
- [ ] Offline reading capability
- [ ] Member communication system

##### 6. 🔧 **System Administration**

- [ ] Advanced user role management
- [ ] System configuration interface
- [ ] Data backup and restore
- [ ] Audit logging
- [ ] Performance monitoring
- [ ] Automated testing suite

#### Low Priority (Future Enhancements)

##### 7. 📱 **Mobile & UX Improvements**

- [ ] Progressive Web App (PWA) features
- [ ] Push notifications for reading reminders
- [ ] QR code meter reading
- [ ] Voice input for readings
- [ ] Dark mode theme
- [ ] Accessibility improvements (WCAG compliance)

##### 8. 🔌 **Integrations & Automation**

- [ ] Smart meter integration (automatic readings)
- [ ] Accounting software integration (Fortnox/Visma)
- [ ] Email/SMS notifications
- [ ] Bank payment file generation
- [ ] Government reporting integration
- [ ] Weather data for consumption correlation

##### 9. 📊 **Advanced Analytics & AI**

- [ ] Predictive consumption modeling
- [ ] Leak detection algorithms
- [ ] Cost optimization recommendations
- [ ] Seasonal usage analysis
- [ ] Comparative benchmarking
- [ ] Machine learning for fraud detection

### 🛠️ TECHNICAL DEBT & IMPROVEMENTS

- [ ] Add comprehensive unit tests
- [ ] Implement integration tests
- [ ] Performance optimization
- [ ] Code documentation improvements
- [ ] Error monitoring (Sentry integration)
- [ ] Logging improvements
- [ ] Security audit and penetration testing

---

## 📋 ORIGINAL ANALYSIS & SPECIFICATIONS

- Monthly fee calculations ("avgift" = fees in Swedish)
- Cost allocation across different categories
- Budget vs actual tracking
- Running balances and totals

#### 2. Member/House Management

- Individual house/housing unit tracking
- Member-specific fee calculations
- Different fee structures per house type
- Payment tracking per member

#### 3. Cost Categories (Multi-Utility Samfällighetsförening)

- **Utility consumption billing** ("konsumtion") - Individual metered usage (water, electricity, gas)
- **Shared costs** ("gemensamma kostnader") - Split equally between 14 households
- **Member fees** ("medlemsavgift") - 3000 SEK/year per household
- **Administrative costs** ("administration")
- **Reserve fund** ("reservfond")

## Technical Requirements for Web App

### Frontend Technology Stack

- **Framework:** React 18+ with TypeScript
- **Build Tool:** Vite
- **UI Library:** Material-UI v6 (latest stable, not v8 as requested - v8 doesn't exist)
- **State Management:** React Context API or Redux Toolkit
- **Data Validation:** Zod or Yup
- **Charts/Visualization:** Chart.js or Recharts for financial charts

### Core Features to Implement

#### 1. Dashboard

- Overview of total fees collected
- Monthly financial summary
- Key performance indicators
- Visual charts showing financial trends

#### 2. Member Management

```typescript
interface UtilityService {
  id: string;
  name: string; // "Water", "Electricity", "Gas", etc.
  unit: string; // "m³", "kWh", "m³", etc.
  isActive: boolean;
  hasMainMeters: boolean; // true for services with main + household meters
  mainMeterCount: number; // e.g., 2 for water, 1 for electricity
  reconciliationRequired: boolean;
  readingFrequency: number; // readings per year
}

interface Member {
  id: string;
  householdNumber: string; // 1-14
  ownerName: string;
  andelstal: number; // 1/14 = 0.0714285714 for equal shares
  annualMemberFee: number; // 3000 SEK
  paymentStatus: "paid" | "pending" | "overdue";
  balanceAccount: number;
}
```

#### 3. Fee Calculation System

```typescript
interface BillingPeriod {
  id: string;
  periodName: string; // e.g., "2025-Q1", "2025-01", "2025-02"
  periodType: "quarterly" | "monthly";
  startDate: Date;
  endDate: Date;
  isOfficialBilling: boolean; // true only for 3 main quarterly periods
  isBillingEnabled: boolean; // true if bills should be generated for this period
  isReconciliationEnabled: boolean; // true if reconciliation should be performed
  readingDeadline: Date; // when meter readings are due
  billingDeadline?: Date; // when bills must be generated (nullable for monitoring-only)
  created_at: Date;
}

interface UtilityBilling {
  id: string;
  householdId: string;
  serviceId: string; // references UtilityService
  billingPeriodId: string; // references BillingPeriod
  reconciliationId?: string; // optional, for services that require reconciliation

  // Consumption details
  rawConsumption: number; // household meter reading difference
  reconciliationAdjustment: number; // ± adjustment from reconciliation (0 if no reconciliation)
  adjustedConsumption: number; // raw consumption + adjustment

  // Billing breakdown
  costPerUnit: number; // SEK per unit (m³, kWh, etc.)
  consumptionCost: number; // adjusted consumption × cost per unit
  fixedFeeShare: number; // fixed fee ÷ 14 households
  totalUtilityCost: number; // consumption cost + fixed fee share

  created_at: Date;
}

interface QuarterlyBill {
  id: string;
  householdId: string;
  billingPeriodId: string; // references a BillingPeriod with isOfficialBilling = true
  memberFee: number; // 1000 SEK per quarterly period
  utilityCharges: UtilityBilling[]; // array of all utility services for this period
  sharedCosts: number; // total shared costs ÷ 14 households
  totalAmount: number;
  dueDate: Date;
  status: "pending" | "paid" | "overdue";
}

interface MonthlyBill {
  id: string;
  householdId: string;
  billingPeriodId: string; // references a BillingPeriod with isBillingEnabled = true
  utilityCharges: UtilityBilling[]; // array of utility services for this month
  totalAmount: number; // utility costs only (no member fees or shared costs)
  dueDate: Date;
  status: "pending" | "paid" | "overdue";
}

interface MeterReading {
  id: string;
  meterId: string; // household or main meter
  billingPeriodId: string; // can be quarterly or monthly period
  meterReading: number;
  readingDate: Date;
  consumption?: number; // calculated since last reading
  notes?: string;
}
```

#### 4. Financial Reporting

- Monthly financial statements
- Annual budget planning
- Cost center analysis
- Export functionality (PDF, Excel)

#### 5. Budget Management

```typescript
interface Budget {
  year: number;
  categories: {
    utilitySupplyCosts: { [serviceId: string]: number }; // water, electricity, gas costs
    sharedMaintenance: number;
    administration: number;
    insurance: number;
    reserves: number;
  };
  totalSharedCosts: number;
  totalMemberFees: number; // 14 × 3000 = 42,000 SEK
  costPerHousehold: number; // shared costs ÷ 14
}
```

### Data Model Structure

#### Core Entities

1. **Property Owners** - Individual property owners within the association
2. **Properties** - Individual properties with shares and metadata
3. **Transactions** - All financial movements
4. **Budget Items** - Planned expenses by category
5. **Fee Schedules** - Monthly/quarterly fee calculations
6. **Payments** - Property owner payment records

### UI Components to Build

#### Navigation Structure

```
Dashboard
├── Multi-Utility Billing Overview
├── Household Management
│   ├── Household List (14 households)
│   ├── Add/Edit Household
│   └── Payment History
├── Utility Services
│   ├── Service Configuration (Water, Electricity, Gas)
│   ├── Meter Management
│   └── Pricing Configuration
├── Meter Readings
│   ├── Reading Entry (By Service)
│   ├── Reconciliation View
│   ├── Reading History
│   └── Consumption Reports
├── Billing & Payments
│   ├── Generate Quarterly Bills
│   ├── Payment Tracking
│   └── Outstanding Balances
├── Shared Costs Management
│   ├── Annual Budget Planning
│   ├── Expense Entry
│   └── Cost Allocation
└── Reports
    ├── Utility Usage Analytics
    ├── Financial Statements
    └── Export Tools
```

#### Key Material-UI Components to Use

- `DataGrid` for member and transaction lists
- `Card` components for dashboard metrics
- `TextField` and `Select` for forms
- `DatePicker` for date selections
- `Charts` for financial visualizations
- `Dialog` for modal forms
- `Snackbar` for notifications

### Architecture Decisions Made

1. **Data Source:** ✅ **DECIDED**

   - **Database:** PostgreSQL for robust data persistence
   - **API Backend:** Node.js + Express
   - **Data Migration:** Import existing Excel data into PostgreSQL

2. **User Roles:** ✅ **DECIDED**
   - **Primary Users:** All property owners in the samfällighetsförening
   - **Access Levels:** To be defined later (likely read-only for most owners, admin access for board)

### Backend Technology Recommendations

Given your PostgreSQL choice, here are the best backend options:

#### Option 1: Node.js + Express (Recommended for this project)

**Pros:**

- Same language (TypeScript) for both frontend and backend
- Excellent PostgreSQL support with Prisma ORM
- Fast development cycle
- Great ecosystem for financial applications
- Easy integration with React frontend

**Tech Stack:**

- **Runtime:** Node.js 18+
- **Framework:** Express.js with TypeScript
- **ORM:** Prisma (excellent PostgreSQL integration)
- **Validation:** Zod (shared with frontend)
- **Authentication:** JWT with refresh tokens
- **API Documentation:** Swagger/OpenAPI

### Recommended Architecture

```
Frontend (React + TypeScript + Vite)
         ↓ HTTP/REST API
Backend (Node.js + Express + TypeScript)
         ↓ SQL queries
Database (PostgreSQL)
```

1. **Calculation Logic:** Are there specific Swedish samfällighetsförening regulations that affect:

   - Fee calculation formulas based on andelstal (share ratios)?
   - Reserve fund requirements?
   - VAT handling for different services?

2. **Integration Needs:** Should the app integrate with:

   - Swedish banking systems (Bankgiro/Plusgiro)?
   - Accounting software (Fortnox, Visma)?
   - Government reporting systems?

3. **Localization:**

   - Should the UI be in Swedish only?
   - Date formats (Swedish standard)?
   - Currency formatting (SEK)?

4. **Data Migration:**
   - How should existing Excel data be imported?
   - Is historical data preservation critical?
   - What's the migration timeline?

## ✅ COMPLETED IMPLEMENTATION PHASES

### Phase 1: Full Stack Setup ✅ COMPLETED

- ✅ Set up React/TypeScript/Vite frontend project
- ✅ Set up Node.js/Express/TypeScript backend project
- ✅ Configure PostgreSQL database with Prisma ORM
- ✅ Implement basic authentication system (JWT + roles)
- ✅ Create basic routing and layout
- ✅ Design Material-UI theme (Swedish design preferences)

### Phase 2: Core Features ✅ COMPLETED

- ✅ Build user management (CRUD operations with role-based access)
- ✅ Implement household management (14 households, removed andelstal)
- ✅ Create dashboard with key metrics
- ✅ Set up complete database schema for utility management
- ✅ Utility services management (Water, Electricity, Gas, etc.)
- ✅ Meter management (household + main meters)
- ✅ Meter readings with role-based restrictions
- ✅ Billing periods (quarterly + monthly support)

## 🚧 REMAINING IMPLEMENTATION PHASES

### Phase 3: Financial Features ✅ COMPLETED (August 2025)

- ✅ Implement complete billing calculation logic
- ✅ Build automatic bill generation (quarterly + monthly)
- ✅ Create reconciliation algorithms (main vs household meters)
- ✅ Add utility billing with membership service integration
- ✅ Implement shared costs allocation framework
- ✅ Build quarterly bill reporting system
- ✅ Add historical data import and pricing management

### Phase 4: Advanced Features (CURRENT PHASE)

- ✅ Enhanced billing GUI with detailed preview
- [ ] Data visualization and charts (consumption trends, cost analysis)
- [ ] Excel import/export functionality
- [ ] Advanced reporting and analytics
- [ ] Enhanced user role management and permissions
- [ ] Mobile optimization and PWA features
- [ ] Automated notifications and reminders

### Phase 5: Polish & Production

- [ ] Comprehensive data validation and error handling
- [ ] Performance optimization and caching
- [ ] User testing and feedback integration
- [ ] Production deployment preparation
- [ ] Security audit and testing
- [ ] Documentation and training materials

## 🗄️ CURRENT DATABASE SCHEMA (PostgreSQL + Prisma)

#### Core Tables (Implemented)

```sql
-- Users table (authentication)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role ENUM('ADMIN', 'MEMBER') DEFAULT 'MEMBER',
  household_id UUID REFERENCES households(id), -- nullable for admin users
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Households table (14 households)
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_number INTEGER UNIQUE NOT NULL CHECK (household_number BETWEEN 1 AND 14),
  owner_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  address VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Utility services configuration table
CREATE TABLE utility_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL, -- "Water", "Electricity", "Gas"
  unit VARCHAR(20) NOT NULL, -- "m³", "kWh", "m³"
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Main meters table (for reconciliation)
CREATE TABLE main_meters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES utility_services(id),
  meter_identifier VARCHAR(100) NOT NULL, -- "Water Main 1", "Electricity Main", etc.
  meter_serial VARCHAR(100),
  installation_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Main meter readings table
CREATE TABLE main_meter_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meter_id UUID REFERENCES main_meters(id),
  billing_period_id UUID REFERENCES billing_periods(id),
  meter_reading DECIMAL(12,3) NOT NULL,
  reading_date DATE NOT NULL,
  consumption DECIMAL(12,3), -- calculated consumption since last reading
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Household meters table
CREATE TABLE household_meters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id),
  service_id UUID REFERENCES utility_services(id),
  meter_serial VARCHAR(100),
  installation_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(household_id, service_id) -- one meter per household per service
);

-- Household meter readings table
CREATE TABLE household_meter_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_meter_id UUID REFERENCES household_meters(id),
  billing_period_id UUID REFERENCES billing_periods(id),
  meter_reading DECIMAL(12,3) NOT NULL,
  reading_date DATE NOT NULL,
  raw_consumption DECIMAL(12,3), -- calculated consumption since last reading
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Utility reconciliation table (for services that require it)
CREATE TABLE utility_reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES utility_services(id),
  billing_period_id UUID REFERENCES billing_periods(id),
  main_meter_total DECIMAL(12,3) NOT NULL, -- sum of all main meters for service
  household_total DECIMAL(12,3) NOT NULL, -- sum of all household meters
  difference DECIMAL(12,3) NOT NULL, -- main total - household total
  adjustment_per_household DECIMAL(10,3) NOT NULL, -- difference ÷ 14
  reconciliation_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Utility pricing table
CREATE TABLE utility_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES utility_services(id),
  effective_date DATE NOT NULL,
  price_per_unit DECIMAL(8,4) NOT NULL, -- SEK per unit (m³, kWh, etc.)
  fixed_fee_total DECIMAL(10,2) DEFAULT 0, -- total fixed fee (subscription, connection fee, etc.)
  fixed_fee_per_household DECIMAL(8,2) DEFAULT 0, -- calculated: fixed_fee_total ÷ 14
  is_active BOOLEAN DEFAULT true,
  notes TEXT, -- e.g., "Includes water subscription fee"
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Utility billing details table
CREATE TABLE utility_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id),
  service_id UUID REFERENCES utility_services(id),
  reconciliation_id UUID REFERENCES utility_reconciliation(id), -- nullable for services without reconciliation
  billing_period_id UUID REFERENCES billing_periods(id),

  -- Consumption breakdown
  raw_consumption DECIMAL(12,3) NOT NULL, -- household meter reading difference
  reconciliation_adjustment DECIMAL(10,3) DEFAULT 0, -- ± adjustment from reconciliation
  adjusted_consumption DECIMAL(12,3) NOT NULL, -- raw + adjustment

  -- Pricing breakdown
  cost_per_unit DECIMAL(8,4) NOT NULL, -- variable rate
  consumption_cost DECIMAL(10,2) NOT NULL, -- adjusted consumption × rate
  fixed_fee_share DECIMAL(8,2) NOT NULL, -- fixed fee ÷ 14 households
  total_utility_cost DECIMAL(10,2) NOT NULL, -- consumption cost + fixed fee share
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Billing periods table (supports both quarterly and monthly periods)
CREATE TABLE billing_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_name VARCHAR(20) NOT NULL UNIQUE, -- e.g., "2025-Q1", "2025-01", "2025-02", etc.
  period_type ENUM('quarterly', 'monthly') NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_official_billing BOOLEAN DEFAULT false, -- true only for 3 main quarterly periods
  is_billing_enabled BOOLEAN DEFAULT false, -- true if bills should be generated for this period
  is_reconciliation_enabled BOOLEAN DEFAULT false, -- true if reconciliation should be performed
  reading_deadline DATE NOT NULL, -- when meter readings are due
  billing_deadline DATE, -- when bills must be generated (nullable for monitoring-only periods)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(period_name, period_type)
);

-- Official quarterly bills table (every 4th month)
CREATE TABLE quarterly_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id),
  billing_period_id UUID REFERENCES billing_periods(id),

  member_fee DECIMAL(8,2) DEFAULT 1000.00, -- 3000/3 = 1000 SEK per period
  total_utility_costs DECIMAL(10,2) NOT NULL, -- sum of all utility services
  shared_costs DECIMAL(8,2) NOT NULL, -- total shared costs ÷ 14
  total_amount DECIMAL(10,2) NOT NULL,

  due_date DATE NOT NULL,
  status ENUM('pending', 'paid', 'overdue') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Ensure only official billing periods can have quarterly bills
  CONSTRAINT quarterly_bills_official_only CHECK (
    EXISTS (
      SELECT 1 FROM billing_periods bp
      WHERE bp.id = billing_period_id AND bp.is_official_billing = true
    )
  )
);

-- Optional monthly bills table (utility costs only, no member fees)
CREATE TABLE monthly_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id),
  billing_period_id UUID REFERENCES billing_periods(id),

  total_utility_costs DECIMAL(10,2) NOT NULL, -- sum of all utility services for this month
  total_amount DECIMAL(10,2) NOT NULL, -- same as utility costs (no member fees or shared costs)

  due_date DATE NOT NULL,
  status ENUM('pending', 'paid', 'overdue') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Ensure only monthly periods with billing enabled can have monthly bills
  CONSTRAINT monthly_bills_billing_enabled_only CHECK (
    EXISTS (
      SELECT 1 FROM billing_periods bp
      WHERE bp.id = billing_period_id
      AND bp.period_type = 'monthly'
      AND bp.is_billing_enabled = true
    )
  )
);

-- Payments table (handles both quarterly and monthly bills)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quarterly_bill_id UUID REFERENCES quarterly_bills(id),
  monthly_bill_id UUID REFERENCES monthly_bills(id),
  amount DECIMAL(8,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(50),
  reference_number VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Ensure payment is for either quarterly or monthly bill, but not both
  CONSTRAINT payment_bill_type_check CHECK (
    (quarterly_bill_id IS NOT NULL AND monthly_bill_id IS NULL) OR
    (quarterly_bill_id IS NULL AND monthly_bill_id IS NOT NULL)
  )
);

-- Shared costs table
CREATE TABLE shared_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  quarter INTEGER CHECK (quarter BETWEEN 1 AND 4),
  description VARCHAR(255) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  cost_per_household DECIMAL(8,2) NOT NULL, -- total_amount ÷ 14
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Water pricing table
CREATE TABLE water_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  effective_date DATE NOT NULL,
  price_per_cubic_meter DECIMAL(6,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Multi-Utility Service Examples

#### 1. Water Service

- **Main meters:** 2 (requires reconciliation)
- **Unit:** m³ (cubic meters)
- **Reading frequency:** 3 times per year
- **Reconciliation:** Yes - accounts for leaks and shared usage

#### 2. Electricity Service

- **Main meters:** 1 (requires reconciliation)
- **Unit:** kWh (kilowatt-hours)
- **Reading frequency:** 4 times per year (quarterly)
- **Reconciliation:** Yes - accounts for common area lighting, pumps

#### 3. Gas Service

- **Main meters:** 1 (requires reconciliation)
- **Unit:** m³ (cubic meters)
- **Reading frequency:** 2 times per year (bi-annual)
- **Reconciliation:** Yes - accounts for common heating systems

#### 4. Waste Management Service

- **Main meters:** 0 (no reconciliation needed)
- **Unit:** Fixed fee per household
- **Reading frequency:** 1 time per year
- **Reconciliation:** No - fixed allocation

### Utility Pricing Structure Examples

#### Water Service with Fixed Fee

- **Variable rate:** 45.50 SEK per m³
- **Fixed subscription fee:** 2,400 SEK per quarter (total for all households)
- **Fixed fee per household:** 2,400 ÷ 14 = 171.43 SEK per household per quarter
- **Example bill:** (5.2 m³ × 45.50 SEK) + 171.43 SEK = 236.60 + 171.43 = 408.03 SEK

#### Electricity Service with Connection Fee

- **Variable rate:** 1.85 SEK per kWh
- **Grid connection fee:** 840 SEK per quarter (total)
- **Fixed fee per household:** 840 ÷ 14 = 60.00 SEK per household per quarter
- **Example bill:** (450 kWh × 1.85 SEK) + 60.00 SEK = 832.50 + 60.00 = 892.50 SEK

#### Gas Service with Base Fee

- **Variable rate:** 12.30 SEK per m³
- **Base service fee:** 1,680 SEK per quarter (total)
- **Fixed fee per household:** 1,680 ÷ 14 = 120.00 SEK per household per quarter

### Fixed Fee Management Benefits

1. **Accurate cost allocation:** Fixed utility costs properly distributed
2. **Transparent billing:** Households see both consumption and fixed components
3. **Fair distribution:** Fixed costs split equally regardless of usage
4. **Simplified administration:** Automatic calculation of per-household shares
5. **Flexible configuration:** Each service can have different fixed fee structures

### Gröngräset Samfällighetsförening - Specific Setup

**Key Details:**

- **14 households** with equal shares (andelstal = 1/14 = 0.07142857)
- **Annual member fee:** 3,000 SEK per household
- **Payment schedule:** 3 payments per year (1,000 SEK per payment)
- **Primary purpose:** Water consumption billing + shared cost management

**Multi-Utility Billing System with Configurable Services:**

- **Configurable utility services** (Water, Electricity, Gas, etc.)
- **Flexible meter configurations** (with or without main meters)
- **Service-specific reconciliation** (when main meters exist)
- **Multiple reading frequencies** per service type
- **Individual pricing** per utility service
- **Unified billing** combining all services + member fees + shared costs

**Billing Formula per Quarter - Multi-Utility with Fixed Fees:**

```
For each utility service:
1. If service has main meters: Apply reconciliation
   - Main Meter Total = Sum of all main meters for service
   - Household Total = Sum of all household meters for service
   - Difference = Main meters - Household meters = Distribution losses/gains
   - Adjustment per Household = Difference × Andelstal (1/14)
   - Adjusted Consumption = Household Reading + Adjustment
2. If service has no main meters: Use direct reading
   - Adjusted Consumption = Household Reading
3. Calculate service costs:
   - Consumption Cost = Adjusted Consumption × Variable Rate
   - Fixed Fee Share = Total Fixed Fee ÷ 14 households
   - Total Service Cost = Consumption Cost + Fixed Fee Share

Total Bill = Member Fee + Sum(All Service Costs) + Shared Costs Share

Where:
- Member Fee = 3,000 SEK ÷ 3 payments = 1,000 SEK
- Each service calculated independently with both variable and fixed components
- Fixed fees (subscriptions, connection fees) split equally
- Shared Cost Share = Total Shared Costs ÷ 14 households
```

**Cost Structure:**

1. **Fixed Member Fee:** 1,000 SEK per household per payment period
2. **Variable Water Cost:** Based on adjusted consumption (reconciled m³ × rate)
3. **Shared Costs:** Utilities, maintenance, admin costs split equally
4. **Reconciliation Factor:** Accounts for meter differences and shared usage

**Payment Frequency:**

- Currently 3 times per year (can be adjusted in the web app)
- Corresponds with water meter reading schedule
- Quarterly billing cycle

## Next Steps

1. Clarify the questions above
2. Examine actual Excel formulas and data relationships
3. Define exact calculation logic for Swedish housing cooperative fees
4. Create detailed wireframes for key screens
5. Set up development environment

Would you like me to dive deeper into any specific aspect or answer the clarification questions to proceed with the implementation?

## Reading Frequency and Billing Periods

### Overview

The system supports flexible reading and billing periods to accommodate both mandatory official billing and optional monthly billing/monitoring:

1. **Official Quarterly Periods:** 3 mandatory reading periods per year (every 4th month)
2. **Optional Monthly Readings:** Additional readings with choice of billing or monitoring only
3. **Automated Reconciliation:** Reconciliation occurs during official billing periods and optionally for monthly billing

### Billing Period Types

#### 1. Official Quarterly Periods (Mandatory)

- **Frequency:** 3 times per year (January, May, September)
- **Purpose:** Official billing and invoicing
- **Reconciliation:** Full meter reconciliation performed
- **Billing:** Quarterly bills generated for all households
- **Member Fee:** 1,000 SEK included
- **Examples:** 2025-Q1 (Jan-Apr), 2025-Q2 (May-Aug), 2025-Q3 (Sep-Dec)

#### 2. Optional Monthly Periods (Voluntary)

- **Frequency:** Up to 9 additional months (Feb, Mar, Apr, Jun, Jul, Aug, Oct, Nov, Dec)
- **Purpose:** Either billing or monitoring (configurable per period)
- **Options:**
  - **Monthly Billing:** Generate bills for utility consumption only (no member fees)
  - **Monitoring Only:** Data collection for trend analysis and leak detection
- **Reconciliation:** Optional - can be enabled for monthly billing periods
- **Examples:** 2025-02, 2025-03, 2025-04, etc.

### Reconciliation Process

#### For Official Quarterly Periods:

1. **Main Meter Readings:** Total consumption from supplier
2. **Household Meter Readings:** Sum of all individual household meters
3. **Calculate Difference:** Main meters - Household meters = Distribution losses/gains
4. **Distribute Adjustment:** Total difference ÷ 14 households = Adjustment per household
5. **Adjust Consumption:** Each household's raw consumption + adjustment = Final billable consumption
6. **Generate Bills:** Full quarterly bills with member fees and shared costs

#### For Monthly Periods with Billing Enabled:

1. **Main Meter Readings:** Optional - can be enabled for reconciliation
2. **Household Meter Readings:** Required for all households
3. **Reconciliation Options:**
   - **With Reconciliation:** Apply same process as quarterly (if main meters read)
   - **Without Reconciliation:** Use raw household readings only
4. **Generate Bills:** Monthly utility bills only (no member fees or shared costs)

#### For Monthly Periods (Monitoring Only):

1. **Household Readings Only:** Raw meter readings for monitoring
2. **No Reconciliation:** Use readings as-is for informational purposes
3. **No Billing:** Data used for trend analysis and leak detection only

### Consumption Calculation Examples

#### Example 1: Official Quarterly Period (2025-Q1) - Water Service

```
Main Meter Total: 1,000 m³
Household Meters Total: 980 m³
Difference: 20 m³ (distribution losses)
Adjustment per household: 20 ÷ 14 = 1.43 m³

Household A:
- Raw consumption: 15 m³
- Adjustment: +1.43 m³
- Final billable consumption: 16.43 m³
- Variable cost: 16.43 × 45 SEK/m³ = 739.35 SEK
- Fixed fee share: 2,000 ÷ 14 = 142.86 SEK
- Total utility cost: 739.35 + 142.86 = 882.21 SEK
```

#### Example 2: Optional Monthly Period with Billing (2025-02) - Water Service

```
Main Meter Reading: Optional (370 m³ if reconciliation enabled)
Household Meters Total: 350 m³ (if reconciliation enabled)
Difference: 20 m³ (if reconciliation enabled)
Adjustment per household: 20 ÷ 14 = 1.43 m³ (if reconciliation enabled)

Household A:
- Raw consumption: 5 m³
- Adjustment: +1.43 m³ (if reconciliation enabled, 0 if not)
- Final billable consumption: 6.43 m³ (or 5 m³ without reconciliation)
- Variable cost: 6.43 × 45 SEK/m³ = 289.35 SEK
- Fixed fee share: 2,000 ÷ 14 = 142.86 SEK
- Total monthly bill: 289.35 + 142.86 = 432.21 SEK
- Note: No member fees or shared costs in monthly bills
```

#### Example 3: Optional Monthly Period (Monitoring Only) (2025-03) - Water Service

```
No Main Meter Reading Required
Household A: 4.8 m³ (raw reading for monitoring only)
- No reconciliation adjustment
- No billing generated
- Data stored for trend analysis and leak detection
```

### Database Implementation

```sql
-- Example billing periods for 2025
INSERT INTO billing_periods VALUES
-- Official quarterly periods (mandatory billing with member fees)
('2025-Q1', 'quarterly', '2025-01-01', '2025-04-30', true, true, true, '2025-01-31', '2025-02-15'),
('2025-Q2', 'quarterly', '2025-05-01', '2025-08-31', true, true, true, '2025-05-31', '2025-06-15'),
('2025-Q3', 'quarterly', '2025-09-01', '2025-12-31', true, true, true, '2025-09-30', '2025-10-15'),

-- Optional monthly periods with billing (utility costs only)
('2025-02', 'monthly', '2025-02-01', '2025-02-28', false, true, true, '2025-02-28', '2025-03-05'),
('2025-06', 'monthly', '2025-06-01', '2025-06-30', false, true, false, '2025-06-30', '2025-07-05'),

-- Optional monthly periods (monitoring only)
('2025-03', 'monthly', '2025-03-01', '2025-03-31', false, false, false, '2025-03-31', null),
('2025-04', 'monthly', '2025-04-01', '2025-04-30', false, '2025-04-30', null),
-- ... continue for other optional months
```

### Business Logic

#### Reading Collection:

1. **Official Quarterly Periods:** Both main and household meters must be read
2. **Monthly Billing Periods:** Household meters required, main meters optional (based on reconciliation setting)
3. **Monthly Monitoring Periods:** Only household meters need to be read
4. **Missing Readings:** System can estimate based on historical consumption

#### Billing Generation:

1. **Official Quarterly Periods:** Generate comprehensive quarterly bills (member fees + utilities + shared costs)
2. **Monthly Billing Periods:** Generate utility-only bills (no member fees or shared costs)
3. **Monthly Monitoring Periods:** No bills generated, data used for reporting only
4. **Reconciliation:** Performed based on period settings (always for quarterly, optional for monthly billing)

#### Payment Processing:

1. **Quarterly Bills:** Include all costs, due within 30 days
2. **Monthly Bills:** Utility costs only, due within 15 days
3. **Outstanding Balances:** Track separately for quarterly vs monthly bills
4. **Credit/Debit Adjustments:** Applied during next quarterly billing period

#### User Experience:

1. **Dashboard:** Shows both official and optional readings with billing status
2. **Notifications:** Reminders for reading deadlines and bill due dates
3. **Reports:** Monthly consumption trends and cost analysis
4. **Bill Preview:** Estimate bills using latest readings
5. **Flexible Configuration:** Admin can enable/disable monthly billing per period
6. **Bill Preview:** Estimate bills using latest readings

This approach gives you the best of both worlds:

- **Simplified Billing:** Only 3 official bills per year
- **Enhanced Monitoring:** Optional monthly readings for leak detection and usage tracking
- **Accurate Reconciliation:** Proper meter reconciliation during official periods
- **Flexible System:** Easy to add or remove optional reading periods as needed

## 🚀 DEVELOPMENT ENVIRONMENT

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Docker & Docker Compose
- VS Code (recommended)

### Quick Start

```bash
# 1. Start database
docker compose up -d

# 2. Setup backend
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev

# 3. Setup frontend (new terminal)
cd frontend
npm install
npm run dev

# 4. Access application
# Frontend: http://localhost:5174
# Backend API: http://localhost:3001
```

### VS Code Tasks

- **dev-backend**: Start backend development server
- **dev-frontend**: Start frontend development server
- **build-backend**: Build backend for production
- **test-backend**: Run backend tests
- **prisma-generate**: Generate Prisma client
- **prisma-migrate**: Run database migrations
- **docker-up**: Start PostgreSQL database
- **docker-down**: Stop database

### Test Accounts

```
Admin Account:
Email: admin@grongraset.se
Password: admin123

Member Account:
Email: member@grongraset.se
Password: member123
```

### Key URLs

- **Frontend**: http://localhost:5174
- **Backend API**: http://localhost:3001
- **Database**: localhost:5432
- **Health Check**: http://localhost:3001/health

### Database Schema

Current Prisma schema includes:

- Users (authentication & roles)
- Households (14 households)
- UtilityServices (Water, Electricity, etc.)
- HouseholdMeters & MainMeters
- MeterReadings (household & main)
- BillingPeriods (quarterly & monthly)

### API Documentation

All endpoints require authentication except `/api/auth/login`

- **Authentication**: Bearer token in Authorization header
- **ADMIN Endpoints**: Full access to all data
- **MEMBER Endpoints**: Restricted to own household data

---
