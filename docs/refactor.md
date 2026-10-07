# Project Management System - Refactor & Optimization Plan

## Executive Summary

This document provides a comprehensive refactor and optimization roadmap for the PM Bright construction project management system. The analysis is based on industry-leading practices from **Primavera P6** and **Microsoft Project**, identifying critical gaps and enhancement opportunities.

---

## 📊 Current System Analysis

### Strengths
- ✅ Enterprise Project Structure (EPS) hierarchy
- ✅ Portfolio management capabilities
- ✅ WBS (Work Breakdown Structure) implementation
- ✅ Resource management with assignments
- ✅ Risk management module
- ✅ Budget tracking and EVMS
- ✅ Critical Path Method (CPM) calculations
- ✅ Time tracking and timesheets
- ✅ Document management
- ✅ Workflow and approval processes

### Current Architecture
- **Frontend**: Next.js 15 with React, TypeScript
- **Backend**: Next.js API Routes (Server-side)
- **Database**: PostgreSQL with Prisma ORM
- **UI Framework**: Radix UI + Tailwind CSS

---

## 🎯 Missing Features (Based on Primavera P6 & MS Project)

### 1. **Advanced Resource Management** ⭐⭐⭐ (Critical)

#### Missing Features:
- **Resource Calendars**: Individual working calendars for resources
- **Resource Leveling/Smoothing**: Automatic optimization to resolve over-allocation
- **Resource Histograms**: Visual representation of resource allocation over time
- **Resource Pools**: Shared resource repositories across multiple projects
- **Skills Matrix**: Advanced skills mapping and competency levels
- **Resource Cost Curves**: S-curves for resource cost planning
- **Multi-unit Assignments**: Support for multiple resources of same type
- **Resource Availability Profiles**: Time-phased availability patterns

#### Primavera P6 Reference:
```
Resources > Resource Assignments
- Resource Curves (Early, Late, Uniform)
- Resource Analysis views
- Resource Leveling algorithms
- Resource Rate Tables
```

#### Implementation Priority: **HIGH**

---

### 2. **Advanced Scheduling Features** ⭐⭐⭐ (Critical)

#### Missing Features:
- **Multiple Baselines**: Compare multiple project baselines (P6 allows unlimited baselines)
- **Schedule Compression**: Fast-tracking and crashing analysis
- **What-If Scenarios**: Sandbox environments for schedule testing
- **Fragnets/Templates**: Reusable schedule fragments
- **Activity Codes**: Multi-level activity categorization
- **Constraint Types**: Full range of date constraints
  - Must Start On (MSO)
  - Must Finish On (MFO)
  - Start No Earlier Than (SNET)
  - Start No Later Than (SNLT)
  - Finish No Earlier Than (FNET)
  - Finish No Later Than (FNLT)
  - As Late As Possible (ALAP)
  - As Soon As Possible (ASAP)
- **Float Path Analysis**: Near-critical path identification
- **Schedule Impact Analysis**: Predictive impact assessment
- **Retained Logic/Progress Override**: Progress calculation methods

#### MS Project Reference:
```
Project > Task Inspector
- Constraint Types
- Task Drivers
- Schedule Impact Analysis
```

---

### 3. **Earned Value Management (EVM) Enhancements** ⭐⭐⭐ (Critical)

#### Current Implementation Gaps:
- **To-Complete Performance Index (TCPI)**
- **Estimate at Completion (EAC)** with multiple methods:
  - EAC = BAC / CPI
  - EAC = AC + (BAC - EV)
  - EAC = AC + [(BAC - EV) / (CPI × SPI)]
  - EAC = AC + Bottom-up ETC
- **Variance at Completion (VAC)**
- **Performance Factor (PF)**
- **Cost Variance (CV) and Schedule Variance (SV) trends**
- **EVM Forecasting Models**
- **Periodic Performance Review (PPR)**
- **Performance Measurement Baseline (PMB)**

#### Primavera P6 EVMS Features:
```
Tools > Earned Value
- EV Method (% Complete, Physical %, Units)
- Performance Thresholds
- EV User Preferences
- Multi-level EV reporting
```

---

### 4. **Global and Project Calendars** ⭐⭐⭐ (Critical)

