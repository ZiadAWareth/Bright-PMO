#!/usr/bin/env ts-node

import { PrismaClient, Prisma, ProjectStatus, PortfolioStatus, PortfolioPriority, ProjectType } from '@prisma/client';
import type { ResourceType, TaskStatus, TaskPriority } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const egyptianFirstNames = [
  'Ahmed', 'Mohamed', 'Mahmoud', 'Mostafa', 'Hassan', 'Ibrahim', 'Khaled', 'Ali',
  'Fatma', 'Mona', 'Nour', 'Heba', 'Amira', 'Samira', 'Zeinab', 'Aya'
];

const egyptianLastNames = [
  'El-Sayed', 'Abdel-Rahman', 'Hassan', 'Ibrahim', 'Mohamed', 'Ali', 'Mahmoud',
  'El-Masry', 'El-Shafei', 'El-Gamal', 'El-Sherif', 'El-Badry', 'El-Naggar'
];

const departments = [
  'Project Management Office',
  'Finance',
  'Procurement',
  'Engineering',
  'Site Supervisor',
  'Quality Assurance',
  'IT Support',
  'Project Director',
  'Human Resources',
  'Legal Department'
];

const roles = [
  { 
    name: 'PJM', 
    description: 'Project Management - Responsible for most operational tasks', 
    permissions: { all: true } 
  },
  { 
    name: 'PMO', 
    description: 'Accountable for governance, monitoring, and reporting', 
    permissions: { projects: true, tasks: true, resources: true, monitoring: true } 
  },
  { 
    name: 'FIN', 
    description: 'Budgeting and cost tracking', 
    permissions: { finance: true, budget: true, cost: true } 
  },
  { 
    name: 'PROC', 
    description: 'Contracting and procurement management', 
    permissions: { procurement: true, contracts: true } 
  },
  { 
    name: 'ENG', 
    description: 'Technical team and engineering support', 
    permissions: { technical: true, engineering: true } 
  },
  { 
    name: 'SITE', 
    description: 'Field team management', 
    permissions: { site: true, field: true } 
  },
  { 
    name: 'QAQC', 
    description: 'Quality control and assurance', 
    permissions: { quality: true, inspection: true } 
  },
  { 
    name: 'IT', 
    description: 'System setup and automation support', 
    permissions: { it: true, system: true, automation: true } 
  },
  { 
    name: 'DIR', 
    description: 'Steering committee and project oversight', 
    permissions: { oversight: true, approval: true } 
  },
  { 
    name: 'HR', 
    description: 'Resource planning and management', 
    permissions: { hr: true, resources: true } 
  },
  { 
    name: 'LEGAL', 
    description: 'Contract and legal matters', 
    permissions: { legal: true, contracts: true } 
  },
  { 
    name: 'SYSTEM', 
    description: 'System Automated Actions', 
    permissions: { all: true } 
  }
];

const epsLevels = [
  { eps_code: 'EPS-001', name: 'Infrastructure', description: 'Infrastructure Projects', level: 1 },
  { eps_code: 'EPS-002', name: 'Construction', description: 'Construction Projects', level: 1 },
  { eps_code: 'EPS-003', name: 'IT', description: 'IT Projects', level: 1 }
];

interface PortfolioSeedData {
  name: string;
  description: string;
  status: PortfolioStatus;
  priority: PortfolioPriority;
  tags: string[];
  strategic_objective: string;
}

const portfolios: PortfolioSeedData[] = [
  { 
    name: 'Cairo Development', 
    description: 'Cairo City Development Projects',
    status: 'active' as PortfolioStatus,
    priority: 'high' as PortfolioPriority,
    tags: ['infrastructure', 'urban', 'development'],
    strategic_objective: 'Improve city infrastructure and modernize urban areas'

  },
  { 
    name: 'Alexandria Port', 
    description: 'Alexandria Port Expansion Projects',
    status: 'active' as PortfolioStatus, 
    priority: 'medium' as PortfolioPriority,
    tags: ['port', 'maritime', 'logistics'],
    strategic_objective: 'Increase port capacity and improve logistics efficiency'

  },
  { 
    name: 'Digital Transformation', 
    description: 'Digital Transformation Initiatives',
    status: 'active' as PortfolioStatus,
    priority: 'high' as PortfolioPriority,
    tags: ['it', 'digital', 'innovation'],
    strategic_objective: 'Modernize IT infrastructure and implement digital services'

  }
];

