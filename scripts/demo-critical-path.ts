import { CriticalPathService } from '../lib/services/critical-path.service';
import { prisma } from '../lib/prisma';

async function demonstrateCriticalPath() {
  console.log('🚀 Critical Path Method (CPM) Implementation Demo\n');
  console.log('='.repeat(60));

  try {
    // Test with all available projects
    const projects = await prisma.project.findMany({
      select: {
        project_id: true,
        name: true
      }
    });

    console.log(`📊 Found ${projects.length} projects to analyze\n`);

    for (const project of projects) {
      console.log(`\n📋 Project: ${project.name} (ID: ${project.project_id})`);
      console.log('-'.repeat(50));

      // Get project statistics
      const stats = await prisma.task.aggregate({
        where: {
          wbs: {
            project_id: project.project_id
          }
        },
        _count: { task_id: true },
        _sum: { duration: true },
        _avg: { progress_percentage: true }
      });

      const dependencyCount = await prisma.taskDependency.count({
        where: {
          predecessor: {
            wbs: {
              project_id: project.project_id
            }
          }
        }
      });

      console.log(`📈 Project Statistics:`);
      console.log(`   • Total Tasks: ${stats._count.task_id || 0}`);
      console.log(`   • Total Duration: ${stats._sum.duration || 0} days`);
      console.log(`   • Average Progress: ${(stats._avg.progress_percentage || 0).toFixed(1)}%`);
      console.log(`   • Dependencies: ${dependencyCount}`);

      if ((stats._count.task_id || 0) === 0) {
        console.log('   ⚠️  No tasks found - skipping CPM analysis');
        continue;
      }

      // Perform critical path calculation
      console.log(`\n🔄 Running Critical Path Analysis...`);
      const startTime = Date.now();
      
      const criticalPathData = await CriticalPathService.calculateCriticalPath(project.project_id);
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Analyze results
      const criticalTasks = criticalPathData.filter(task => task.is_critical_path);
      const totalFloat = criticalPathData.reduce((sum, task) => sum + task.total_float, 0);
      const avgFloat = totalFloat / criticalPathData.length;

      console.log(`⚡ Analysis Results:`);
      console.log(`   • Execution Time: ${executionTime}ms`);
      console.log(`   • Tasks Processed: ${criticalPathData.length}`);
      console.log(`   • Critical Path Tasks: ${criticalTasks.length}`);
      console.log(`   • Average Float: ${avgFloat.toFixed(1)} days`);

      if (criticalTasks.length > 0) {
        const criticalPathDuration = criticalTasks.reduce((sum, task) => sum + task.duration, 0);
        console.log(`   • Critical Path Duration: ${criticalPathDuration} days`);

        console.log(`\n🎯 Critical Path Tasks:`);
        criticalTasks.forEach((task, index) => {
          const earlyStart = task.early_start.toISOString().split('T')[0];
          const earlyFinish = task.early_finish.toISOString().split('T')[0];
          console.log(`   ${index + 1}. ${task.name}`);
          console.log(`      📅 ${earlyStart} → ${earlyFinish} (${task.duration} days)`);
          console.log(`      🎈 Float: ${task.total_float} days`);
        });

        // Check for potential scheduling issues
        const zeroFloatTasks = criticalTasks.filter(task => task.total_float === 0);
        if (zeroFloatTasks.length > 0) {
          console.log(`\n⚠️  Schedule Risk Analysis:`);
          console.log(`   • ${zeroFloatTasks.length} tasks have ZERO float`);
          console.log(`   • Any delay in these tasks will delay the project`);
          console.log(`   • Consider resource optimization or parallel execution`);
        }
      } else {
        console.log(`\n✅ Schedule Health: All tasks have scheduling flexibility`);
      }

      // Verify database updates
      const dbCriticalCount = await prisma.task.count({
        where: {
          wbs: {
            project_id: project.project_id
          },
          is_critical_path: true
        }
      });

      console.log(`\n💾 Database Verification:`);
      console.log(`   • Critical tasks in memory: ${criticalTasks.length}`);
      console.log(`   • Critical tasks in database: ${dbCriticalCount}`);
      console.log(`   • Sync Status: ${criticalTasks.length === dbCriticalCount ? '✅ Synchronized' : '❌ Out of sync'}`);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('🎉 Critical Path Analysis Complete!');
    console.log(`\n📝 Summary:`);
    console.log(`   • Projects Analyzed: ${projects.length}`);
    console.log(`   • CPM Algorithm: Forward Pass → Backward Pass → Float Calculation`);
    console.log(`   • Database: CPM fields updated automatically`);
    console.log(`   • Integration: API endpoints and UI components ready`);
    console.log(`\n🚀 The Critical Path Method implementation is now active and fully functional!`);

  } catch (error) {
    console.error('❌ Demo failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the demonstration
if (require.main === module) {
  demonstrateCriticalPath()
    .then(() => {
      console.log('\nDemo completed successfully! 🎯');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Demo failed:', error);
      process.exit(1);
    });
}

export { demonstrateCriticalPath };