#### Missing Features:
- **Global Calendars**: Standard calendars (5-day, 7-day, 4x10)
- **Project-Specific Calendars**: Custom working time per project
- **Resource Calendars**: Individual resource working patterns
- **Holiday Calendars**: Regional/national holiday management
- **Exception Calendars**: Special events and shutdowns
- **Shift Calendars**: Multiple shifts per day (3-shift, 2-shift)
- **Calendar Inheritance**: Hierarchical calendar structure

#### Primavera P6 Calendar Types:
```
Admin > Calendars
- Global Calendar
- Resource Calendar  
- Project Calendar
- Base Calendar Templates
```

#### Database Schema Addition:
```sql
CREATE TABLE "Calendar" (
  calendar_id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  type CalendarType, -- GLOBAL, PROJECT, RESOURCE
  is_default BOOLEAN DEFAULT false,
  parent_calendar_id INT REFERENCES Calendar(calendar_id),
  timezone VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "CalendarWorkingDay" (
  working_day_id SERIAL PRIMARY KEY,
  calendar_id INT REFERENCES Calendar(calendar_id),
  day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6),
  is_working BOOLEAN DEFAULT true,
  start_time TIME,
  end_time TIME,
  break_start TIME,
  break_end TIME
);

CREATE TABLE "CalendarException" (
  exception_id SERIAL PRIMARY KEY,
  calendar_id INT REFERENCES Calendar(calendar_id),
  exception_date DATE,
  is_working BOOLEAN DEFAULT false,
  description VARCHAR(500),
  recurrence_pattern VARCHAR(100)
);
```

---

### 5. **Cost Management & Financial Controls** ⭐⭐⭐ (Critical)

#### Missing Features:
- **Cost Accounts**: Detailed cost breakdown structure
- **Expense Categories**: Operating vs Capital expenses
- **Cost Escalation**: Inflation and price escalation tracking
- **Budget Allocation Strategies**: Top-down and bottom-up
- **Cost Loading**: Labor, Material, Equipment distribution
- **Committed Costs**: Purchase orders and commitments
- **Funding Sources**: Multiple funding pools
- **Cost Variance Analysis**: Detailed variance reports
- **Cash Flow Analysis**: S-curve cash flow projections
- **Payment Schedules**: Milestone-based payments

#### MS Project Cost Features:
```
Cost Table:
- Fixed Cost
- Cost Accrual (Start, End, Prorated)
- Baseline Cost
- Cost Variance
- Cost Per Use
```

---

### 6. **Claims Management** ⭐⭐ (High Priority)

#### Missing Module:
Construction projects require dedicated claims management:

- **Claim Registration**: Event logging and documentation
- **Claim Types**: EOT (Extension of Time), Cost, Disruption
- **Time Impact Analysis (TIA)**: Schedule impact modeling
- **As-Planned vs As-Built**: Forensic schedule analysis
- **Windows Analysis**: Period-by-period delay analysis
- **Contemporaneous Records**: Real-time documentation
- **Claim Workflow**: Review, negotiation, approval chain
- **Entitlement vs Quantum**: Separate tracking

#### Database Schema:
```sql
CREATE TABLE "Claim" (
  claim_id SERIAL PRIMARY KEY,
  project_id INT REFERENCES Project(project_id),
  claim_number VARCHAR(50) UNIQUE,
  claim_type ClaimType, -- EOT, COST, DISRUPTION, ACCELERATION
  description TEXT,
  event_date DATE,
  submission_date DATE,
  claimed_amount DECIMAL(15,2),
  claimed_days INT,
  approved_amount DECIMAL(15,2),
  approved_days INT,
  status ClaimStatus,
  submitted_by INT REFERENCES User(user_id),
  contractor_ref VARCHAR(100)
);

CREATE TABLE "ClaimEvidence" (
  evidence_id SERIAL PRIMARY KEY,
  claim_id INT REFERENCES Claim(claim_id),
  evidence_type VARCHAR(100),
  document_id INT REFERENCES Document(document_id),
  description TEXT,
  upload_date TIMESTAMP DEFAULT NOW()
);
```

---

### 7. **Lookahead Planning** ⭐⭐ (High Priority)

#### Missing Features:
Critical for construction projects:

- **Weekly/Monthly Lookaheads**: Short-term detailed planning
- **Constraint Analysis**: Identification of blocking constraints
- - Equipment availability
  - Material delivery
  - Information required
  - Access/space constraints
  - Weather conditions
  - Permits and approvals
- **Commitment Planning**: Resource commitment forecasting
- **Rolling Wave Planning**: Progressive elaboration
- **Production Rate Tracking**: Unit productivity analysis

#### Primavera P6 Lookahead:
```
View > Grouping and Sorting
- Group by Time Period (Week/Month)
- Filter by Date Range
- Constraint Log
```

---

### 8. **Change Management** ⭐⭐ (High Priority)

#### Missing Features:
- **Change Request Workflow**: Formal change request process
- **Change Impact Analysis**: Cost, schedule, scope impact
- **Variation Orders**: Construction-specific variations
- **Change Log**: Complete change history
- **Approval Matrix**: Multi-level approvals
- **Baseline Comparison**: Before/after analysis
- **Change Categories**: Client-initiated, Design, Site conditions

---

### 9. **Progress Measurement & Tracking** ⭐⭐ (High Priority)

#### Missing Features:
- **Physical Progress Methods**:
  - Weighted Milestones
  - Units Complete
  - 50/50 Rule
  - 0/100 Rule
  - 20/80 Rule
  - Level of Effort (LOE)
- **Progress Curves**: S-curve progress tracking
- **Productivity Analysis**: Earned units vs actual hours
- **Progress Override**: Manual progress adjustment
- **Progress Spotlighting**: Focus on critical activities
- **Percent Complete Types**:
  - Duration % Complete
  - Physical % Complete  
  - Units % Complete

---

### 10. **Advanced Reporting & Dashboards** ⭐⭐ (High Priority)

#### Missing Reports:
- **Standard Construction Reports**:
  - Daily Progress Report
  - Weekly Progress Report
  - Monthly Progress Report
  - Lookahead Schedule (3-week, 6-week)
  - Delay Analysis Report
  - Productivity Report
  - Resource Histogram
  - Cost Performance Report
  - Earned Value Report
  - Risk Register Report
  - Quality Control Report
- **Custom Report Builder**: User-defined reports
- **Report Templates**: Reusable report formats
- **Automated Report Distribution**: Scheduled email reports
- **Executive Dashboard**: High-level KPIs
- **Program-Level Dashboards**: Multi-project views

#### Primavera P6 Report Types:
```
Reports > Report Wizard
- Tabular Reports
- Graphic Reports
- Resource & Role Reports
- Cost Reports
- Earned Value Reports
```

---

### 11. **Document Control & RFI Management** ⭐⭐ (Medium Priority)

#### Current Gaps:
- **Document Transmittals**: Formal document exchange
- **Request for Information (RFI)**: Technical clarifications
  - RFI Number tracking
  - Question/Response workflow
  - Response timeline tracking
  - Impact on schedule/cost
- **Submittal Management**: Shop drawings, product data
  - Submittal log
  - Review workflow (Reviewed, Approved, etc.)
  - Revision tracking
- **Drawing Register**: As-built drawings management
- **Document Revision Control**: Version control system
- **Document Distribution Matrix**: Who receives what

#### Database Schema:
```sql
CREATE TABLE "RFI" (
  rfi_id SERIAL PRIMARY KEY,
  rfi_number VARCHAR(50) UNIQUE,
  project_id INT REFERENCES Project(project_id),
  subject VARCHAR(255),
  question TEXT,
  response TEXT,
  raised_by INT REFERENCES User(user_id),
  assigned_to INT REFERENCES User(user_id),
  status RFIStatus, -- DRAFT, SUBMITTED, RESPONDED, CLOSED
  date_raised DATE,
  required_date DATE,
  responded_date DATE,
  cost_impact DECIMAL(15,2),
  schedule_impact INT, -- days
  priority RFIPriority
);

CREATE TABLE "Submittal" (
  submittal_id SERIAL PRIMARY KEY,
  submittal_number VARCHAR(50),
  project_id INT REFERENCES Project(project_id),
  specification_section VARCHAR(100),
  title VARCHAR(255),
  description TEXT,
  submitted_by INT REFERENCES User(user_id),
  submission_date DATE,
  required_date DATE,
  review_status SubmittalStatus,
  revision_number INT DEFAULT 1
);
```

---

### 12. **Quality Control & Inspections** ⭐⭐ (Medium Priority)

#### Missing Features:
- **Quality Control Plan (QCP)**: Quality requirements
- **Inspection Checklists**: Pre-defined inspection criteria
- **Non-Conformance Reports (NCR)**: Deficiency tracking
- **Material Testing**: Lab test results
- **Quality Hold Points**: Mandatory inspection points
- **Punch Lists**: Deficiency lists per area
- **Warranty Tracking**: Equipment/material warranties

---

### 13. **Safety Management** ⭐ (Medium Priority)

#### Missing Features:
- **Safety Incidents**: Incident reporting and tracking
- **Near-Miss Reporting**: Proactive safety tracking
- **Safety Inspections**: Regular safety audits
- **Safety Training Records**: Personnel certifications
- **Safety Meetings**: Toolbox talks tracking
- **PPE Tracking**: Personal protective equipment
- **Safety Performance Indicators**: Lost Time Injury (LTI), etc.

---

### 14. **Equipment & Plant Management** ⭐ (Medium Priority)

#### Current Gaps:
- **Equipment Mobilization/Demobilization**: Equipment lifecycle
- **Equipment Utilization**: Usage vs availability
- **Fuel Consumption**: Operating cost tracking
- **Equipment Breakdown**: Downtime tracking
- **Equipment Rental vs Owned**: Cost comparison
- **Equipment Transfer**: Between sites/projects
- **Equipment Calibration**: Certification tracking

---

### 15. **Subcontractor Management** ⭐ (Medium Priority)

#### Missing Features:
- **Subcontractor Database**: Pre-qualified contractors
- **Subcontractor Performance**: Rating and evaluation
- **Subcontractor Packages**: Work package management
- **Subcontractor Invoicing**: Payment applications
- **Subcontractor Insurance**: Certificate tracking
- **Back-charge Management**: Cost recovery
- **Subcontractor Schedule Integration**: Linked schedules

---

### 16. **Weather Tracking** ⭐ (Low Priority)

#### Missing Features:
- **Daily Weather Log**: Temperature, rainfall, wind
- **Weather Delays**: Lost productivity tracking
- **Weather Impact Analysis**: Delay justification
- **Historical Weather Data**: Trend analysis

---

## 🏗️ Database Schema Enhancements

### Recommended Additions