const projects = [
  {
    project_code: 'PRJ-001',
    name: 'New Cairo Metro Line',
    description: 'Construction of new metro line in New Cairo',
    start_date: new Date('2024-01-01'),
    planned_end_date: new Date('2026-12-31'),
    status: 'planning' as ProjectStatus,
    budget_amount: 50000000,
    actual_cost: 0,
    progress_percentage: 0,
    type: ProjectType.infrastructure,
    size: 120000
  },
  {
    project_code: 'PRJ-002',
    name: 'Smart City Initiative',
    description: 'Implementation of smart city technologies in Giza',
    start_date: new Date('2024-03-01'),
    planned_end_date: new Date('2025-12-31'),
    status: 'planning' as ProjectStatus,
    budget_amount: 30000000,
    actual_cost: 0,
    progress_percentage: 0,
    type: ProjectType.infrastructure,
    size: 95000
  },
  {
    project_code: 'PRJ-003',
    name: 'Commercial Complex Development',
    description: 'Construction of a mixed-use commercial complex in Downtown Cairo',
    start_date: new Date('2024-06-01'),
    planned_end_date: new Date('2026-06-30'),
    status: 'execution' as ProjectStatus,
    budget_amount: 75000000,
    actual_cost: 12500000,
    progress_percentage: 25,
    type: ProjectType.commercial,
    size: 80000
  }
];

