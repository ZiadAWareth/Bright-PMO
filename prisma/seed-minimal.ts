import { PrismaClient, PortfolioStatus, PortfolioPriority, ProjectStatus, ProjectPriority, ProjectStrategicValue, ProjectType, ResourceType, ResourceAvailabilityStatus, ImpactLevel, ProbabilityLevel, TaskStatus, DependencyType, TaskPriority } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const roles = [
  { 
    name: 'ADMIN', 
    description: 'System Administrator - Full access to all system features', 
    permissions: { all: true } 
  },
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

async function main() {
  // Seed roles (use create, ignore duplicate errors)
  const createdRoles = [];
  for (const role of roles) {
    try {
      const created = await prisma.role.create({ data: role });
      createdRoles.push(created);
    } catch (e: any) {
      if (e.code === 'P2002') { // Unique constraint failed
        const existing = await prisma.role.findFirst({ where: { name: role.name } });
        if (existing) createdRoles.push(existing);
      } else {
        throw e;
      }
    }
  }

  // SYSTEM user
  const systemRole = createdRoles.find(r => r.name === 'SYSTEM');
  if (!systemRole) throw new Error('SYSTEM role not found');
  await prisma.user.upsert({
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
    }
  });

  // Admin user
  const adminRole = createdRoles.find(r => r.name === 'ADMIN');
  if (!adminRole) throw new Error('ADMIN role not found');
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@admin.com',
      password_hash: '$2a$12$NauYzC29LZT7pSH/himheuwORo5CQ5w7y3a.Z7fug6dyPtWkQmvKi', // password: admin
      role_id: adminRole.role_id,
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
    }
  });

  // Arrays for random name generation
  const firstNames = [
    'Ahmed', 'Mohamed', 'Mahmoud', 'Mostafa', 'Hassan', 'Ibrahim', 'Khaled', 'Ali',
    'Fatma', 'Mona', 'Nour', 'Heba', 'Amira', 'Samira', 'Zeinab', 'Aya'
  ];
  const lastNames = [
    'ElSayed', 'AbdelRahman', 'Hassan', 'Ibrahim', 'Mohamed', 'Ali', 'Mahmoud',
    'ElMasry', 'ElShafei', 'ElGamal', 'ElSherif', 'ElBadry', 'ElNaggar'
  ];

  // One user per role (besides SYSTEM and admin)
  let usedUsernames = new Set();
  for (const role of createdRoles) {
    // Skip SYSTEM and admin (already created)
    if (role.name === 'SYSTEM') continue;
    // Generate a realistic username
    let username = '';
    let email = '';
    let tries = 0;
    do {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)].toLowerCase();
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)].toLowerCase();
      const number = Math.floor(Math.random() * 90 + 10); // 2-digit number
      username = `${firstName}.${lastName}${number}`;
      email = `${username}@example.com`;
      tries++;
    } while (usedUsernames.has(username) && tries < 10);
    usedUsernames.add(username);
    const password = await bcrypt.hash('password123', 10);
    await prisma.user.upsert({
      where: { username },
      update: {},
      create: {
        username,
        email,
        password_hash: password,
        role_id: role.role_id,
        status: 'active',
        account: {
          create: {
            first_name: username.split('.')[0].charAt(0).toUpperCase() + username.split('.')[0].slice(1),
            last_name: username.split('.')[1].replace(/[0-9]/g, '').charAt(0).toUpperCase() + username.split('.')[1].replace(/[0-9]/g, '').slice(1),
            department: role.name,
            phone_number: '+201000000000',
            is_active: true
          }
        }
      }
    });
  }

  // Get PMO user's account_id for portfolio manager assignment
  const pmoRole = createdRoles.find(r => r.name === 'PMO');
  if (!pmoRole) throw new Error('PMO role not found');
  const pmoUser = await prisma.user.findFirst({ where: { role_id: pmoRole.role_id }, include: { account: true } });
  if (!pmoUser || !pmoUser.account) throw new Error('PMO user or account not found');

  // Seed 3 EPS entries
  const epsData = [
    { eps_code: 'EPS-001', name: 'Civil Infrastructure', description: 'Roads, bridges, and public utilities projects', level: 1 },
    { eps_code: 'EPS-002', name: 'Building Construction', description: 'Residential, commercial, and industrial building projects', level: 1 },
    { eps_code: 'EPS-003', name: 'Specialized Systems', description: 'MEP (Mechanical, Electrical, Plumbing), HVAC, and smart systems', level: 1 }
  ];
  for (const eps of epsData) {
    try {
      await prisma.ePS.create({ data: eps });
    } catch (e: any) {
      if (e.code !== 'P2002') throw e; // Ignore duplicate
    }
  }

  // Seed 3 portfolios
  const portfolios = [
    {
      name: 'Urban Roads Upgrade',
      description: 'Upgrading and expanding city road networks to improve traffic flow and safety.',
      manager_id: pmoUser.account.account_id,
      status: PortfolioStatus.active,
      priority: PortfolioPriority.high,
      tags: ['roads', 'urban', 'infrastructure'],
      strategic_objective: 'Enhance urban mobility and reduce congestion.'
    },
    {
      name: 'High-Rise Residential Towers',
      description: 'Construction of modern high-rise residential buildings in the city center.',
      manager_id: pmoUser.account.account_id,
      status: PortfolioStatus.active,
      priority: PortfolioPriority.medium,
      tags: ['residential', 'high-rise', 'housing'],
      strategic_objective: 'Increase housing capacity and provide modern living spaces.'
    },
    {
      name: 'Smart Hospital Initiative',
      description: 'Building a new hospital with integrated smart systems for patient care and facility management.',
      manager_id: pmoUser.account.account_id,
      status: PortfolioStatus.active,
      priority: PortfolioPriority.high,
      tags: ['healthcare', 'smart', 'hospital'],
      strategic_objective: 'Improve healthcare delivery through advanced infrastructure.'
    }
  ];
  for (const portfolio of portfolios) {
    try {
      await prisma.portfolio.create({ data: portfolio });
    } catch (e: any) {
      if (e.code !== 'P2002') throw e; // Ignore duplicate
    }
  }

  // Find a PJM user for project creation
  const pjmUser = await prisma.user.findFirst({
    where: { role: { name: 'PJM' }, status: 'active' },
    include: { account: true }
  });
  if (!pjmUser || !pjmUser.account) throw new Error('PJM user or account not found');

  // Get EPS and portfolios
  const allEPS = await prisma.ePS.findMany();
  const allPortfolios = await prisma.portfolio.findMany();
  if (allEPS.length < 3 || allPortfolios.length < 3) throw new Error('Not enough EPS or portfolios');

  // Project data - FIXED with must_finish_by_date
  const projectData = [
    {
      name: 'Central Hospital Expansion',
      description: 'Expansion of the Central Hospital to add new surgical and emergency facilities.',
      status: ProjectStatus.planning,
      start_date: new Date('2025-06-01'),
      planned_end_date: new Date('2026-06-01'),
      must_finish_by_date: new Date('2026-08-01'), // Added required field
      actual_end_date: null,
      budget_amount: 22000000,
      actual_cost: 0,
      progress_percentage: 0,
      eps_level_id: allEPS[2].eps_id,
      portfolio_id: allPortfolios[2].portfolio_id,
      client: 'Health Ministry',
      location: 'Central City',
      expected_roi: 10.0,
      priority: ProjectPriority.high,
      strategicValue: ProjectStrategicValue.high,
      type: ProjectType.healthcare,
      size: 15000,
    }
  ];

  for (let i = 0; i < projectData.length; i++) {
    const data = projectData[i];
    // Generate a project code
    const project_code = `PROJ-${Date.now()}-${i+1}`;
    // Create the project - FIXED field names
    const project = await prisma.project.create({
      data: {
        project_code,
        name: data.name,
        description: data.description,
        start_date: data.start_date,
        planned_end_date: data.planned_end_date,
        must_finish_by_date: data.must_finish_by_date, // Added this
        // actual_end_date: data.actual_end_date, // Remove null values for optional fields
        status: data.status,
        budget_amount: data.budget_amount,
        actual_cost: data.actual_cost,
        progress_percentage: data.progress_percentage,
        created_by: pmoUser.user_id,
        eps_level_id: data.eps_level_id,
        portfolio_id: data.portfolio_id,
        client: data.client,
        location: data.location,
        expected_roi: data.expected_roi,
        priority: data.priority,
        strategicValue: data.strategicValue,
        type: data.type,
        size: data.size,
        manager_id: pjmUser.user_id,
      }
    });
    // Add the creator as a team member
    await prisma.projectTeamMember.create({
      data: {
        project_id: project.project_id,
        user_id: pjmUser.user_id,
        role: 'Project Manager',
        department: 'Project Management',
        workload: 100,
        is_lead: true
      }
    });
    // Create budget
    await prisma.budget.create({
      data: {
        project_id: project.project_id,
        cost_type: 'Total Project Budget',
        planned_amount: data.budget_amount,
        actual_amount: data.actual_cost,
        variance: data.budget_amount - data.actual_cost,
        threshold: 0,
        fiscal_year: data.start_date.getFullYear(),
        fiscal_period: 'Q1'
      }
    });
    // ProjectSetup
    if (data.status === ProjectStatus.planning) { // Use enum value
      await prisma.projectSetup.create({
        data: {
          project_id: project.project_id,
          wbs: false,
          schedule: false,
          budget: false,
          team: false,
          risk: false,
          baseline: false,
          execution: false
        }
      });
    } else {
      await prisma.projectSetup.create({
        data: {
          project_id: project.project_id,
          wbs: true,
          schedule: true,
          budget: true,
          team: true,
          risk: true,
          baseline: true,
          execution: true
        }
      });
      // WBS (level 0)
      const wbs0 = await prisma.wBS.create({
        data: {
          wbs_code: `WBS-0-${project.project_id}`,
          name: 'Root WBS',
          description: 'Project Management Activities',
          project_id: project.project_id,
          level: 0,
          progress_percentage: 0,
          start_date: data.start_date,
          end_date: data.planned_end_date
        }
      });
      // WBS Item for level 0
      await prisma.wBSItem.create({
        data: {
          wbs_item_code: `WBSItem-001-PLANNING`,
          name: 'Project Planning',
          description: 'Initial Project Planning Activities',
          start_date: data.start_date,
          end_date: data.planned_end_date,
          budget_amount: data.budget_amount * 0.1,
          actual_cost: 0,
          progress_percentage: 0,
          wbs_id: wbs0.wbs_id
        }
      });
      // WBS (level 1)
      const level1Names = [
        'Design & Planning',
        'Procurement',
        'Execution',
        'Testing & Commissioning',
        'Handover & Closeout'
      ];
      for (let idx = 0; idx < level1Names.length; idx++) {
        await prisma.wBS.create({
          data: {
            wbs_code: `WBS-1-${project.project_id}-${idx+1}`,
            name: level1Names[idx],
            description: `${level1Names[idx]} phase`,
            project_id: project.project_id,
            parent_wbs_id: wbs0.wbs_id,
            level: 1,
            progress_percentage: 0,
            start_date: data.start_date,
            end_date: data.planned_end_date
          }
        });
      }
    }
  }

  // Seed 8 realistic construction resources
  const resourceData = [
    {
      name: 'Excavator CAT 320D',
      type: ResourceType.equipment,
      role: 'Excavation',
      skills: { category: 'earthwork', specifications: { engine: '6.4L Diesel', power: '122 HP', weight: '20,000 kg' } },
      rating: 4,
      rate: 150.0,
      capacity: 8,
      availability_status: ResourceAvailabilityStatus.available,
      department: 'Heavy Equipment',
      location: 'Equipment Yard A - Bay 3',
      phone_number: null,
      email: null
    },
    {
      name: 'Tower Crane TC6013',
      type: ResourceType.equipment,
      role: 'Lifting',
      skills: { category: 'lifting', specifications: { max_load: '6,000 kg', jib_length: '60 m', height: '50 m' } },
      rating: 5,
      rate: 200.0,
      capacity: 12,
      availability_status: ResourceAvailabilityStatus.available,
      department: 'Lifting Equipment',
      location: 'Site Storage - Zone B',
      phone_number: null,
      email: null
    },
    {
      name: 'Concrete Mixer CM350',
      type: ResourceType.equipment,
      role: 'Concrete Mixing',
      skills: { category: 'concrete', specifications: { drum_capacity: '8 m3', engine: '250 HP', fuel_type: 'Diesel' } },
      rating: 4,
      rate: 120.0,
      capacity: 10,
      availability_status: ResourceAvailabilityStatus.available,
      department: 'Construction Vehicles',
      location: 'Vehicle Depot - Lane 2',
      phone_number: null,
      email: null
    },
    {
      name: 'Steel Rebar (T12)',
      type: ResourceType.material,
      role: 'Reinforcement',
      skills: { grade: 'B500B', diameter: '12mm' },
      rating: 5,
      rate: 0.8,
      capacity: 10000,
      availability_status: ResourceAvailabilityStatus.available,
      department: 'Materials',
      location: 'Material Yard - Stack 5',
      phone_number: null,
      email: null
    },
    {
      name: 'Ready-Mix Concrete',
      type: ResourceType.material,
      role: 'Concrete',
      skills: { grade: 'C30/37', slump: 'S3' },
      rating: 4,
      rate: 75.0,
      capacity: 500,
      availability_status: ResourceAvailabilityStatus.available,
      department: 'Materials',
      location: 'Batch Plant 1',
      phone_number: null,
      email: null
    },
    {
      name: 'Site Engineer',
      type: ResourceType.labor,
      role: 'Engineering',
      skills: { technical: true, management: true, certifications: ['BSc Civil Engineering'] },
      rating: 5,
      rate: 60.0,
      capacity: 8,
      availability_status: ResourceAvailabilityStatus.available,
      department: 'Engineering',
      phone_number: '+201234567890',
      email: null,
      location: null
    },
    {
      name: 'Foreman',
      type: ResourceType.labor,
      role: 'Supervision',
      skills: { technical: true, experience: '10 years' },
      rating: 4,
      rate: 45.0,
      capacity: 8,
      availability_status: ResourceAvailabilityStatus.available,
      department: 'Site Management',
      phone_number: '+201234567891',
      email: null,
      location: null
    },
    {
      name: 'Mason',
      type: ResourceType.labor,
      role: 'Masonry',
      skills: { technical: true, experience: '5 years' },
      rating: 3,
      rate: 35.0,
      capacity: 8,
      availability_status: ResourceAvailabilityStatus.available,
      department: 'Construction Crew',
      phone_number: '+201234567892',
      email: null,
      location: null
    }
  ];
  for (const resource of resourceData) {
    await prisma.resource.create({ data: resource });
  }

  // --- BEGIN: Fully detailed completed project seed ---
  // 1. Create a new completed project - FIXED
  const completedProjectBudget = 1000000;
  const completedProject = await prisma.project.create({
    data: {
      project_code: `PROJ-${Date.now()}-COMPLETE`,
      name: 'Metro Line Extension',
      description: 'Extension of the city metro line with new stations and tunnels.',
      start_date: new Date('2024-01-01'),
      planned_end_date: new Date('2024-12-31'),
      must_finish_by_date: new Date('2025-01-31'), // Added required field
      actual_end_date: new Date('2025-01-15'), // late
      status: ProjectStatus.completed,
      budget_amount: completedProjectBudget,
      actual_cost: 980000,
      progress_percentage: 100,
      created_by: pmoUser.user_id,
      eps_level_id: allEPS[0].eps_id,
      portfolio_id: allPortfolios[0].portfolio_id,
      client: 'City Transit Authority',
      location: 'Metro District',
      expected_roi: 9.5,
      priority: ProjectPriority.high,
      strategicValue: ProjectStrategicValue.high,
      type: ProjectType.infrastructure,
      size: 20000,
      manager_id: pjmUser.user_id,
    }
  });

  // 2. Team: 4 users (including lead)
  const teamUsers = await prisma.user.findMany({ take: 4, where: { status: 'active' } });
  const teamAssignments = [];
  for (let i = 0; i < teamUsers.length; i++) {
    teamAssignments.push(await prisma.projectTeamMember.create({
      data: {
        project_id: completedProject.project_id,
        user_id: teamUsers[i].user_id,
        workload: i === 0 ? 100 : 50,
        is_lead: i === 0,
        role: i === 0 ? 'Project Manager' : 'Engineer',
        department: i === 0 ? 'Management' : 'Engineering',
      }
    }));
  }

  // 3. WBS: Level 0 (root) and Level 1 phases
  const wbsRoot = await prisma.wBS.create({
    data: {
      wbs_code: `WBS-0-${completedProject.project_id}`,
      name: 'Root WBS',
      description: 'Project Management Activities',
      project_id: completedProject.project_id,
      level: 0,
      progress_percentage: 100,
      start_date: completedProject.start_date,
      end_date: completedProject.planned_end_date
    }
  });

  // WBS budgets
  const wbsRootBudget = await prisma.budget.create({
    data: {
      project_id: completedProject.project_id,
      wbs_id: wbsRoot.wbs_id,
      cost_type: 'General',
      planned_amount: completedProjectBudget,
      actual_amount: 980000,
      variance: completedProjectBudget - 980000,
      threshold: 0,
      fiscal_year: completedProject.start_date.getFullYear(),
      fiscal_period: 'Q1'
    }
  });

  // Level 1 phases (sum of budgets ≤ root)
  const phaseBudgets = [350000, 300000, 200000, 100000];
  const phaseNames = ['Design & Planning', 'Construction', 'Testing & Commissioning', 'Handover'];
  const wbsPhases = [];
  for (let i = 0; i < phaseNames.length; i++) {
    wbsPhases.push(await prisma.wBS.create({
      data: {
        wbs_code: `WBS-1-${completedProject.project_id}-${i+1}`,
        name: phaseNames[i],
        description: `${phaseNames[i]} phase`,
        project_id: completedProject.project_id,
        parent_wbs_id: wbsRoot.wbs_id,
        level: 1,
        progress_percentage: 100,
        start_date: completedProject.start_date,
        end_date: completedProject.planned_end_date
      }
    }));
    await prisma.budget.create({
      data: {
        project_id: completedProject.project_id,
        wbs_id: wbsPhases[i].wbs_id,
        cost_type: 'General',
        planned_amount: phaseBudgets[i],
        actual_amount: phaseBudgets[i] - 10000,
        variance: 10000,
        threshold: 0,
        fiscal_year: completedProject.start_date.getFullYear(),
        fiscal_period: 'Q1'
      }
    });
  }

  // 4. Tasks: Multiple per WBS, with critical path, milestone, late
  const taskTemplates = [
    // Design & Planning
    {
      wbs: 0, name: 'Preliminary Design', is_critical_path: true, is_milestone: false, late: false, budget: 100000, est: 200, act: 200
    },
    {
      wbs: 0, name: 'Final Design Approval', is_critical_path: false, is_milestone: true, late: false, budget: 80000, est: 120, act: 120
    },
    // Construction
    {
      wbs: 1, name: 'Tunnel Excavation', is_critical_path: true, is_milestone: false, late: true, budget: 120000, est: 300, act: 320
    },
    {
      wbs: 1, name: 'Track Laying', is_critical_path: false, is_milestone: false, late: false, budget: 100000, est: 250, act: 250
    },
    // Testing & Commissioning
    {
      wbs: 2, name: 'System Integration Test', is_critical_path: true, is_milestone: false, late: false, budget: 70000, est: 100, act: 100
    },
    {
      wbs: 2, name: 'Safety Certification', is_critical_path: false, is_milestone: true, late: false, budget: 60000, est: 80, act: 80
    },
    // Handover
    {
      wbs: 3, name: 'Final Inspection', is_critical_path: false, is_milestone: false, late: false, budget: 50000, est: 60, act: 60
    },
    {
      wbs: 3, name: 'Project Handover', is_critical_path: false, is_milestone: true, late: false, budget: 50000, est: 40, act: 40
    }
  ];
  const allTasks = [];
  for (let i = 0; i < taskTemplates.length; i++) {
    const t = taskTemplates[i];
    const wbs = wbsPhases[t.wbs];
    const plannedStart = new Date(completedProject.start_date.getTime() + i * 10 * 24 * 60 * 60 * 1000);
    const plannedEnd = new Date(plannedStart.getTime() + t.est * 24 * 60 * 60 * 1000);
    const actualEnd = t.late ? new Date(plannedEnd.getTime() + 7 * 24 * 60 * 60 * 1000) : plannedEnd;
    const task = await prisma.task.create({
      data: {
        name: t.name,
        description: `${t.name} for ${phaseNames[t.wbs]}`,
        wbs_id: wbs.wbs_id,
        start_date: plannedStart,
        end_date: plannedEnd,
        actual_start_date: plannedStart,
        actual_end_date: actualEnd,
        duration: t.est,
        progress_percentage: 100,
        is_milestone: t.is_milestone,
        is_critical_path: t.is_critical_path,
        priority: TaskPriority.high, // Fixed enum
        status: TaskStatus.completed, // Fixed enum
        created_by: teamUsers[0].user_id,
        estimated_hours: t.est,
        actual_hours: t.act,
        work_package: phaseNames[t.wbs]
      }
    });
    await prisma.budget.create({
      data: {
        project_id: completedProject.project_id,
        wbs_id: wbs.wbs_id,
        task_id: task.task_id,
        cost_type: 'TASK_BUDGET',
        planned_amount: t.budget,
        actual_amount: t.budget - 5000,
        variance: 5000,
        threshold: 0,
        fiscal_year: completedProject.start_date.getFullYear(),
        fiscal_period: 'Q1'
      }
    });
    allTasks.push(task);
  }

  // Add task dependencies for the completed project
  // Create logical dependencies: each task depends on the previous one in the same WBS
  // and some cross-WBS dependencies
  const completedTaskDependencies = [
    // Design dependencies
    { predecessor: 0, successor: 1, type: DependencyType.finish_to_start, lag: 0 }, // Preliminary Design -> Final Design Approval
    
    // Construction dependencies  
    { predecessor: 1, successor: 2, type: DependencyType.finish_to_start, lag: 5 }, // Final Design Approval -> Tunnel Excavation
    { predecessor: 2, successor: 3, type: DependencyType.finish_to_start, lag: 0 }, // Tunnel Excavation -> Track Laying
    
    // Testing dependencies
    { predecessor: 3, successor: 4, type: DependencyType.finish_to_start, lag: 0 }, // Track Laying -> System Integration Test
    { predecessor: 4, successor: 5, type: DependencyType.finish_to_start, lag: 0 }, // System Integration Test -> Safety Certification
    
    // Handover dependencies
    { predecessor: 5, successor: 6, type: DependencyType.finish_to_start, lag: 0 }, // Safety Certification -> Final Inspection
    { predecessor: 6, successor: 7, type: DependencyType.finish_to_start, lag: 0 }, // Final Inspection -> Project Handover
  ];

  for (const dep of completedTaskDependencies) {
    await prisma.taskDependency.create({
      data: {
        predecessor_task_id: allTasks[dep.predecessor].task_id,
        successor_task_id: allTasks[dep.successor].task_id,
        dependency_type: dep.type,
        lag_time: dep.lag,
      }
    });
  }

  // 5. Assign users to tasks
  for (const task of allTasks) {
    await prisma.taskAssignment.create({
      data: {
        task_id: task.task_id,
        user_id: teamUsers[0].user_id
      }
    });
  }

  // 6. Assign resources to tasks and create field data
  const allResources = await prisma.resource.findMany({ take: 4 });
  for (let i = 0; i < allTasks.length; i++) {
    const task = allTasks[i];
    const resource = allResources[i % allResources.length];
    // Create resource assignment
    const assignment = await prisma.resourceAssignment.create({
      data: {
        resource_id: resource.resource_id,
        task_id: task.task_id,
        allocation_percentage: 100,
        start_date: task.start_date,
        end_date: task.actual_end_date ?? task.end_date,
        progress: 100,
        planned_hours: task.estimated_hours,
        actual_hours: task.actual_hours
      }
    });
    // Create field data entries (simulate progress in 2 steps)
    await prisma.fieldData.create({
      data: {
        task_id: task.task_id,
        resource_assignment_id: assignment.assignment_id,
        reported_by: teamAssignments[0].user_id, // lead
        actual_progress: 60,
        actual_hours: Math.round(task.actual_hours * 0.6),
        notes: 'Initial progress',
        is_according_to_plan: true,
        timestamp: new Date((task.start_date!.getTime() + (task.estimated_hours / 2) * 24 * 60 * 60 * 1000))
      }
    });
    await prisma.fieldData.create({
      data: {
        task_id: task.task_id,
        resource_assignment_id: assignment.assignment_id,
        reported_by: teamAssignments[0].user_id, // lead
        actual_progress: 40,
        actual_hours: Math.round(task.actual_hours * 0.4),
        notes: 'Final progress',
        is_according_to_plan: !taskTemplates[i].late,
        timestamp: new Date(task.actual_end_date ?? new Date())
      }
    });
  }

  // 7. Add a risk - FIXED enum
  await prisma.risk.create({
    data: {
      project_id: completedProject.project_id,
      name: 'Geotechnical Uncertainty',
      description: 'Unexpected soil conditions encountered during tunneling.',
      impact: ImpactLevel.high,
      riskScore: 8,
      category: 'technical',
      identified_date: new Date('2024-01-10'),
      probability: ProbabilityLevel.medium,
      riskLevel: 'high',
      status: 'closed',
      owner_id: teamUsers[1].user_id,
      approvalStatus: 'Approved for Mitigation',
      currentStatus: 'Closed'
    }
  });

  // 8. ProjectSetup: all flags true
  await prisma.projectSetup.create({
    data: {
      project_id: completedProject.project_id,
      wbs: true,
      schedule: true,
      budget: true,
      team: true,
      risk: true,
      baseline: true,
      execution: true
    }
  });
  // --- END: Fully detailed completed project seed ---

  // --- BEGIN: Fully detailed execution project seed ---
  // 1. Create a new execution project
  const executionProjectBudget = 1200000;
  const executionProject = await prisma.project.create({
    data: {
      project_code: `PROJ-${Date.now()}-EXECUTION`,
      name: 'Airport Terminal Expansion',
      description: 'Expansion of the international airport terminal with new gates and facilities.',
      start_date: new Date('2025-03-01'),
      planned_end_date: new Date('2026-02-28'),
      actual_end_date: null,
      status: ProjectStatus.execution,
      budget_amount: executionProjectBudget,
      actual_cost: 650000,
      progress_percentage: 0, // will update after WBS/tasks
      created_by: pmoUser.user_id,
      eps_level_id: allEPS[1].eps_id,
      portfolio_id: allPortfolios[1].portfolio_id,
      client: 'Civil Aviation Authority',
      location: 'International Airport',
      expected_roi: 11.0,
      priority: ProjectPriority.high,
      strategicValue: ProjectStrategicValue.medium,
      type: ProjectType.infrastructure,
      size: 25000,
      manager_id: pjmUser.user_id,
    }
  });

  // 2. Team: 4 users (including lead)
  const execTeamUsers = await prisma.user.findMany({ take: 4, where: { status: 'active' } });
  const execTeamAssignments = [];
  for (let i = 0; i < execTeamUsers.length; i++) {
    execTeamAssignments.push(await prisma.projectTeamMember.create({
      data: {
        project_id: executionProject.project_id,
        user_id: execTeamUsers[i].user_id,
        workload: i === 0 ? 100 : 50,
        is_lead: i === 0,
        role: i === 0 ? 'Project Manager' : 'Engineer',
        department: i === 0 ? 'Management' : 'Engineering',
      }
    }));
  }

  // 3. WBS: Level 0 (root) and Level 1 phases
  const execWbsRoot = await prisma.wBS.create({
    data: {
      wbs_code: `WBS-0-${executionProject.project_id}`,
      name: 'Root WBS',
      description: 'Project Management Activities',
      project_id: executionProject.project_id,
      level: 0,
      progress_percentage: 0, // will update after tasks
      start_date: executionProject.start_date,
      end_date: executionProject.planned_end_date
    }
  });
  // WBS budgets
  const execWbsRootBudget = await prisma.budget.create({
    data: {
      project_id: executionProject.project_id,
      wbs_id: execWbsRoot.wbs_id,
      cost_type: 'General',
      planned_amount: executionProjectBudget,
      actual_amount: 650000,
      variance: executionProjectBudget - 650000,
      threshold: 0,
      fiscal_year: executionProject.start_date.getFullYear(),
      fiscal_period: 'Q1'
    }
  });
  // Level 1 phases (sum of budgets ≤ root)
  const execPhaseBudgets = [400000, 350000, 250000, 150000];
  const execPhaseNames = ['Design & Planning', 'Construction', 'Systems Installation', 'Commissioning'];
  const execWbsPhases = [];
  for (let i = 0; i < execPhaseNames.length; i++) {
    execWbsPhases.push(await prisma.wBS.create({
      data: {
        wbs_code: `WBS-1-${executionProject.project_id}-${i+1}`,
        name: execPhaseNames[i],
        description: `${execPhaseNames[i]} phase`,
        project_id: executionProject.project_id,
        parent_wbs_id: execWbsRoot.wbs_id,
        level: 1,
        progress_percentage: 0, // will update after tasks
        start_date: executionProject.start_date,
        end_date: executionProject.planned_end_date
      }
    }));
    await prisma.budget.create({
      data: {
        project_id: executionProject.project_id,
        wbs_id: execWbsPhases[i].wbs_id,
        cost_type: 'General',
        planned_amount: execPhaseBudgets[i],
        actual_amount: execPhaseBudgets[i] - 20000,
        variance: 20000,
        threshold: 0,
        fiscal_year: executionProject.start_date.getFullYear(),
        fiscal_period: 'Q1'
      }
    });
  }

  // 4. Tasks: Multiple per WBS, with critical path, milestone, late, on-time, unfinished, and mixed statuses
  const execTaskTemplates = [
    // Design & Planning
    { wbs: 0, name: 'Conceptual Design', is_critical_path: true, is_milestone: false, status: TaskStatus.completed, overdue: false, budget: 120000, est: 180, act: 180, intendedProgress: 100 },
    { wbs: 0, name: 'Preliminary Approvals', is_critical_path: false, is_milestone: true, status: TaskStatus.completed, overdue: true, budget: 90000, est: 100, act: 120, intendedProgress: 100 },
    { wbs: 0, name: 'Detailed Design', is_critical_path: true, is_milestone: false, status: TaskStatus.in_progress, overdue: false, budget: 110000, est: 150, act: 80, intendedProgress: 53 },
    // Construction
    { wbs: 1, name: 'Foundation Works', is_critical_path: true, is_milestone: false, status: TaskStatus.completed, overdue: true, budget: 150000, est: 250, act: 270, intendedProgress: 100 },
    { wbs: 1, name: 'Steel Structure Erection', is_critical_path: false, is_milestone: false, status: TaskStatus.in_progress, overdue: false, budget: 120000, est: 200, act: 100, intendedProgress: 50 },
    { wbs: 1, name: 'Concrete Pouring', is_critical_path: false, is_milestone: true, status: TaskStatus.on_hold, overdue: false, budget: 80000, est: 90, act: 30, intendedProgress: 33 },
    { wbs: 1, name: 'Masonry Works', is_critical_path: false, is_milestone: false, status: TaskStatus.in_progress, overdue: false, budget: 90000, est: 120, act: 60, intendedProgress: 50 },
    // Systems Installation
    { wbs: 2, name: 'HVAC System Install', is_critical_path: true, is_milestone: false, status: TaskStatus.in_progress, overdue: false, budget: 90000, est: 120, act: 60, intendedProgress: 50 },
    { wbs: 2, name: 'Fire Alarm System', is_critical_path: false, is_milestone: true, status: TaskStatus.completed, overdue: false, budget: 80000, est: 80, act: 80, intendedProgress: 100 },
    { wbs: 2, name: 'Electrical Wiring', is_critical_path: true, is_milestone: false, status: TaskStatus.in_progress, overdue: false, budget: 70000, est: 100, act: 40, intendedProgress: 40 },
    // Commissioning
    { wbs: 3, name: 'System Testing', is_critical_path: true, is_milestone: false, status: TaskStatus.in_progress, overdue: false, budget: 70000, est: 60, act: 30, intendedProgress: 50 },
    { wbs: 3, name: 'Operational Readiness', is_critical_path: false, is_milestone: true, status: TaskStatus.on_hold, overdue: false, budget: 60000, est: 40, act: 10, intendedProgress: 25 },
    { wbs: 3, name: 'Final Inspection', is_critical_path: false, is_milestone: false, status: TaskStatus.completed, overdue: false, budget: 20000, est: 30, act: 30, intendedProgress: 100 },
    { wbs: 3, name: 'Handover', is_critical_path: false, is_milestone: true, status: TaskStatus.in_progress, overdue: true, budget: 20000, est: 20, act: 25, intendedProgress: 80 }
  ];
  const execAllTasks = [];
  const execAllResources = await prisma.resource.findMany({ take: 4 });
  const execTaskProgresses = [];
  for (let i = 0; i < execTaskTemplates.length; i++) {
    const t = execTaskTemplates[i];
    const wbs = execWbsPhases[t.wbs];
    const plannedStart = new Date(executionProject.start_date.getTime() + i * 10 * 24 * 60 * 60 * 1000);
    const plannedEnd = new Date(plannedStart.getTime() + t.est * 24 * 60 * 60 * 1000);
    const actualEnd = t.overdue ? new Date(plannedEnd.getTime() + 7 * 24 * 60 * 60 * 1000) : null;
    // Assign 2 resources per task
    const allocations = [0.6, 0.4];
    const resourceIds = [execAllResources[i % execAllResources.length].resource_id, execAllResources[(i+1) % execAllResources.length].resource_id];
    // Create the task first
    const task = await prisma.task.create({
      data: {
        name: t.name,
        description: `${t.name} for ${execPhaseNames[t.wbs]}`,
        wbs_id: wbs.wbs_id,
        start_date: plannedStart,
        end_date: plannedEnd,
        actual_start_date: plannedStart,
        actual_end_date: actualEnd,
        duration: t.est,
        progress_percentage: 0, // will update after resource assignments
        is_milestone: t.is_milestone,
        is_critical_path: t.is_critical_path,
        priority: ProjectPriority.high,
        status: t.status,
        created_by: execTeamUsers[0].user_id,
        estimated_hours: t.est,
        actual_hours: t.act,
        work_package: execPhaseNames[t.wbs]
      }
    });
    // Now create resource assignments with the correct task_id
    let weightedProgress = 0;
    let resourceAssignments = [];
    // Calculate resource progress so weighted sum matches intendedProgress
    // For simplicity, set both resource progresses to intendedProgress
    for (let j = 0; j < 2; j++) {
      const resourceProgress = t.intendedProgress;
      weightedProgress += allocations[j] * resourceProgress;
      const assignment = await prisma.resourceAssignment.create({
        data: {
          resource_id: resourceIds[j],
          task_id: task.task_id,
          allocation_percentage: allocations[j] * 100,
          start_date: plannedStart,
          end_date: actualEnd ?? plannedEnd,
          progress: resourceProgress,
          planned_hours: t.est * allocations[j],
          actual_hours: t.act * allocations[j]
        }
      });
      resourceAssignments.push(assignment);
    }
    // Create field data for each resource assignment
    for (let j = 0; j < 2; j++) {
      await prisma.fieldData.create({
        data: {
          task_id: task.task_id,
          resource_assignment_id: resourceAssignments[j].assignment_id,
          reported_by: execTeamAssignments[0].user_id, // lead
          actual_progress: t.intendedProgress,
          actual_hours: Math.round(t.act * allocations[j] * 0.6),
          notes: 'Initial progress',
          is_according_to_plan: true,
          timestamp: new Date((plannedStart.getTime() + (t.est * allocations[j] / 2) * 24 * 60 * 60 * 1000))
        }
      });
      await prisma.fieldData.create({
        data: {
          task_id: task.task_id,
          resource_assignment_id: resourceAssignments[j].assignment_id,
          reported_by: execTeamAssignments[0].user_id, // lead
          actual_progress: t.intendedProgress,
          actual_hours: Math.round(t.act * allocations[j] * 0.4),
          notes: 'Final progress',
          is_according_to_plan: !t.overdue,
          timestamp: new Date((actualEnd ?? plannedEnd))
        }
      });
    }
    // Update the task's progress_percentage to the weighted value
    await prisma.task.update({
      where: { task_id: task.task_id },
      data: { progress_percentage: Math.round(weightedProgress) }
    });
    execAllTasks.push(task);
    execTaskProgresses.push({ wbsIdx: t.wbs, progress: Math.round(weightedProgress), budget: t.budget });
  }

  // 5. Assign users to tasks
  for (const task of execAllTasks) {
    await prisma.taskAssignment.create({
      data: {
        task_id: task.task_id,
        user_id: execTeamUsers[0].user_id
      }
    });
  }

  // 6. WBS progress: budget-weighted average of tasks
  for (let i = 0; i < execWbsPhases.length; i++) {
    const tasksForWbs = execTaskProgresses.filter(t => t.wbsIdx === i);
    const totalBudget = tasksForWbs.reduce((sum, t) => sum + t.budget, 0);
    const wbsProgress = tasksForWbs.reduce((sum, t) => sum + t.progress * t.budget, 0) / (totalBudget || 1);
    await prisma.wBS.update({
      where: { wbs_id: execWbsPhases[i].wbs_id },
      data: { progress_percentage: Math.round(wbsProgress) }
    });
    execWbsPhases[i].progress_percentage = Math.round(wbsProgress);
  }
  // 7. Project progress: budget-weighted average of WBS
  const totalWbsBudget = execPhaseBudgets.reduce((sum, b) => sum + b, 0);
  const projectProgress = execWbsPhases.reduce((sum, wbs, i) => sum + wbs.progress_percentage * execPhaseBudgets[i], 0) / (totalWbsBudget || 1);
  await prisma.project.update({
    where: { project_id: executionProject.project_id },
    data: { progress_percentage: Math.round(projectProgress) }
  });

  // 8. Add a risk
  await prisma.risk.create({
    data: {
      project_id: executionProject.project_id,
      name: 'Material Supply Delay',
      description: 'Delays in delivery of imported construction materials.',
      impact: ImpactLevel.medium,
      riskScore: 6,
      category: 'external',
      identified_date: new Date('2025-04-10'),
      probability: ProbabilityLevel.high,
      riskLevel: 'medium',
      status: 'identified',
      owner_id: execTeamUsers[1].user_id,
      approvalStatus: 'Pending',
      currentStatus: 'Open'
    }
  });

  // 9. ProjectSetup: all flags true
  await prisma.projectSetup.create({
    data: {
      project_id: executionProject.project_id,
      wbs: true,
      schedule: true,
      budget: true,
      team: true,
      risk: true,
      baseline: true,
      execution: true
    }
  });

  // Add task dependencies for the execution project
  // Create logical dependencies across phases and within phases
  const executionTaskDependencies = [
    // Design & Planning dependencies (indices 0-2)
    { predecessor: 0, successor: 1, type: DependencyType.finish_to_start, lag: 0 }, // Conceptual Design -> Preliminary Approvals
    { predecessor: 1, successor: 2, type: DependencyType.finish_to_start, lag: 0 }, // Preliminary Approvals -> Detailed Design
    
    // Construction dependencies (indices 3-6)
    { predecessor: 2, successor: 3, type: DependencyType.finish_to_start, lag: 5 }, // Detailed Design -> Foundation Works
    { predecessor: 3, successor: 4, type: DependencyType.finish_to_start, lag: 0 }, // Foundation Works -> Steel Structure
    { predecessor: 4, successor: 5, type: DependencyType.finish_to_start, lag: 0 }, // Steel Structure -> Concrete Pouring
    { predecessor: 4, successor: 6, type: DependencyType.finish_to_start, lag: 2 }, // Steel Structure -> Masonry Works
    
    // Systems Installation dependencies (indices 7-9)
    { predecessor: 5, successor: 7, type: DependencyType.finish_to_start, lag: 0 }, // Concrete Pouring -> HVAC System
    { predecessor: 6, successor: 8, type: DependencyType.finish_to_start, lag: 0 }, // Masonry Works -> Fire Alarm System
    { predecessor: 7, successor: 9, type: DependencyType.finish_to_start, lag: 0 }, // HVAC System -> Electrical Wiring
    
    // Commissioning dependencies (indices 10-13)
    { predecessor: 8, successor: 10, type: DependencyType.finish_to_start, lag: 0 }, // Fire Alarm -> System Testing
    { predecessor: 9, successor: 10, type: DependencyType.finish_to_start, lag: 0 }, // Electrical Wiring -> System Testing
    { predecessor: 10, successor: 11, type: DependencyType.finish_to_start, lag: 0 }, // System Testing -> Operational Readiness
    { predecessor: 11, successor: 12, type: DependencyType.finish_to_start, lag: 0 }, // Operational Readiness -> Final Inspection
    { predecessor: 12, successor: 13, type: DependencyType.finish_to_start, lag: 0 }, // Final Inspection -> Handover
  ];

  // Create execution task dependencies
  for (const dep of executionTaskDependencies) {
    await prisma.taskDependency.create({
      data: {
        predecessor_task_id: execAllTasks[dep.predecessor].task_id,
        successor_task_id: execAllTasks[dep.successor].task_id,
        dependency_type: dep.type,
        lag_time: dep.lag,
      },
    });
  }

  // --- END: Fully detailed execution project seed ---

  // Seed Benchmarks
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

  console.log('Minimal seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });