
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Clearing existing data...');

  // Clear all data (delete in correct order to respect foreign key constraints)
  await prisma.user.deleteMany({});
  console.log('✅ Cleared all users');

  await prisma.rolesAndPermissions.deleteMany({});
  console.log('✅ Cleared all roles');

  console.log('🌱 Seeding database...');

  // 1. Create any required parent records for the role model


  // 1b. Default tenant / organization (PG-11) — schema-aware; may be empty when
  // the schema has no organization discriminator. See the generator for details.
  // Reuse an existing tenant if present; skip a legacy id-0 platform row.
  let defaultOrganization = await prisma.organization.findFirst({
    where: { id: { not: 0 } },
  });
  if (!defaultOrganization) {
    defaultOrganization = await prisma.organization.create({
      data: {
        name: process.env.APP_NAME || 'Default Organization',
        slug: process.env.APP_NAME || 'Default Organization',
        isActive: true,
        primaryColor: '#0F766E',
        secondaryColor: '#059669'
      },
    });
  }
  const defaultOrgId = defaultOrganization.id;
  console.log('✅ Default organisation:', defaultOrgId);

  // 2. Roles — Super Admin (all organisations) + Organisation Admin (own org).
  //    Same full permissions; the difference is tenant scope, enforced by the
  //    Prisma layer from each user's organizationId.
  const permissions = {
        "approvalpolicy": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "sprintsnapshot": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "lesson": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "commentmention": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "maintenanceschedule": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "resourceassignment": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "eps": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "organization": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "inspection": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "workitemlink": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "activitylog": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "calendarexception": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "alert": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "evmsnapshot": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "workitem": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "integrationconnection": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "document": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "organizationsettings": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "projectmember": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "projectclosure": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "checklistitem": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "approvalpolicystep": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "costtransaction": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "contract": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "workflow": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true,
              "actions": {
                    "activate": true,
                    "deactivate": true,
                    "rollback": true,
                    "test": true
              }
        },
        "idpinboxevent": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "workitemstatus": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "projectlifecyclestep": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "progressreport": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "timeentry": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "vendor": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "lifecycletemplatestep": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "rfqresponse": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "timesheet": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "equipmentsitelog": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "site": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "checklist": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "handover": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "projectcategory": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "closuretemplateitem": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "sprintcapacity": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "risk": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "comment": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "workcalendar": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "wbsnode": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "recurringworkitem": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "lifecycletemplate": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "resource": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "release": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "savedreport": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "refreshtoken": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "userprofile": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "closuretemplate": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "budgetline": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "baseline": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "workitemdependency": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "portfolio": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "rolesandpermissions": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "workflowrule": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "maintenancelog": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "sprint": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "punchlistitem": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "project": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "approvalstep": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "procurement": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "closureitem": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "businessunit": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "riskmitigation": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "projectconflict": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "statustransition": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "notification": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "benchmark": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "approvalrequest": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "workitemassignee": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "apikey": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "user": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "baselineitem": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "escalation": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "workflowtimer": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "workflowschedule": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "agentsetting": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "agentrun": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "agentrunstep": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "agentconversation": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "agentmessage": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "agent": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "mailsetting": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "authsetting": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "authsetuptoken": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "authlogincode": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "authsessionrevocation": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "builderkey": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "dashboardengineconnection": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "dashboardengineorg": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "embeddeddashboard": {
              "create": true,
              "update": true,
              "delete": true,
              "get": true,
              "getAll": true
        },
        "$features": {
              "designFrontend": true,
              "signInSettings": true,
              "aiSettings": true,
              "connections": true,
              "assistant": true,
              "dynamicDashboards": true,
              "manageDynamicDashboards": true
        }
  };

  const superAdminRole = await prisma.rolesAndPermissions.create({
    data: {
      role: 'Super Admin',
      entityPermissions: permissions,
      organizationId: null,
    },
  });
  console.log('✅ Super Admin role created with ID:', superAdminRole.id);

  const orgAdminRole = await prisma.rolesAndPermissions.create({
    data: {
      role: 'Organisation Admin',
      entityPermissions: permissions,
      organizationId: defaultOrgId,
    },
  });
  console.log('✅ Organisation Admin role created with ID:', orgAdminRole.id);

  // 2b. Member — a role for a sign-up process to hand out (the Create User Account step
  //     of a workflow names it). It is NOT applied automatically: nothing grants it unless
  //     a workflow says so. Seeded because a process needs a role to give, and an owner who
  //     has to invent one under pressure invents one with permissions.
  //     Create-if-missing, so re-running the seed on an app whose owner has already
  //     widened this role does not reset their choices back to "nothing".
  const memberPermissions = {
        "approvalpolicy": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "sprintsnapshot": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "lesson": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "commentmention": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "maintenanceschedule": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "resourceassignment": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "eps": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "organization": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "inspection": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "workitemlink": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "activitylog": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "calendarexception": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "alert": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "evmsnapshot": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "workitem": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "integrationconnection": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "document": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "organizationsettings": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "projectmember": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "projectclosure": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "checklistitem": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "approvalpolicystep": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "costtransaction": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "contract": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "workflow": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false,
              "actions": {
                    "activate": false,
                    "deactivate": false,
                    "rollback": false,
                    "test": false
              }
        },
        "idpinboxevent": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "workitemstatus": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "projectlifecyclestep": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "progressreport": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "timeentry": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "vendor": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "lifecycletemplatestep": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "rfqresponse": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "timesheet": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "equipmentsitelog": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "site": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "checklist": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "handover": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "projectcategory": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "closuretemplateitem": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "sprintcapacity": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "risk": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "comment": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "workcalendar": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "wbsnode": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "recurringworkitem": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "lifecycletemplate": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "resource": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "release": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "savedreport": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "refreshtoken": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "userprofile": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "closuretemplate": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "budgetline": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "baseline": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "workitemdependency": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "portfolio": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "rolesandpermissions": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "workflowrule": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "maintenancelog": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "sprint": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "punchlistitem": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "project": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "approvalstep": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "procurement": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "closureitem": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "businessunit": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "riskmitigation": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "projectconflict": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "statustransition": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "notification": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "benchmark": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "approvalrequest": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "workitemassignee": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "apikey": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "user": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "baselineitem": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "escalation": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "workflowtimer": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "workflowschedule": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "agentsetting": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "agentrun": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "agentrunstep": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "agentconversation": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "agentmessage": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "agent": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "mailsetting": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "authsetting": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "authsetuptoken": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "authlogincode": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "authsessionrevocation": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "builderkey": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "dashboardengineconnection": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "dashboardengineorg": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "embeddeddashboard": {
              "create": false,
              "update": false,
              "delete": false,
              "get": false,
              "getAll": false
        },
        "$features": {
              "designFrontend": false,
              "signInSettings": false,
              "aiSettings": false,
              "connections": false,
              "assistant": false,
              "dynamicDashboards": false,
              "manageDynamicDashboards": false
        }
  };

  let memberRole = await prisma.rolesAndPermissions.findFirst({
    where: { role: 'Member' },
  });
  if (!memberRole) {
    memberRole = await prisma.rolesAndPermissions.create({
      data: {
        role: 'Member',
        entityPermissions: memberPermissions,
      organizationId: defaultOrgId,
      },
    });
  }
  console.log('✅ Member role (for sign-up workflows to grant) ready with ID:', memberRole.id);

  // 3. Hash the default password (shared by both seeded users).
  const hashedPassword = await bcrypt.hash('password123', 10);

  // 4. Required related records for the seeded users (if any)


  // 5. Super Admin user — cross-tenant access to every organisation.
  const superAdminUser = await prisma.user.create({
    data: {
      firstName: 'Super',
      lastName: 'Admin',
      email: 'admin@anothertestpmo.com',
      password: hashedPassword,
      roleId: superAdminRole.id,
      organizationId: null,
      // The ONE platform admin: cross-tenant, sees every organisation (see addPlatformAdminFlag).
      isPlatformAdmin: true,
    },
  });
  console.log('✅ Super Admin user created:', superAdminUser.email);

  // 6. Organisation Admin user — full access within their own organisation only.
  const orgAdminUser = await prisma.user.create({
    data: {
      firstName: 'Organisation',
      lastName: 'Admin',
      email: 'orgadmin@anothertestpmo.com',
      password: hashedPassword,
      roleId: orgAdminRole.id,
      organizationId: defaultOrgId,
    },
  });
  console.log('✅ Organisation Admin user created:', orgAdminUser.email);
  console.log('');
  console.log('🎉 Seeding completed successfully!');
  console.log('');
  console.log('📧 Super Admin (all organisations):');
  console.log('   Email: admin@anothertestpmo.com');
  console.log('   Password: password123');
  console.log('📧 Organisation Admin (own organisation):');
  console.log('   Email: orgadmin@anothertestpmo.com');
  console.log('   Password: password123');
  console.log('');
  console.log('⚠️  Please change these passwords after first login!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