```sql
-- 1. Calendar System
CREATE TABLE "Calendar" (
  calendar_id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) CHECK (type IN ('GLOBAL', 'PROJECT', 'RESOURCE')),
  is_default BOOLEAN DEFAULT false,
  parent_calendar_id INT REFERENCES Calendar(calendar_id),
  timezone VARCHAR(100) DEFAULT 'UTC',
  hours_per_day DECIMAL(4,2) DEFAULT 8.0,
  hours_per_week DECIMAL(4,2) DEFAULT 40.0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Resource Pools
CREATE TABLE "ResourcePool" (
  pool_id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  manager_id INT REFERENCES User(user_id),
  is_shared BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE Resource ADD COLUMN pool_id INT REFERENCES ResourcePool(pool_id);
ALTER TABLE Resource ADD COLUMN calendar_id INT REFERENCES Calendar(calendar_id);

-- 3. Activity Codes (Project Coding Structure)
CREATE TABLE "ActivityCode" (
  code_id SERIAL PRIMARY KEY,
  project_id INT REFERENCES Project(project_id),
  code_type VARCHAR(100), -- AREA, DISCIPLINE, PHASE, BUILDING
  code_value VARCHAR(100),
  description VARCHAR(500),
  parent_code_id INT REFERENCES ActivityCode(code_id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "TaskActivityCode" (
  task_id INT REFERENCES Task(task_id),
  code_id INT REFERENCES ActivityCode(code_id),
  PRIMARY KEY (task_id, code_id)
);

-- 4. Baselines (Multiple)
CREATE TABLE "ProjectBaseline" (
  baseline_id SERIAL PRIMARY KEY,
  project_id INT REFERENCES Project(project_id),
  baseline_name VARCHAR(255),
  baseline_type VARCHAR(50), -- ORIGINAL, CURRENT, FORECAST
  baseline_date DATE,
  is_primary BOOLEAN DEFAULT false,
  created_by INT REFERENCES User(user_id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "TaskBaseline" (
  baseline_id INT REFERENCES ProjectBaseline(baseline_id),
  task_id INT REFERENCES Task(task_id),
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  duration INT,
  budget_cost DECIMAL(15,2),
  PRIMARY KEY (baseline_id, task_id)
);

-- 5. Claims Management
CREATE TABLE "Claim" (
  claim_id SERIAL PRIMARY KEY,
  project_id INT REFERENCES Project(project_id),
  claim_number VARCHAR(50) UNIQUE,
  claim_type VARCHAR(50) CHECK (claim_type IN ('EOT', 'COST', 'DISRUPTION', 'ACCELERATION')),
  title VARCHAR(255),
  description TEXT,
  event_date DATE,
  submission_date DATE,
  claimed_amount DECIMAL(15,2),
  claimed_days INT,
  approved_amount DECIMAL(15,2),
  approved_days INT,
  status VARCHAR(50),
  submitted_by INT REFERENCES User(user_id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 6. RFI Management
CREATE TABLE "RFI" (
  rfi_id SERIAL PRIMARY KEY,
  project_id INT REFERENCES Project(project_id),
  rfi_number VARCHAR(50) UNIQUE,
  subject VARCHAR(255),
  question TEXT,
  response TEXT,
  raised_by INT REFERENCES User(user_id),
  assigned_to INT REFERENCES User(user_id),
  status VARCHAR(50),
  date_raised DATE,
  required_date DATE,
  responded_date DATE,
  cost_impact DECIMAL(15,2),
  schedule_impact INT,
  priority VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 7. Constraints Log
CREATE TABLE "TaskConstraint" (
  constraint_id SERIAL PRIMARY KEY,
  task_id INT REFERENCES Task(task_id),
  constraint_type VARCHAR(100), -- MATERIAL, EQUIPMENT, INFORMATION, ACCESS, WEATHER, APPROVAL
  constraint_date DATE,
  description TEXT,
  responsible_party INT REFERENCES User(user_id),
  status VARCHAR(50), -- OPEN, RESOLVED, OVERDUE
  resolved_date DATE,
  impact_days INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 8. Lookahead Planning
CREATE TABLE "Lookahead" (
  lookahead_id SERIAL PRIMARY KEY,
  project_id INT REFERENCES Project(project_id),
  week_starting DATE,
  week_ending DATE,
  created_by INT REFERENCES User(user_id),
  status VARCHAR(50), -- DRAFT, PUBLISHED
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "LookaheadTask" (
  lookahead_id INT REFERENCES Lookahead(lookahead_id),
  task_id INT REFERENCES Task(task_id),
  planned_start DATE,
  planned_finish DATE,
  constraint_status VARCHAR(50), -- CLEAR, PENDING, BLOCKED
  notes TEXT,
  PRIMARY KEY (lookahead_id, task_id)
);

-- 9. Change Management
CREATE TABLE "ChangeRequest" (
  change_id SERIAL PRIMARY KEY,
  project_id INT REFERENCES Project(project_id),
  change_number VARCHAR(50) UNIQUE,
  title VARCHAR(255),
  description TEXT,
  change_type VARCHAR(100), -- SCOPE, DESIGN, CLIENT, SITE_CONDITIONS
  requested_by INT REFERENCES User(user_id),
  request_date DATE,
  cost_impact DECIMAL(15,2),
  schedule_impact INT, -- days
  status VARCHAR(50), -- SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED
  approval_date DATE,
  approved_by INT REFERENCES User(user_id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 10. Quality Control
CREATE TABLE "InspectionChecklist" (
  checklist_id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  description TEXT,
  checklist_type VARCHAR(100), -- CONCRETE, STEEL, MEP, FINISHING
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "InspectionChecklistItem" (
  item_id SERIAL PRIMARY KEY,
  checklist_id INT REFERENCES InspectionChecklist(checklist_id),
  item_number VARCHAR(20),
  description TEXT,
  acceptance_criteria TEXT,
  order_index INT
);

CREATE TABLE "Inspection" (
  inspection_id SERIAL PRIMARY KEY,
  project_id INT REFERENCES Project(project_id),
  task_id INT REFERENCES Task(task_id),
  checklist_id INT REFERENCES InspectionChecklist(checklist_id),
  inspection_date DATE,
  inspector_id INT REFERENCES User(user_id),
  status VARCHAR(50), -- PASSED, FAILED, CONDITIONAL
  comments TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "InspectionResult" (
  result_id SERIAL PRIMARY KEY,
  inspection_id INT REFERENCES Inspection(inspection_id),
  item_id INT REFERENCES InspectionChecklistItem(item_id),
  result VARCHAR(50), -- PASS, FAIL, NA
  comments TEXT,
  photo_url VARCHAR(500)
);

-- 11. Non-Conformance Reports
CREATE TABLE "NCR" (
  ncr_id SERIAL PRIMARY KEY,
  project_id INT REFERENCES Project(project_id),
  ncr_number VARCHAR(50) UNIQUE,
  description TEXT,
  location VARCHAR(255),
  raised_by INT REFERENCES User(user_id),
  date_raised DATE,
  severity VARCHAR(50), -- CRITICAL, MAJOR, MINOR
  status VARCHAR(50), -- OPEN, CLOSED, UNDER_REVIEW
  corrective_action TEXT,
  closed_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 12. Productivity Tracking
CREATE TABLE "ProductivityTarget" (
  target_id SERIAL PRIMARY KEY,
  project_id INT REFERENCES Project(project_id),
  activity_name VARCHAR(255),
  unit_of_measure VARCHAR(50), -- M3, M2, TON, EA
  target_rate DECIMAL(10,4), -- units per hour
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "ProductivityActual" (
  actual_id SERIAL PRIMARY KEY,
  task_id INT REFERENCES Task(task_id),
  target_id INT REFERENCES ProductivityTarget(target_id),
  work_date DATE,
  units_completed DECIMAL(10,2),
  hours_worked DECIMAL(10,2),
  actual_rate DECIMAL(10,4),
  variance_percentage DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔧 Code Architecture Improvements

### 1. **Modularization Strategy**

#### Current Issues:
- Large page components with mixed concerns
- API routes with business logic
- Repeated code across components

#### Recommended Structure:
```
lib/
  ├── services/           # Business logic layer
  │   ├── calendar.service.ts
  │   ├── resource-leveling.service.ts
  │   ├── schedule.service.ts
  │   ├── evms.service.ts
  │   ├── claim.service.ts
  │   └── lookahead.service.ts
  ├── repositories/       # Data access layer
  │   ├── task.repository.ts
  │   ├── resource.repository.ts
  │   └── project.repository.ts
  ├── validators/         # Input validation
  │   ├── task.validator.ts
  │   └── resource.validator.ts
  ├── utils/
  │   ├── calculations/   # Pure calculation functions
  │   │   ├── evms.calculations.ts
  │   │   ├── cpm.calculations.ts
  │   │   └── resource-leveling.ts
  │   └── formatters/
  └── types/              # TypeScript interfaces
