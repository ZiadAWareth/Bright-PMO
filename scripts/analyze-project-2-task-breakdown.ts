import { prisma } from '../lib/prisma';

async function analyzeProject2TaskBreakdown() {
  console.log('🔍 Analyzing Project 2 Task Breakdown\n');
  console.log('='.repeat(60));

  try {
    const projectId = 2;
    
    console.log(`📋 Project ID: ${projectId}`);
    console.log('-'.repeat(50));

    // Get project details with tasks
    const project = await prisma.project.findUnique({
      where: { project_id: projectId },
      include: {
        wbs: {
          include: {
            tasks: {
              select: {
                task_id: true,
                name: true,
                is_critical_path: true,
                is_milestone: true,
                duration: true,
                progress_percentage: true,
                status: true
              }
            }
          }
        }
      }
    });

    if (!project) {
      console.log('❌ Project not found');
      return;
    }

    console.log(`📊 Project: ${project.name}`);
    console.log('');

    // Get all tasks from the project
    const allTasks = project.wbs.flatMap(wbs => wbs.tasks || []);
    console.log(`📈 Total Tasks (including milestones): ${allTasks.length}`);

    // Breakdown by type
    const milestones = allTasks.filter(task => task.is_milestone);
    const regularTasks = allTasks.filter(task => !task.is_milestone);
    const criticalPathTasks = allTasks.filter(task => task.is_critical_path);

    console.log(`🎯 Milestones: ${milestones.length}`);
    console.log(`📋 Regular Tasks: ${regularTasks.length}`);
    console.log(`⚡ Critical Path Tasks: ${criticalPathTasks.length}`);
    console.log('');

    // Breakdown by status
    const completedTasks = allTasks.filter(task => task.status === 'completed');
    const inProgressTasks = allTasks.filter(task => task.status === 'in_progress');
    const todoTasks = allTasks.filter(task => task.status === 'todo');
    const onHoldTasks = allTasks.filter(task => task.status === 'on_hold');

    console.log('📊 Status Breakdown:');
    console.log(`   ✅ Completed: ${completedTasks.length}`);
    console.log(`   🔄 In Progress: ${inProgressTasks.length}`);
    console.log(`   📝 To Do: ${todoTasks.length}`);
    console.log(`   ⏸️  On Hold: ${onHoldTasks.length}`);
    console.log('');

    // Detailed task list
    console.log('📋 Detailed Task List:');
    allTasks.forEach((task, index) => {
      const type = task.is_milestone ? '🎯 MILESTONE' : '📋 TASK';
      const critical = task.is_critical_path ? '⚡ CRITICAL' : '   ';
      const status = task.status.toUpperCase();
      console.log(`   ${index + 1}. ${task.name}`);
      console.log(`      ${type} | ${critical} | ${status} | ${task.duration} days | ${task.progress_percentage}%`);
    });

    console.log('');
    console.log('🔍 ANALYSIS:');
    console.log('');

    // Frontend calculation explanation
    console.log('📊 Frontend Statistics Calculation:');
    console.log(`   • Total Tasks (excluding milestones): ${regularTasks.length}`);
    console.log(`   • Completed Tasks (excluding milestones): ${regularTasks.filter(t => t.status === 'completed').length}`);
    console.log(`   • Critical Path Tasks (including milestones): ${criticalPathTasks.length}`);
    console.log('');

    // Milestone breakdown
    if (milestones.length > 0) {
      console.log('🎯 Milestones Breakdown:');
      milestones.forEach((milestone, index) => {
        const critical = milestone.is_critical_path ? '⚡ CRITICAL' : '   ';
        console.log(`   ${index + 1}. ${milestone.name} | ${critical} | ${milestone.status} | ${milestone.progress_percentage}%`);
      });
      console.log('');
    }

    // Critical path breakdown
    if (criticalPathTasks.length > 0) {
      console.log('⚡ Critical Path Breakdown:');
      criticalPathTasks.forEach((task, index) => {
        const type = task.is_milestone ? '🎯 MILESTONE' : '📋 TASK';
        console.log(`   ${index + 1}. ${task.name} | ${type} | ${task.duration} days`);
      });
      console.log('');
    }

    console.log('💡 EXPLANATION:');
    console.log('   The discrepancy occurs because:');
    console.log('   1. Frontend "Total Tasks" excludes milestones');
    console.log('   2. Frontend "Completed" excludes milestones');
    console.log('   3. Frontend "Critical Path" includes ALL critical tasks (including milestones)');
    console.log('   4. Task list shows ALL tasks (including milestones)');
    console.log('');
    console.log('   This is the correct behavior for project management!');

  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the analysis
analyzeProject2TaskBreakdown()
  .catch(console.error); 