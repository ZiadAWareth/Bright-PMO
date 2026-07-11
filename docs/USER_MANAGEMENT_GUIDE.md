# User Management System - Quick Reference Guide

## Overview
Enterprise-grade user management system following Primavera P6 and Microsoft Project best practices for resource allocation, workload tracking, and capacity planning.

## Key Features

### 1. User List Page (`/users`)
**Capabilities:**
- View all users with real-time workload metrics
- Filter by department, role, status, and capacity
- Search by name, email, or department
- Export data to CSV
- View summary statistics (total, active, overloaded, available)
- Visual utilization indicators

**Metrics Displayed:**
- Active projects count
- Active tasks count
- Hours allocated vs logged
- Utilization percentage (0-100%+)
- Capacity status (Available, Under Utilized, Optimal, Overloaded)

**Best Practices:**
- **Available (<50% utilization)**: Ready for new assignments
- **Under Utilized (50-79%)**: Can take on more work
- **Optimal (80-100%)**: Fully loaded, best productivity zone
- **Overloaded (>100%)**: Over-allocated, rebalancing needed

### 2. User Detail Page (`/users/[user_id]`)
**Tabs:**

#### Overview Tab
- Capacity breakdown (allocated, logged, available hours)
- Task distribution (To Do, In Progress, Completed)
- Overdue tasks alert section
- Key performance indicators

#### Projects Tab
- All project assignments
- Role in each project (Team Member, Lead)
- Project status and progress
- Task counts per project
- Hours breakdown per project

#### Tasks Tab
- Upcoming tasks (next 2 weeks)
- Task status and timeline
- Estimated hours per task
- Progress tracking

#### Workload Tab
- Weekly time distribution
- Hours logged per week
- Capacity utilization by week
- Time entry counts

### 3. Workload API (`/api/users/[user_id]/workload`)
**Query Parameters:**
- `start_date`: Starting date for calculation (default: today)
- `end_date`: Ending date for calculation (default: 90 days from start)

**Calculated Metrics:**
1. **Project Metrics**
   - Total projects assigned
   - Active projects (in_progress, planning)
   - Completed projects

2. **Task Metrics**
   - Total tasks assigned
   - Active tasks (todo, in_progress, assigned)
   - Completed tasks
   - Overdue tasks with days overdue

3. **Hour Calculations**
   - Total hours allocated (from task estimates)
   - Total hours logged (from time entries + task actuals)
   - Total capacity hours (40 hours/week × number of weeks)
   - Available hours (capacity - allocated)

4. **Utilization Formula**
   ```
   Utilization % = (Total Hours Allocated / Total Capacity Hours) × 100
   ```

5. **Capacity Status Logic**
   - `overloaded`: >100% utilization
   - `optimal`: 80-100% utilization
   - `under_utilized`: 50-79% utilization
   - `available`: <50% utilization

## Data Sources (No DB Changes Required)

The system calculates everything from existing Prisma models:

### User Information
- **User** model: Basic account info
- **Account** model: Name, department, contact info
- **Role** model: User role permissions

### Workload Data
- **ProjectTeamMember**: Project assignments, roles, lead status
- **TaskAssignment**: Task assignments per user
- **Task**: Estimated hours, actual hours, status, dates
- **TimeEntry**: Hours logged per day/task
- **Timesheet**: Weekly timesheet summaries

### Calculations
All metrics are calculated in real-time at the API level:
- No new database fields required
- No migrations needed
- Uses existing relationships and data

## Navigation Access

**Allowed Roles:**
- PMO (Project Management Office)
- ADMIN (System Administrator)
- HR (Human Resources)
- DIR (Director)

**Location:** Main navigation sidebar → "User Management"

## Best Practices (Primavera/MS Project Style)

### 1. Resource Leveling
- Monitor users with >100% utilization
- Redistribute tasks from overloaded resources
- Balance workload across team members

### 2. Capacity Planning
- Standard capacity: 40 hours/week
- Plan for 80-90% utilization (optimal range)
- Leave 10-20% buffer for meetings, admin work

### 3. Workload Monitoring
- Check overdue tasks weekly
- Review upcoming tasks for bottlenecks
- Monitor time logged vs estimated

### 4. Resource Allocation
- Assign based on availability and skills
- Track project-specific roles (lead vs member)
- Consider multiple project assignments

### 5. Performance Tracking
- Compare estimated vs actual hours
- Track task completion rates
- Monitor weekly time distribution patterns

## Usage Scenarios

### Scenario 1: Assigning New Project Tasks
1. Go to `/users`
2. Filter by `capacity_status = "available"`
3. Review users with <80% utilization
4. Check their skills and current projects
5. Assign tasks to balanced resources

### Scenario 2: Identifying Resource Bottlenecks
1. Go to `/users`
2. Filter by `capacity_status = "overloaded"`
3. Click on overloaded user for details
4. Review their project breakdown
5. Redistribute tasks to available team members

### Scenario 3: Project Staffing Review
1. Go to specific user detail page
2. Click "Projects" tab
3. Review all project assignments
4. Check task distribution across projects
5. Identify if user is spread too thin

### Scenario 4: Performance Review Preparation
1. Access user detail page
2. Review "Overview" tab metrics
3. Check task completion rate
4. Compare estimated vs actual hours
5. Review weekly time distribution consistency

## Export & Reporting

### CSV Export
Available from main users list page. Includes:
- User identification (name, email, department)
- Current assignments (projects, tasks)
- Hours metrics (allocated, logged)
- Utilization and capacity status

### Use Cases for Export
- Executive reporting
- Resource planning meetings
- Budget allocation discussions
- Performance review cycles

## Tips & Shortcuts

1. **Quick Filtering**: Use keyboard to type in search box immediately
2. **Visual Indicators**: Progress bars show utilization at a glance
3. **Color Coding**: 
   - Blue (Available)
   - Yellow (Under Utilized)
   - Green (Optimal)
   - Red (Overloaded)
4. **Click-through**: Click any user row to view full details
5. **Time Range**: Adjust API query params for custom date ranges

## Troubleshooting

### No Users Showing
- Check that users have accounts in Account table
- Verify role permissions for accessing the page
- Ensure API endpoints are accessible

### Incorrect Hours
- Verify TaskAssignment records exist
- Check Task.estimated_hours and Task.actual_hours
- Confirm TimeEntry records are being created
- Review Timesheet entries for accuracy

### Capacity Status Wrong
- Check calculation: (hours allocated / 40 × weeks) × 100
- Verify date range parameters
- Ensure task dates are set correctly

## Technical Notes

**Performance:**
- Uses Promise.all for parallel API calls
- Efficient Prisma queries with selective includes
- No N+1 query problems

**Security:**
- Role-based access control
- JWT token authentication
- Permission checks on all routes

**Scalability:**
- Calculations done on-demand
- No stored/cached metrics
- Real-time accuracy guaranteed

---

**For technical implementation details, refer to the source code:**
- `/app/users/page.tsx` - Main list page
- `/app/users/[user_id]/page.tsx` - Detail page  
- `/app/api/users/[user_id]/workload/route.ts` - Workload API
