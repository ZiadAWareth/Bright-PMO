import swaggerJsdoc from 'swagger-jsdoc';
const { version } = require('../package.json');

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Project Management API Documentation',
      version,
      description: 'API documentation for the Project Management application',
      license: {
        name: 'MIT',
      },
      contact: {
        name: 'Support',
        email: 'support@example.com',
      },
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://yourproductionurl.com' 
          : 'http://localhost:3000',
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
      },
    ],
    tags: [
      {
        name: 'Alerts',
        description: 'API endpoints for alert management'
      },
      {
        name: 'Approvals',
        description: 'API endpoints for approval management'
      },
      {
        name: 'Authentication',
        description: 'API endpoints for user authentication'
      },
      {
        name: 'Baselines',
        description: 'API endpoints for baseline management'
      },
      {
        name: 'Budgets',
        description: 'API endpoints for budget management'
      },
      {
        name: 'Contracts',
        description: 'API endpoints for contract management'
      },
      {
        name: 'Documents',
        description: 'API endpoints for document management'
      },
      {
        name: 'EPS',
        description: 'API endpoints for EPS management'
      },
      {
        name: 'EVMS',
        description: 'API endpoints for EVMS management'
      },
      {
        name: 'Lessons',
        description: 'API endpoints for lessons learned management'
      },
      {
        name: 'Notifications',
        description: 'API endpoints for notification management'
      },
      {
        name: 'Portfolios',
        description: 'API endpoints for portfolio management'
      },
      {
        name: 'Procurements',
        description: 'API endpoints for procurement management'
      },
      {
        name: 'Project Resources',
        description: 'API endpoints for project-specific resource management (baselines, budgets, documents, etc.)'
      },
      {
        name: 'Projects',
        description: 'API endpoints for project management'
      },
      {
        name: 'Resources',
        description: 'API endpoints for resource management'
      },
      {
        name: 'RiskMitigation',
        description: 'API endpoints for risk mitigation management'
      },
      {
        name: 'Risks',
        description: 'API endpoints for risk management'
      },
      {
        name: 'Roles',
        description: 'API endpoints for role management'
      },
      {
        name: 'TaskDependencies',
        description: 'API endpoints for task dependency management'
      },
      {
        name: 'Tasks',
        description: 'API endpoints for task management, including task assignments and dependencies'
      },
      {
        name: 'Transactions',
        description: 'API endpoints for transaction management'
      },
      {
        name: 'Users',
        description: 'API endpoints for user management'
      },
      {
        name: 'Vendors',
        description: 'API endpoints for vendor management'
      },
      {
        name: 'WBS',
        description: 'API endpoints for WBS management'
      },
      {
        name: 'WBSItems',
        description: 'API endpoints for WBS item management'
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from the /api/auth/login endpoint. Enter your token in the format: Bearer <token>'
        },
      },
      schemas: {
        // Alert schemas
        Alert: {
          type: 'object',
          properties: {
            alert_id: { type: 'integer' },
            project_id: { type: 'integer' },
            triggeredAt: { type: 'string', format: 'date-time' },
            recipients: { type: 'string', description: 'JSON string of recipient roles or IDs' }
          },
          example: {
            alert_id: 1,
            project_id: 5,
            triggeredAt: '2023-06-15T14:30:00Z',
            recipients: '["Finance Manager", "Project Manager"]'
          }
        },
        // Approval schemas
        Approval: {
          type: 'object',
          properties: {
            approval_id: { type: 'integer' },
            type: { type: 'string', description: 'Type of approval' },
            status: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'] },
            requested_by: { type: 'integer' },
            target_user_id: { type: 'integer' },
            comments: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          },
          example: {
            approval_id: 1,
            type: 'PROJECT_CREATION',
            status: 'PENDING',
            requested_by: 3,
            target_user_id: 5,
            comments: 'Please approve this new project',
            created_at: '2023-06-10T09:15:00Z',
            updated_at: '2023-06-10T09:15:00Z'
          }
        },
        // Authentication schemas
        LoginRequest: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', format: 'password' },
          },
          required: ['email', 'password'],
          example: {
            email: 'user@example.com',
            password: 'password123'
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                user_id: { type: 'integer' },
                email: { type: 'string' },
                role: { type: 'string' }
              }
            }
          },
          example: {
            token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            user: {
              user_id: 1,
              email: 'user@example.com',
              role: 'ADMIN'
            }
          }
        },
        RegisterRequest: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', format: 'password' },
            username: { type: 'string' }
          },
          required: ['email', 'password', 'username'],
          example: {
            email: 'newuser@example.com',
            password: 'securepassword',
            username: 'newuser'
          }
        },
        RegisterResponse: {
          type: 'object',
          properties: {
            user_id: { type: 'integer' },
            email: { type: 'string' },
            username: { type: 'string' },
            role: { type: 'string' }
          },
          example: {
            user_id: 10,
            email: 'newuser@example.com',
            username: 'newuser',
            role: 'USER'
          }
        },
        RefreshTokenResponse: {
          type: 'object',
          properties: {
            token: { type: 'string' }
          },
          example: {
            token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
          }
        },
        LogoutResponse: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          },
          example: {
            message: 'Logged out successfully'
          }
        },
        // User schemas
        User: {
          type: 'object',
          properties: {
            user_id: { type: 'integer' },
            username: { type: 'string' },
            email: { type: 'string', format: 'email' },
            status: { type: 'string', enum: ['active', 'inactive'] },
            role_id: { type: 'integer' },
          },
          example: {
            user_id: 1,
            username: 'johndoe',
            email: 'john@example.com',
            status: 'active',
            role_id: 2
          }
        },
        // Project schemas
        Project: {
          type: 'object',
          properties: {
            project_id: { type: 'integer' },
            project_code: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            start_date: { type: 'string', format: 'date' },
            planned_end_date: { type: 'string', format: 'date' },
            actual_end_date: { type: 'string', format: 'date' },
            budget_amount: { type: 'number' },
            actual_cost: { type: 'number' },
            progress_percentage: { type: 'number' },
            status: { type: 'string' },
            created_by: { type: 'integer' },
            eps_level_id: { type: 'integer' },
            portfolio_id: { type: 'integer' },
          },
          example: {
            project_id: 1,
            project_code: 'PROJ-1234',
            name: 'New Office Building',
            description: 'Construction of new headquarters',
            start_date: '2023-01-15',
            planned_end_date: '2023-12-31',
            budget_amount: 5000000,
            progress_percentage: 35,
            status: 'in_progress',
            created_by: 1,
            eps_level_id: 2,
            portfolio_id: 1
          }
        },
        // Task schemas
        Task: {
          type: 'object',
          properties: {
            task_id: { type: 'integer' },
            wbs_id: { type: 'integer' },
            name: { type: 'string' },
            description: { type: 'string' },
            start_date: { type: 'string', format: 'date' },
            end_date: { type: 'string', format: 'date' },
            duration: { type: 'integer' },
            status: { type: 'string', enum: ['todo', 'in_progress', 'completed', 'on_hold'] },
            priority: { type: 'integer', enum: [0, 1, 2, 3] },
            is_milestone: { type: 'boolean' },
            is_critical_path: { type: 'boolean' },
            progress_percentage: { type: 'number' }
          },
          example: {
            task_id: 1,
            wbs_id: 5,
            name: 'Foundation Work',
            description: 'Laying the building foundation',
            start_date: '2023-02-01',
            end_date: '2023-03-15',
            duration: 42,
            status: 'todo',
            priority: 2,
            is_milestone: false,
            is_critical_path: true,
            progress_percentage: 100
          }
        },
        // Risk schemas
        Risk: {
          type: 'object',
          properties: {
            risk_id: { type: 'integer' },
            project_id: { type: 'integer' },
            name: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            identified_date: { type: 'string', format: 'date' },
            impact: { type: 'string', enum: ['high', 'medium', 'low'] },
            probability: { type: 'string', enum: ['high', 'medium', 'low'] },
            riskLevel: { type: 'string', enum: ['High', 'Medium', 'Low'] },
            status: { type: 'string' },
            owner_id: { type: 'integer' }
          },
          example: {
            risk_id: 1,
            project_id: 1,
            name: 'Supply Chain Disruption',
            description: 'Potential delay in material delivery',
            category: 'Procurement',
            identified_date: '2023-01-20',
            impact: 'high',
            probability: 'medium',
            riskLevel: 'High',
            status: 'open',
            owner_id: 3
          }
        },
        // Document schemas
        Document: {
          type: 'object',
          properties: {
            document_id: { type: 'integer' },
            name: { type: 'string' },
            description: { type: 'string' },
            file_path: { type: 'string' },
            file_type: { type: 'string' },
            size: { type: 'integer' },
            project_id: { type: 'integer' },
            wbs_id: { type: 'integer' },
            task_id: { type: 'integer' },
            uploaded_by: { type: 'integer' },
            upload_date: { type: 'string', format: 'date-time' }
          },
          example: {
            document_id: 1,
            name: 'Project Charter',
            description: 'Official project charter document',
            file_path: '/documents/project-charter.pdf',
            file_type: 'pdf',
            size: 2048576,
            project_id: 1,
            wbs_id: 1,
            task_id: null,
            uploaded_by: 1,
            upload_date: '2023-01-15T10:30:00Z'
          }
        },
        // Contract schemas
        Contract: {
          type: 'object',
          properties: {
            contract_id: { type: 'integer' },
            procurement_id: { type: 'integer' },
            vendor_id: { type: 'integer' },
            contract_number: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            start_date: { type: 'string', format: 'date' },
            end_date: { type: 'string', format: 'date' },
            value: { type: 'number', format: 'float' },
            status: { type: 'string' }
          },
          example: {
            contract_id: 1,
            procurement_id: 1,
            vendor_id: 1,
            contract_number: 'CT-2025-00001',
            name: 'Construction Services Contract',
            description: 'Main construction contract for building project',
            start_date: '2023-02-01',
            end_date: '2023-12-31',
            value: 2500000.00,
            status: 'Approved'
          }
        },
        // Baseline schemas
        Baseline: {
          type: 'object',
          properties: {
            baseline_id: { type: 'integer' },
            project_id: { type: 'integer' },
            name: { type: 'string' },
            start_date: { type: 'string', format: 'date' },
            end_date: { type: 'string', format: 'date' },
            budget: { type: 'number', format: 'float' },
            description: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          },
          example: {
            baseline_id: 1,
            project_id: 1,
            name: 'Initial Project Baseline',
            start_date: '2023-01-15',
            end_date: '2023-12-31',
            budget: 5000000.00,
            description: 'Original approved project baseline',
            created_at: '2023-01-10T09:00:00Z',
            updated_at: '2023-01-10T09:00:00Z'
          }
        },
        // Budget schemas
        Budget: {
          type: 'object',
          properties: {
            budget_id: { type: 'integer' },
            project_id: { type: 'integer' },
            wbs_id: { type: 'integer' },
            cost_type: { type: 'string' },
            planned_amount: { type: 'number', format: 'float' },
            actual_amount: { type: 'number', format: 'float' },
            variance: { type: 'number', format: 'float' },
            fiscal_year: { type: 'integer' },
            fiscal_period: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          },
          example: {
            budget_id: 1,
            project_id: 1,
            wbs_id: 1,
            cost_type: 'Labor',
            planned_amount: 500000.00,
            actual_amount: 475000.00,
            variance: -25000.00,
            fiscal_year: 2023,
            fiscal_period: 'Q1',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-03-31T23:59:59Z'
          }
        },
        // EVMS schemas
        EVMS: {
          type: 'object',
          properties: {
            evm_id: { type: 'integer' },
            project_id: { type: 'integer' },
            wbs_id: { type: 'integer' },
            task_id: { type: 'integer' },
            reporting_period: { type: 'string', format: 'date' },
            planned_value: { type: 'number', format: 'float' },
            earned_value: { type: 'number', format: 'float' },
            actual_cost: { type: 'number', format: 'float' },
            schedule_variance: { type: 'number', format: 'float' },
            cost_variance: { type: 'number', format: 'float' },
            schedule_performance_index: { type: 'number', format: 'float' },
            cost_performance_index: { type: 'number', format: 'float' },
            created_at: { type: 'string', format: 'date-time' }
          },
          example: {
            evm_id: 1,
            project_id: 1,
            wbs_id: 1,
            task_id: 1,
            reporting_period: '2023-03-31',
            planned_value: 100000.00,
            earned_value: 95000.00,
            actual_cost: 98000.00,
            schedule_variance: -5000.00,
            cost_variance: -3000.00,
            schedule_performance_index: 0.95,
            cost_performance_index: 0.97,
            created_at: '2023-03-31T23:59:59Z'
          }
        },
        // Lesson schemas
        Lesson: {
          type: 'object',
          properties: {
            lesson_id: { type: 'integer' },
            project_id: { type: 'integer' },
            title: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string', enum: ['Technical', 'Management', 'Communication', 'Risk', 'Budget', 'Schedule', 'Quality', 'Resources'] },
            lesson_type: { type: 'string', enum: ['Best Practice', 'Issue', 'Improvement'] },
            impact: { type: 'string', enum: ['High', 'Medium', 'Low'] },
            recommendation: { type: 'string' },
            documented_by: { type: 'integer' },
            date_learned: { type: 'string', format: 'date' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          },
          example: {
            lesson_id: 1,
            project_id: 1,
            title: 'Early Stakeholder Engagement',
            description: 'Engaging stakeholders early in the project lifecycle improved buy-in and reduced scope changes',
            category: 'Management',
            lesson_type: 'Best Practice',
            impact: 'High',
            recommendation: 'Schedule stakeholder workshops within the first two weeks of project initiation',
            documented_by: 1,
            date_learned: '2023-06-15',
            created_at: '2023-06-16T10:00:00Z',
            updated_at: '2023-06-16T10:00:00Z'
          }
        },
        // Procurement schemas
        Procurement: {
          type: 'object',
          properties: {
            procurement_id: { type: 'integer' },
            project_id: { type: 'integer' },
            wbs_id: { type: 'integer' },
            name: { type: 'string' },
            description: { type: 'string' },
            procurement_type: { type: 'string', enum: ['Goods', 'Services', 'Works'] },
            method: { type: 'string', enum: ['Open Tender', 'Restricted Tender', 'Direct Contract', 'Framework Agreement'] },
            estimated_value: { type: 'number', format: 'float' },
            actual_value: { type: 'number', format: 'float' },
            status: { type: 'string', enum: ['Planning', 'Tendering', 'Evaluation', 'Awarded', 'Completed', 'Cancelled'] },
            start_date: { type: 'string', format: 'date' },
            end_date: { type: 'string', format: 'date' },
            procurement_manager: { type: 'integer' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          },
          example: {
            procurement_id: 1,
            project_id: 1,
            wbs_id: 1,
            name: 'Construction Materials Procurement',
            description: 'Procurement of steel and concrete for building construction',
            procurement_type: 'Goods',
            method: 'Open Tender',
            estimated_value: 1500000.00,
            actual_value: 1450000.00,
            status: 'Awarded',
            start_date: '2023-01-15',
            end_date: '2023-03-31',
            procurement_manager: 3,
            created_at: '2023-01-10T09:00:00Z',
            updated_at: '2023-03-31T17:00:00Z'
          }
        },
        // WBS schemas
        WBS: {
          type: 'object',
          properties: {
            wbs_id: { type: 'integer' },
            project_id: { type: 'integer' },
            parent_wbs_id: { type: 'integer' },
            wbs_code: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            level: { type: 'integer' },
            sort_order: { type: 'integer' },
            start_date: { type: 'string', format: 'date' },
            end_date: { type: 'string', format: 'date' },
            budget_amount: { type: 'number', format: 'float' },
            actual_cost: { type: 'number', format: 'float' },
            progress_percentage: { type: 'number', format: 'float' },
            status: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          },
          example: {
            wbs_id: 1,
            project_id: 1,
            parent_wbs_id: null,
            wbs_code: '1.0',
            name: 'Project Management',
            description: 'Overall project management activities',
            level: 1,
            sort_order: 1,
            start_date: '2023-01-15',
            end_date: '2023-12-31',
            budget_amount: 500000.00,
            actual_cost: 125000.00,
            progress_percentage: 25.0,
            status: 'In Progress',
            created_at: '2023-01-10T09:00:00Z',
            updated_at: '2023-03-31T17:00:00Z'
          }
        },
        TaskAssignment: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            task_id: { type: 'integer' },
            user_id: { type: 'integer' },
            assigned_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            user: {
              type: 'object',
              properties: {
                user_id: { type: 'integer' },
                username: { type: 'string' },
                email: { type: 'string' },
                account: {
                  type: 'object',
                  properties: {
                    first_name: { type: 'string' },
                    last_name: { type: 'string' },
                    department: { type: 'string' }
                  }
                }
              }
            }
          },
          example: {
            id: 1,
            task_id: 123,
            user_id: 456,
            assigned_at: '2024-03-15T10:00:00Z',
            updated_at: '2024-03-15T10:00:00Z',
            user: {
              user_id: 456,
              username: 'john.doe',
              email: 'john.doe@example.com',
              account: {
                first_name: 'John',
                last_name: 'Doe',
                department: 'Engineering'
              }
            }
          }
        },
        TaskAssignmentRequest: {
          type: 'object',
          properties: {
            user_ids: {
              type: 'array',
              items: { type: 'integer' },
              description: 'Array of user IDs to assign to the task'
            }
          },
          required: ['user_ids'],
          example: {
            user_ids: [1, 2, 3]
          }
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: {
                    type: 'string',
                    example: 'Unauthorized'
                  }
                }
              }
            }
          }
        },
        NotFoundError: {
          description: 'The requested resource was not found',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: {
                    type: 'string',
                    example: 'Resource not found'
                  }
                }
              }
            }
          }
        },
        ServerError: {
          description: 'Internal server error occurred',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: {
                    type: 'string',
                    example: 'Internal server error'
                  }
                }
              }
            }
          }
        }
      }
    },
    security: [{
      bearerAuth: [],
    }],
  },
  apis: ['./app/api/**/*.ts', './app/api/**/route.ts'], // Path to the API docs
};

const spec = swaggerJsdoc(options);

export default spec;