```

---

### 2. **Caching Strategy**

Implement Redis/memory caching for:
- Critical path calculations
- Resource availability queries
- Dashboard metrics
- Report generation

```typescript
// lib/cache/redis-cache.ts
import Redis from 'ioredis';

export class CacheService {
  private redis: Redis;
  
  async getCriticalPath(projectId: number) {
    const cacheKey = `critical-path:${projectId}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) return JSON.parse(cached);
    
    const result = await calculateCriticalPath(projectId);
    await this.redis.setex(cacheKey, 3600, JSON.stringify(result));
    
    return result;
  }
}
```

---

### 3. **Background Job Processing**

Use **BullMQ** or **Agenda** for:
- Schedule calculations
- Report generation
- Email notifications
- Data aggregation
- EVM calculations

```typescript
// lib/jobs/schedule-calculation.job.ts
import { Queue, Worker } from 'bullmq';

export const scheduleQueue = new Queue('schedule-calculations');

export const scheduleWorker = new Worker('schedule-calculations', async job => {
  const { projectId } = job.data;
  await CriticalPathService.calculateCriticalPath(projectId);
  await EVMService.calculateMetrics(projectId);
});
```

---

### 4. **Real-time Updates**

Implement WebSocket connections for:
- Progress updates
- Task status changes
- Resource assignments
- Notifications

```typescript
// lib/websocket/socket-server.ts
import { Server } from 'socket.io';

export function initializeWebSocket(httpServer) {
  const io = new Server(httpServer);
  
  io.on('connection', (socket) => {
    socket.on('join-project', (projectId) => {
      socket.join(`project-${projectId}`);
    });
  });
  
  return io;
}

// Emit updates
io.to(`project-${projectId}`).emit('task-updated', taskData);
```

---

## 📈 Performance Optimization

### Database Optimization

```sql
-- Add strategic indexes
CREATE INDEX idx_task_project_wbs ON Task(wbs_id, project_id);
CREATE INDEX idx_task_dates ON Task(start_date, end_date);
CREATE INDEX idx_task_critical ON Task(is_critical_path) WHERE is_critical_path = true;
CREATE INDEX idx_resource_type_status ON Resource(type, availability_status);
CREATE INDEX idx_assignment_dates ON ResourceAssignment(start_date, end_date);

-- Partitioning large tables
CREATE TABLE time_entries_2026 PARTITION OF time_entries
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
```

### Query Optimization

```typescript
// Use select projection and pagination
const tasks = await prisma.task.findMany({
  select: {
    task_id: true,
    name: true,
    start_date: true,
    end_date: true,
    progress_percentage: true,
  },
  where: { wbs: { project_id: projectId } },
  take: 100,
  skip: (page - 1) * 100,
});
```

---

## 🚀 Implementation Roadmap

### Phase 1: Foundation (Months 1-2)
- [ ] Implement Calendar System (Global, Project, Resource)
- [ ] Add Multiple Baselines support
- [ ] Create modular service layer
- [ ] Implement caching strategy
- [ ] Database schema updates

### Phase 2: Advanced Scheduling (Months 3-4)
- [ ] Resource Leveling/Smoothing algorithms
- [ ] Schedule compression analysis
- [ ] Activity Codes implementation
- [ ] Advanced constraint types
- [ ] What-if scenarios

### Phase 3: Cost & EVM (Months 5-6)
- [ ] Enhanced EVM calculations (TCPI, EAC, VAC)
- [ ] Cost escalation tracking
- [ ] Cash flow analysis
- [ ] Committed costs
- [ ] Cost variance reports

### Phase 4: Construction-Specific (Months 7-9)
- [ ] Claims Management module
- [ ] RFI Management system
- [ ] Lookahead Planning
- [ ] Quality Control & Inspections
- [ ] Change Management
- [ ] Submittal tracking

### Phase 5: Advanced Features (Months 10-12)
- [ ] Resource Histograms
- [ ] Progress S-curves
- [ ] Productivity tracking
- [ ] Advanced reporting engine
- [ ] Safety management
- [ ] Weather tracking
- [ ] Subcontractor management

---

## 📊 Reporting Enhancements

### Standard Report Templates

```typescript
// lib/reports/templates/
export const reportTemplates = {
  dailyProgress: {
    name: 'Daily Progress Report',
    sections: ['summary', 'activities', 'resources', 'issues'],
    frequency: 'daily',
  },
  weeklyLookahead: {
    name: '3-Week Lookahead',
    sections: ['upcoming', 'constraints', 'resources'],
    frequency: 'weekly',
  },
  monthlyEVM: {
    name: 'Monthly Earned Value Report',
    sections: ['metrics', 'trends', 'forecasts'],
    frequency: 'monthly',
  },
};
```

---

## 🔐 Security Enhancements

```typescript
// lib/security/rbac.ts
export const permissions = {
  project: {
    create: ['admin', 'pm'],
    update: ['admin', 'pm', 'engineer'],
    delete: ['admin'],
    baseline: ['admin', 'pm'],
  },
  schedule: {
    update: ['admin', 'pm', 'scheduler'],
    approve: ['admin', 'pm'],
  },
  resources: {
    assign: ['admin', 'pm', 'resource-manager'],
    level: ['admin', 'scheduler'],
  },
};
```

---

## 🧪 Testing Strategy

```typescript
// __tests__/services/critical-path.test.ts
describe('CriticalPathService', () => {
  it('should identify critical path correctly', async () => {
    const project = await createTestProject();
    const criticalPath = await CriticalPathService.calculate(project.project_id);
    
    expect(criticalPath).toHaveLength(5);
    expect(criticalPath[0].total_float).toBe(0);
  });
  
  it('should handle circular dependencies', async () => {
    // Test error handling
  });
});
```

---

## 📚 Documentation Requirements

1. **User Guides**:
   - Resource Leveling User Guide
   - Lookahead Planning Guide
   - Claims Management Process
   - EVM Reporting Guide

2. **API Documentation**:
   - OpenAPI/Swagger specs
   - Integration guides
   - Webhook documentation

3. **Administrator Guides**:
   - Calendar Setup
   - Resource Pool Management
   - Performance Tuning
   - Backup & Recovery

---

## 🎓 Training Plan

1. **Basic Users**: Task updates, timesheets, document upload
2. **Project Managers**: Schedule management, reporting, approvals
3. **Schedulers**: Advanced scheduling, resource leveling, CPM
4. **Administrators**: System configuration, user management, integrations

---

## 🔗 Integration Opportunities

### Recommended Integrations:
1. **Accounting Systems**: QuickBooks, SAP, Oracle
2. **BIM/CAD**: Autodesk BIM 360, Revit
3. **Document Management**: SharePoint, Dropbox
4. **Communication**: Microsoft Teams, Slack
5. **Time Tracking**: Biometric devices, mobile apps
6. **Weather Data**: Weather APIs for automatic logging
7. **IoT Sensors**: Equipment tracking, site monitoring

---

## 🏆 Success Metrics

### Key Performance Indicators (KPIs):
- Schedule Performance Index (SPI) > 0.95
- Cost Performance Index (CPI) > 0.95
- On-time Task Completion Rate > 85%
- Resource Utilization Rate: 75-85%
- Number of Critical Path Activities < 15% of total
- RFI Response Time < 7 days
- Change Request Approval Time < 14 days
- Zero-delay tasks > 80%

---

## 💡 Quick Wins (Implement First)

1. **Calendar System** - Accurate date calculations
2. **Multiple Baselines** - Better progress tracking
3. **Resource Leveling** - Resolve over-allocations
4. **Lookahead Planning** - Proactive constraint management
5. **Enhanced EVM** - Better cost forecasting
6. **Automated Reports** - Reduce manual work
7. **Mobile App** - Field data collection

---

## 📞 Support & Maintenance

### Ongoing Activities:
- Monthly performance reviews
- Quarterly feature releases
- Weekly bug fix deployments
- 24/7 monitoring
- Daily backups
- Security updates

---

## 🌟 Best Practices Summary

### From Primavera P6:
1. Always use Activity IDs for traceability
2. Maintain schedule health < 20% tasks on critical path
3. Update progress weekly minimum
4. Use retained logic for progress
5. Set data date correctly
6. Regular schedule quality checks

### From Microsoft Project:
1. Use Task Inspector for troubleshooting
2. Set realistic constraints
3. Monitor driving predecessors
4. Track variances from baseline
5. Use resource pools for sharing
6. Regular leveling for over-allocations

---

## 🎯 Conclusion

This refactor plan provides a roadmap to transform the PM Bright system into an enterprise-grade construction project management platform comparable to Primavera P6 and Microsoft Project. Focus on Phase 1 foundations first, then progressively implement construction-specific features in subsequent phases.

**Estimated Effort**: 12-18 months for full implementation
**Team Size**: 3-5 developers + 1 QA + 1 DevOps
**Budget Consideration**: Plan for cloud infrastructure scaling and third-party integrations

---

**Document Version**: 1.0  
**Created**: January 2026  
**Next Review**: Quarterly

---