async function main() {
  // Create Roles
  const createdRoles = await Promise.all(
    roles.map(role => prisma.role.create({ data: role }))
  );

  // Create EPS Levels
  const createdEPS = await Promise.all(
    epsLevels.map(async (eps) => {
      const existingEPS = await prisma.ePS.findMany({
        where: { eps_code: eps.eps_code }
      });
      
      if (existingEPS.length > 0) {
        return existingEPS[0];
      }
      
      return prisma.ePS.create({
        data: eps
      });
    })
  );

  // Create Users and Accounts
  const users: Array<Prisma.UserGetPayload<{ include: { account: true } }>> = [];
  
    // Create System User
  const systemRole = createdRoles.find(role => role.name === 'SYSTEM');
  if (!systemRole) {
    throw new Error('System role not found');
  }
  
  const systemUser = await prisma.user.upsert({
    where: { username: 'SYSTEM' },
    update: {},
    create: {
      username: 'SYSTEM',
      email: 'system@internal',
      password_hash: 'not_applicable',
      role_id: systemRole.role_id,
      status: 'active',
      account: {
        create: {
          first_name: 'System',
          last_name: 'Automated', 
          department: 'System',
          phone_number: 'N/A',
          is_active: true
        }
      }
    },
    include: { account: true }
  });

  const PJMRole = createdRoles.find(role => role.name === 'PJM');
  if (!PJMRole) {
    throw new Error('Admin role not found');
  }

  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@admin.com',
      password_hash: '$2a$12$NauYzC29LZT7pSH/himheuwORo5CQ5w7y3a.Z7fug6dyPtWkQmvKi', // password: admin
      role_id: PJMRole.role_id,
      status: 'active',
      account: {
        create: {
          first_name: 'Admin',
          last_name: '', 
          department: 'System',
          phone_number: 'N/A',
          is_active: true
        }
      }
    },
    include: { account: true }
  });

  for (let i = 0; i < 10; i++) {
    const firstName = egyptianFirstNames[Math.floor(Math.random() * egyptianFirstNames.length)];
    const lastName = egyptianLastNames[Math.floor(Math.random() * egyptianLastNames.length)];
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;
    const password = await bcrypt.hash('password123', 10);
    const role = createdRoles[Math.floor(Math.random() * createdRoles.length)];

    const user = await prisma.user.create({
      data: {
        username: `${firstName.toLowerCase()}${lastName.toLowerCase()}${i}`,
        email,
        password_hash: password,
        role_id: role.role_id,
        status: 'active',
        account: {
          create: {
            first_name: firstName,
            last_name: lastName,
            department: departments[Math.floor(Math.random() * departments.length)],
            phone_number: `+20${Math.floor(Math.random() * 900000000 + 100000000)}`,
            is_active: true
          }
        }
      },
      include: { account: true }
    });
    
    if (user.account) {
      users.push(user as Prisma.UserGetPayload<{ include: { account: true } }>);
    }
  }

  // Create Portfolios
  const createdPortfolios = await Promise.all(
    portfolios.map((portfolio, index) => {
      const user = users[index % users.length];
      if (!user?.account) {
        throw new Error(`User at index ${index} has no account`);
      }
      return prisma.portfolio.create({
        data: {
          name: portfolio.name,
          description: portfolio.description,
          manager_id: user.account.account_id,
          status: portfolio.status,
          priority: portfolio.priority,
          tags: portfolio.tags,
          strategic_objective: portfolio.strategic_objective
        }
      });
    })
  );

  // Create Projects
  const createdProjects = await Promise.all(
    projects.map((project, index) =>
      prisma.project.upsert({
        where: { project_code: project.project_code },
        update: {},
        create: {
          ...project,
          eps_level_id: createdEPS[index % createdEPS.length].eps_id,
          portfolio_id: createdPortfolios[index % createdPortfolios.length].portfolio_id,
          created_by: users[index % users.length].user_id,
          manager_id: users[index % users.length].user_id
        }
      })
    )
  );

  // Create WBS for Projects
  const createdWBS = [];
  for (const project of createdProjects) {
    // For PRJ-003, create five WBS items
    if (project.project_code === 'PRJ-003') {
      const wbsItems = [
        {
          name: 'Project Initiation',
          description: 'Project setup, planning, and initial documentation',
          progress: 85
        },
        {
          name: 'Foundation & Structural Work',
          description: 'Excavation, foundation laying, and structural framework',
          progress: 45
        },
        {
          name: 'MEP Systems Installation',
          description: 'Mechanical, Electrical, and Plumbing systems installation',
          progress: 15
        },
        {
          name: 'Interior Finishing',
          description: 'Interior finishing work including flooring, walls, and fixtures',
          progress: 5
        },
        {
          name: 'Final Testing & Handover',
          description: 'Final testing, commissioning, and project handover',
          progress: 0
        }
      ];

      for (let i = 0; i < wbsItems.length; i++) {
        const wbsItem = wbsItems[i];
        const startDate = new Date(project.start_date.getTime() + (i * 120 * 24 * 60 * 60 * 1000)); // 4 months apart
        const endDate = new Date(startDate.getTime() + (120 * 24 * 60 * 60 * 1000)); // 4 months duration each
        
        const wbs = await prisma.wBS.create({
          data: {
            wbs_code: `${project.project_code}-WBS-${String(i + 1).padStart(3, '0')}`,
            name: wbsItem.name,
            description: wbsItem.description,
            project_id: project.project_id,
            level: 1,
            progress_percentage: wbsItem.progress,
            start_date: startDate,
            end_date: endDate
          }
        });
        createdWBS.push(wbs);

        // Create WBS Items for each WBS
        await prisma.wBSItem.create({
          data: {
            wbs_item_code: `${wbs.wbs_code}-001`,
            name: `${wbsItem.name} - Main Activities`,
            description: `Main activities for ${wbsItem.name.toLowerCase()}`,
            start_date: startDate,
            end_date: endDate,
            budget_amount: project.budget_amount * 0.2, // 20% of total budget per phase
            actual_cost: project.budget_amount * 0.2 * (wbsItem.progress / 100),
            progress_percentage: wbsItem.progress,
            wbs_id: wbs.wbs_id
          }
        });
      }
    } else {
      // For other projects, create single WBS as before
      const wbs = await prisma.wBS.create({
        data: {
          wbs_code: `${project.project_code}-WBS-001`,
          name: 'Project Management',
          description: 'Project Management Activities',
          project_id: project.project_id,
          level: 0,
          progress_percentage: 0,
          start_date: project.start_date,
          end_date: project.planned_end_date
        }
      });
      createdWBS.push(wbs);

      // Create WBS Items
      await prisma.wBSItem.create({
        data: {
          wbs_item_code: `${wbs.wbs_code}-001`,
          name: 'Project Planning',
          description: 'Initial Project Planning Activities',
          start_date: project.start_date,
          end_date: new Date(project.start_date.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days later
          budget_amount: project.budget_amount * 0.1,
          actual_cost: 0,
          progress_percentage: 0,
          wbs_id: wbs.wbs_id
        }
      });
    }
  }

  // Create Resources
  const resources = await Promise.all(
    Array(5).fill(null).map((_, index) => 
      prisma.resource.create({
        data: {
          name: `Resource ${index + 1}`,
          type: ['labor', 'equipment', 'material'][Math.floor(Math.random() * 3)] as ResourceType,
          role: ['Engineer', 'Technician', 'Manager'][Math.floor(Math.random() * 3)],
          skills: { technical: true, management: true },
          rate: Math.random() * 100 + 50,
          capacity: Math.floor(Math.random() * 4) + 6, // Random capacity between 6-9 hours per day
          availability_status: 'available',
          department: departments[Math.floor(Math.random() * departments.length)],
          phone_number: `+20${Math.floor(Math.random() * 900000000 + 100000000)}`
        }
      })
    )
  );

  // Seed milestone tasks with is_milestone = true
  const tasks = [
    {
      wbs_id: createdWBS[0].wbs_id, // Use first WBS ID
      name: 'Project Kickoff',
      description: 'Initial project kickoff meeting and planning',
      start_date: new Date('2025-04-01'),
      end_date: new Date('2025-04-15'),
      duration: 14, // Duration in days
      progress_percentage: 100, // Task is completed
      is_milestone: true, // Marked as a milestone
      is_critical_path: false, // Not on the critical path
      priority: 'high' as TaskPriority, // High priority
      status: 'completed' as TaskStatus, // Task is completed
      created_by: systemUser.user_id, // Add created_by field
      estimated_hours: 120,
      actual_hours: 120,
      work_package: 'Initiation'
    },
    {
      wbs_id: createdWBS[1].wbs_id, // Use second WBS ID
      name: 'Phase 1 Completion',
      description: 'Completion of Phase 1 deliverables',
      start_date: new Date('2025-05-01'),
      end_date: new Date('2025-05-15'),
      duration: 14, // Duration in days
      progress_percentage: 0, // Task is not started
      is_milestone: true, // Marked as a milestone
      is_critical_path: true, // On the critical path
      priority: 'medium' as TaskPriority, // Medium priority
      status: 'todo' as TaskStatus, // Task is pending
      created_by: systemUser.user_id, // Add created_by field
      estimated_hours: 80,
      actual_hours: 0,
      work_package: 'Execution'
    }
  ];

  // Add tasks for PRJ-003 WBS items (find WBS items that belong to PRJ-003)
  const prj003WBS = createdWBS.filter(wbs => wbs.wbs_code.startsWith('PRJ-003-WBS'));
  
  const prj003Tasks = [
    {
      wbs_id: prj003WBS[0]?.wbs_id, // Project Initiation
      name: 'Site Survey and Permits',
      description: 'Conduct comprehensive site survey and obtain all necessary permits',
      start_date: new Date('2024-06-01'),
      end_date: new Date('2024-06-30'),
      duration: 30,
      progress_percentage: 95,
      is_milestone: false,
      is_critical_path: true,
      priority: 'high' as TaskPriority,
      status: 'completed' as TaskStatus,
      created_by: systemUser.user_id,
      estimated_hours: 240,
      actual_hours: 228,
      work_package: 'Site Preparation'
    },
    {
      wbs_id: prj003WBS[1]?.wbs_id, // Foundation & Structural Work
      name: 'Foundation Construction',
      description: 'Excavation and foundation construction for the commercial complex',
      start_date: new Date('2024-10-01'),
      end_date: new Date('2024-12-15'),
      duration: 75,
      progress_percentage: 65,
      is_milestone: false,
      is_critical_path: true,
      priority: 'high' as TaskPriority,
      status: 'in_progress' as TaskStatus,
      created_by: systemUser.user_id,
      estimated_hours: 800,
      actual_hours: 520,
      work_package: 'Foundation'
    },
    {
      wbs_id: prj003WBS[2]?.wbs_id, // MEP Systems Installation
      name: 'Electrical Infrastructure Setup',
      description: 'Installation of main electrical systems and infrastructure',
      start_date: new Date('2025-02-01'),
      end_date: new Date('2025-04-30'),
      duration: 89,
      progress_percentage: 20,
      is_milestone: false,
      is_critical_path: false,
      priority: 'medium' as TaskPriority,
      status: 'in_progress' as TaskStatus,
      created_by: systemUser.user_id,
      estimated_hours: 480,
      actual_hours: 96,
      work_package: 'MEP'
    },
    {
      wbs_id: prj003WBS[3]?.wbs_id, // Interior Finishing
      name: 'Interior Design Implementation',
      description: 'Implementation of interior design and finishing work',
      start_date: new Date('2025-06-01'),
      end_date: new Date('2025-09-30'),
      duration: 120,
      progress_percentage: 5,
      is_milestone: false,
      is_critical_path: false,
      priority: 'medium' as TaskPriority,
      status: 'todo' as TaskStatus,
      created_by: systemUser.user_id,
      estimated_hours: 600,
      actual_hours: 30,
      work_package: 'Interior'
    },
    {
      wbs_id: prj003WBS[4]?.wbs_id, // Final Testing & Handover
      name: 'Final Inspection and Handover',
      description: 'Final inspection, testing, and project handover to client',
      start_date: new Date('2026-04-01'),
      end_date: new Date('2026-06-30'),
      duration: 90,
      progress_percentage: 0,
      is_milestone: true,
      is_critical_path: true,
      priority: 'high' as TaskPriority,
      status: 'todo' as TaskStatus,
      created_by: systemUser.user_id,
      estimated_hours: 320,
      actual_hours: 0,
      work_package: 'Handover'
    }
  ].filter(task => task.wbs_id); // Filter out any tasks with undefined wbs_id

  // Combine all tasks
  const allTasks = [...tasks, ...prj003Tasks];

  // Insert tasks into the database
  await Promise.all(
    allTasks.map((task) =>
      prisma.task.create({
        data: task,
      })
    )
  );

  // Create Sites for projects
  const sites = await Promise.all([
    prisma.site.upsert({
      where: { site_code: 'SITE-001' },
      update: {},
      create: {
        site_code: 'SITE-001',
        name: 'North Cairo Construction Site',
        description: 'Main construction site in North Cairo',
        address: '123 New Capital City, Cairo, Egypt',
        project_id: createdProjects[0].project_id, // Link to first project
        manager_id: users[0].account!.account_id,
        is_active: true
      }
    }),
    prisma.site.upsert({
      where: { site_code: 'SITE-002' },
      update: {},
      create: {
        site_code: 'SITE-002',
        name: 'Giza Bridge Project Site',
        description: 'Bridge construction site in Giza',
        address: '456 Giza Corniche, Giza, Egypt',
        project_id: createdProjects[0].project_id, // Same project, different site
        manager_id: users[1].account!.account_id,
        is_active: true
      }
    }),
    prisma.site.upsert({
      where: { site_code: 'SITE-003' },
      update: {},
      create: {
        site_code: 'SITE-003',
        name: 'Alexandria Port Development',
        description: 'Port development project site in Alexandria',
        address: '789 Mediterranean Coast, Alexandria, Egypt',
        project_id: createdProjects[1].project_id, // Link to second project
        manager_id: users[2].account!.account_id,
        is_active: true
      }
    })
  ]);

  // Create some equipment resources specifically
  const equipmentResources = await Promise.all([
    prisma.resource.create({
      data: {
        name: 'Caterpillar 320D Excavator',
        type: 'equipment',
        role: 'Heavy Machinery',
        skills: { 
          category: 'excavation',
          specifications: {
            engine: '6.4L Diesel',
            power: '122 HP',
            weight: '20000 kg',
            bucket_capacity: '1.2 cubic meters'
          }
        },
        rate: 150.0, // per hour
        capacity: 8, // 8 hours per day
        availability_status: 'available',
        department: 'Heavy Equipment',
        location: 'Equipment Yard A - Bay 3'
      }
    }),
    prisma.resource.create({
      data: {
        name: 'Tower Crane TC6013',
        type: 'equipment',
        role: 'Lifting Equipment',
        skills: { 
          category: 'lifting',
          specifications: {
            max_load: '6000 kg',
            jib_length: '60 meters',
            height: '50 meters'
          }
        },
        rate: 200.0, // per hour
        capacity: 12, // 12 hours per day
        availability_status: 'available',
        department: 'Lifting Equipment',
        location: 'Site Storage - Zone B'
      }
    }),
    prisma.resource.create({
      data: {
        name: 'Concrete Mixer CM350',
        type: 'equipment',
        role: 'Construction Vehicle',
        skills: { 
          category: 'concrete',
          specifications: {
            drum_capacity: '8 cubic meters',
            engine: '250 HP',
            fuel_type: 'Diesel'
          }
        },
        rate: 120.0, // per hour
        capacity: 10, // 10 hours per day
        availability_status: 'available',
        department: 'Construction Vehicles',
        location: 'Vehicle Depot - Lane 2'
      }
    })
  ]);

  // Create Equipment Site Logs
  await Promise.all([
    // Log excavator at North Cairo site
    prisma.equipmentSiteLog.create({
      data: {
        resource_id: equipmentResources[0].resource_id, // Excavator
        site_id: sites[0].site_id, // North Cairo site
        logged_in_date: new Date('2024-11-01'),
        logged_out_date: new Date('2024-11-15'),
        usage_hours: 120.5,
        condition_before: 'Good - All systems operational',
        condition_after: 'Good - Minor wear on tracks, maintenance recommended',
        notes: 'Used for foundation excavation work. Performed well throughout the assignment.',
        logged_by: users[0].account!.account_id
      }
    }),
    // Log tower crane at Giza Bridge site (still active)
    prisma.equipmentSiteLog.create({
      data: {
        resource_id: equipmentResources[1].resource_id, // Tower Crane
        site_id: sites[1].site_id, // Giza Bridge site
        logged_in_date: new Date('2024-10-15'),
        logged_out_date: null, // Still assigned
        usage_hours: 240.0,
        condition_before: 'Excellent - Recently serviced',
        condition_after: null,
        notes: 'Currently supporting bridge beam installation. Expected completion in December.',
        logged_by: users[1].account!.account_id
      }
    }),
    // Log concrete mixer at Alexandria site (still active)
    prisma.equipmentSiteLog.create({
      data: {
        resource_id: equipmentResources[2].resource_id, // Concrete Mixer
        site_id: sites[2].site_id, // Alexandria Port site
        logged_in_date: new Date('2024-11-20'),
        logged_out_date: null, // Still assigned
        usage_hours: 85.5,
        condition_before: 'Good - Regular maintenance completed',
        condition_after: null,
        notes: 'Being used for port foundation concrete work. Regular usage expected until January.',
        logged_by: users[2].account!.account_id
      }
    }),
    // Add a historical log showing excavator at different site
    prisma.equipmentSiteLog.create({
      data: {
        resource_id: equipmentResources[0].resource_id, // Same excavator
        site_id: sites[2].site_id, // Alexandria Port site
        logged_in_date: new Date('2024-09-01'),
        logged_out_date: new Date('2024-09-30'),
        usage_hours: 180.0,
        condition_before: 'Good - Pre-assignment inspection passed',
        condition_after: 'Good - Normal wear, no issues reported',
        notes: 'Completed preliminary excavation work for port development phase 1.',
        logged_by: users[2].account!.account_id
      }
    })
  ]);

  // Create Maintenance Schedules for equipment
  const maintenanceSchedules = await Promise.all([
    // Monthly routine maintenance for excavator
    prisma.maintenanceSchedule.create({
      data: {
        resource_id: equipmentResources[0].resource_id, // Excavator
        maintenance_type: 'routine',
        trigger_type: 'time_based',
        trigger_value: '30 days',
        next_due_date: new Date('2024-12-01'),
        status: 'scheduled',
        priority: 'medium',
        description: 'Monthly routine inspection and hydraulic fluid check',
        estimated_hours: 4.0,
        estimated_cost: 800.0
      }
    }),
    // Quarterly inspection for tower crane
    prisma.maintenanceSchedule.create({
      data: {
        resource_id: equipmentResources[1].resource_id, // Tower Crane
        maintenance_type: 'inspection',
        trigger_type: 'regulatory',
        trigger_value: 'quarterly',
        next_due_date: new Date('2024-12-15'),
        status: 'scheduled',
        priority: 'high',
        description: 'Mandatory quarterly safety inspection and certification',
        estimated_hours: 8.0,
        estimated_cost: 2500.0
      }
    }),
    // Usage-based maintenance for concrete mixer
    prisma.maintenanceSchedule.create({
      data: {
        resource_id: equipmentResources[2].resource_id, // Concrete Mixer
        maintenance_type: 'routine',
        trigger_type: 'usage_based',
        trigger_value: '200 hours',
        next_due_date: new Date('2024-12-10'),
        status: 'scheduled',
        priority: 'medium',
        description: 'Engine service and drum cleaning after 200 hours of operation',
        estimated_hours: 6.0,
        estimated_cost: 1200.0
      }
    }),
    // Overdue repair for excavator (for testing overdue scenarios)
    prisma.maintenanceSchedule.create({
      data: {
        resource_id: equipmentResources[0].resource_id, // Excavator
        maintenance_type: 'repair',
        trigger_type: 'condition_based',
        trigger_value: 'track wear',
        next_due_date: new Date('2024-11-25'), // Past due
        status: 'overdue',
        priority: 'high',
        description: 'Track replacement due to excessive wear',
        estimated_hours: 12.0,
        estimated_cost: 5000.0
      }
    })
  ]);

  // Create Maintenance Logs (completed maintenance work)
  await Promise.all([
    // Completed routine maintenance on excavator
    prisma.maintenanceLog.create({
      data: {
        schedule_id: null, // Unscheduled emergency repair
        resource_id: equipmentResources[0].resource_id, // Excavator
        maintenance_type: 'emergency',
        performed_date: new Date('2024-10-20'),
        performed_by: users[3].account!.account_id, // Technician
        work_description: 'Emergency hydraulic leak repair and fluid replacement',
        parts_used: 'Hydraulic seals (x4), hydraulic fluid (20L)',
        labor_hours: 6.5,
        parts_cost: 450.0,
        labor_cost: 650.0,
        total_cost: 1100.0,
        condition_before: 'Fair - Hydraulic leak detected',
        condition_after: 'Good - Leak repaired, system tested',
        next_service_date: new Date('2024-12-01'),
        notes: 'Leak was caused by worn seals. All seals replaced as preventive measure.'
      }
    }),
    // Completed inspection on tower crane
    prisma.maintenanceLog.create({
      data: {
        schedule_id: maintenanceSchedules[1].schedule_id, // Links to quarterly inspection schedule
        resource_id: equipmentResources[1].resource_id, // Tower Crane
        maintenance_type: 'inspection',
        performed_date: new Date('2024-09-15'),
        performed_by: users[4].account!.account_id, // Inspector
        work_description: 'Quarterly safety inspection and load testing',
        parts_used: 'None - inspection only',
        labor_hours: 8.0,
        parts_cost: 0.0,
        labor_cost: 1600.0,
        total_cost: 1600.0,
        condition_before: 'Good - No visible issues',
        condition_after: 'Excellent - All safety checks passed',
        next_service_date: new Date('2024-12-15'),
        notes: 'All safety systems functioning properly. Certification renewed for next quarter.'
      }
    }),
    // Completed routine service on concrete mixer
    prisma.maintenanceLog.create({
      data: {
        schedule_id: maintenanceSchedules[2].schedule_id, // Links to usage-based schedule
        resource_id: equipmentResources[2].resource_id, // Concrete Mixer
        maintenance_type: 'routine',
        performed_date: new Date('2024-10-05'),
        performed_by: users[5].account!.account_id, // Mechanic
        work_description: 'Engine oil change, filter replacement, and drum cleaning',
        parts_used: 'Engine oil (15L), oil filter, air filter, fuel filter',
        labor_hours: 4.0,
        parts_cost: 280.0,
        labor_cost: 400.0,
        total_cost: 680.0,
        condition_before: 'Good - Regular maintenance due',
        condition_after: 'Excellent - Fresh service completed',
        next_service_date: new Date('2024-12-10'),
        notes: 'Regular maintenance completed successfully. Engine running smoothly.'
      }
    }),
    // Compliance maintenance for excavator
    prisma.maintenanceLog.create({
      data: {
        schedule_id: null, // One-time compliance work
        resource_id: equipmentResources[0].resource_id, // Excavator
        maintenance_type: 'compliance',
        performed_date: new Date('2024-09-01'),
        performed_by: users[6].account!.account_id, // Compliance officer
        work_description: 'Annual emissions testing and certification renewal',
        parts_used: 'None - testing only',
        labor_hours: 2.0,
        parts_cost: 0.0,
        labor_cost: 500.0,
        total_cost: 500.0,
        condition_before: 'Good - Ready for compliance check',
        condition_after: 'Good - Emissions compliance verified',
        next_service_date: new Date('2025-09-01'),
        notes: 'Annual emissions test passed. Certificate valid until September 2025.'
      }
    })
  ]);

  // Resource assignments removed - will be created manually as needed

  await prisma.benchmark.createMany({
    data: [
      {
        project_type: 'residential',
        cost_per_m2: 1000,
        duration_per_m2: 0.2,
        expected_roi: 12,
        cost_overrun_max: 10,
        schedule_slip_max: 15,
        cpi_threshold: 0.9,
        spi_threshold: 0.9,
        efficiency_ratio: 1.1,
        avg_task_delay_max: 3,
        critical_path_delay_max: 5,
        expected_task_completion_rate: 90,
        max_budget_threshold_violation: 3
      },
      {
        project_type: 'commercial',
        cost_per_m2: 1400,
        duration_per_m2: 0.25,
        expected_roi: 15,
        cost_overrun_max: 12,
        schedule_slip_max: 18,
        cpi_threshold: 0.88,
        spi_threshold: 0.9,
        efficiency_ratio: 1.15,
        avg_task_delay_max: 4,
        critical_path_delay_max: 6,
        expected_task_completion_rate: 88,
        max_budget_threshold_violation: 4
      },
      {
        project_type: 'infrastructure',
        cost_per_m2: 1200,
        duration_per_m2: 0.3,
        expected_roi: 10,
        cost_overrun_max: 15,
        schedule_slip_max: 20,
        cpi_threshold: 0.85,
        spi_threshold: 0.85,
        efficiency_ratio: 1.2,
        avg_task_delay_max: 5,
        critical_path_delay_max: 8,
        expected_task_completion_rate: 85,
        max_budget_threshold_violation: 5
      },
      {
        project_type: 'healthcare',
        cost_per_m2: 2200,
        duration_per_m2: 0.4,
        expected_roi: 8,
        cost_overrun_max: 10,
        schedule_slip_max: 15,
        cpi_threshold: 0.92,
        spi_threshold: 0.9,
        efficiency_ratio: 1.1,
        avg_task_delay_max: 4,
        critical_path_delay_max: 5,
        expected_task_completion_rate: 90,
        max_budget_threshold_violation: 3
      },
      {
        project_type: 'educational',
        cost_per_m2: 1300,
        duration_per_m2: 0.25,
        expected_roi: 10,
        cost_overrun_max: 8,
        schedule_slip_max: 12,
        cpi_threshold: 0.9,
        spi_threshold: 0.88,
        efficiency_ratio: 1.1,
        avg_task_delay_max: 3,
        critical_path_delay_max: 4,
        expected_task_completion_rate: 92,
        max_budget_threshold_violation: 2
      },
      {
        project_type: 'industrial',
        cost_per_m2: 1100,
        duration_per_m2: 0.18,
        expected_roi: 10,
        cost_overrun_max: 12,
        schedule_slip_max: 18,
        cpi_threshold: 0.87,
        spi_threshold: 0.88,
        efficiency_ratio: 1.15,
        avg_task_delay_max: 4,
        critical_path_delay_max: 6,
        expected_task_completion_rate: 88,
        max_budget_threshold_violation: 4
      },
      {
        project_type: 'government',
        cost_per_m2: 1250,
        duration_per_m2: 0.25,
        expected_roi: 8,
        cost_overrun_max: 10,
        schedule_slip_max: 15,
        cpi_threshold: 0.9,
        spi_threshold: 0.9,
        efficiency_ratio: 1.1,
        avg_task_delay_max: 3,
        critical_path_delay_max: 5,
        expected_task_completion_rate: 90,
        max_budget_threshold_violation: 3
      },
      {
        project_type: 'mixed_use',
        cost_per_m2: 1800,
        duration_per_m2: 0.3,
        expected_roi: 14,
        cost_overrun_max: 15,
        schedule_slip_max: 20,
        cpi_threshold: 0.88,
        spi_threshold: 0.87,
        efficiency_ratio: 1.2,
        avg_task_delay_max: 4,
        critical_path_delay_max: 7,
        expected_task_completion_rate: 87,
        max_budget_threshold_violation: 5
      },
      {
        project_type: 'renovation',
        cost_per_m2: 1000,
        duration_per_m2: 0.15,
        expected_roi: 9,
        cost_overrun_max: 8,
        schedule_slip_max: 10,
        cpi_threshold: 0.92,
        spi_threshold: 0.93,
        efficiency_ratio: 1.05,
        avg_task_delay_max: 2,
        critical_path_delay_max: 2,
        expected_task_completion_rate: 95,
        max_budget_threshold_violation: 1
      },
      {
        project_type: 'religious',
        cost_per_m2: 1600,
        duration_per_m2: 0.35,
        expected_roi: 6,
        cost_overrun_max: 10,
        schedule_slip_max: 15,
        cpi_threshold: 0.9,
        spi_threshold: 0.9,
        efficiency_ratio: 1.1,
        avg_task_delay_max: 3,
        critical_path_delay_max: 4,
        expected_task_completion_rate: 90,
        max_budget_threshold_violation: 2
      }
    ]
  });
  

  console.log('Database has been seeded. 🌱');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });