#!/usr/bin/env node

// Simple test script to verify project creation API accepts must_finish_by_date

const testProjectCreation = async () => {
  try {
    const testData = {
      name: "Test Project with Deadline",
      description: "Testing must finish by date functionality",
      start_date: "2025-01-01",
      must_finish_by_date: "2025-06-01", // 5 months to complete
      budget_amount: 50000,
      eps_level_id: 1,
      portfolio_id: 1,
      project_manager_id: 1,
      client: "Test Client",
      location: "Test Location",
      priority: "medium",
      type: "infrastructure"
    };

    console.log("📊 Test Data to send:", JSON.stringify(testData, null, 2));
    console.log("\n✅ Validation checks:");
    console.log(`- Name provided: ${!!testData.name}`);
    console.log(`- Start date: ${testData.start_date}`);
    console.log(`- Must finish by: ${testData.must_finish_by_date}`);
    console.log(`- Deadline after start: ${new Date(testData.must_finish_by_date) > new Date(testData.start_date)}`);
    console.log(`- Required fields: ${!!testData.eps_level_id && !!testData.portfolio_id && !!testData.project_manager_id}`);

    // Calculate available working days (simplified)
    const startDate = new Date(testData.start_date);
    const endDate = new Date(testData.must_finish_by_date);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const workingDays = Math.floor(diffDays * (5/7)); // Rough 5-day week calculation
    
    console.log(`\n📅 Schedule Analysis:`);
    console.log(`- Total days available: ${diffDays}`);
    console.log(`- Approximate working days: ${workingDays}`);

    console.log("\n🎯 API Endpoint: POST /api/projects");
    console.log("📝 Expected Response: Project created with must_finish_by_date saved");
    
    console.log("\n💡 To test manually:");
    console.log("curl -X POST http://localhost:3000/api/projects \\");
    console.log("  -H 'Content-Type: application/json' \\");
    console.log("  -H 'x-user-role: ADMIN' \\");
    console.log("  -H 'x-user-id: 1' \\");
    console.log(`  -d '${JSON.stringify(testData)}'`);
    
  } catch (error) {
    console.error("❌ Test preparation error:", error);
  }
};

testProjectCreation();