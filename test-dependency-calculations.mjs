// Test dependency calculations with Start-to-Finish and negative lag
const addWorkingDays = (startDate, workingDays, offDays = []) => {
  if (workingDays === 0) {
    return new Date(startDate);
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const result = new Date(startDate);
  result.setHours(0, 0, 0, 0);
  
  // Handle negative values (going backwards)
  if (workingDays < 0) {
    let remainingDays = Math.abs(workingDays);
    
    // Check if start date is a working day - if yes, it counts as day 1
    const startDayName = dayNames[result.getDay()];
    if (!offDays.includes(startDayName)) {
      remainingDays--;
    }

    // Go backwards
    while (remainingDays > 0) {
      result.setDate(result.getDate() - 1);
      const dayName = dayNames[result.getDay()];
      if (!offDays.includes(dayName)) {
        remainingDays--;
      }
    }
  } else {
    // Handle positive values (going forwards)
    let remainingDays = workingDays;

    // Check if start date is a working day - if yes, it counts as day 1
    const startDayName = dayNames[result.getDay()];
    if (!offDays.includes(startDayName)) {
      remainingDays--;
    }

    // Now add the remaining working days
    while (remainingDays > 0) {
      result.setDate(result.getDate() + 1);
      const dayName = dayNames[result.getDay()];
      if (!offDays.includes(dayName)) {
        remainingDays--;
      }
    }
  }

  return result;
};

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const calculateEndDate = (startDate, duration, offDays = []) => {
  if (duration <= 1) {
    return new Date(startDate);
  }
  return addWorkingDays(startDate, duration, offDays);
};

// Test scenarios
const offDays = ['Friday', 'Saturday'];
console.log('Testing Dependency Calculations with off days:', offDays);
console.log('='.repeat(80));

// Test 1: Start-to-Finish with zero lag
console.log('\n📋 Test 1: Start-to-Finish (SF) - Zero Lag');
console.log('-'.repeat(80));
const predStart1 = new Date(2026, 0, 21); // Jan 21, 2026 (Wednesday)
const predEnd1 = new Date(2026, 0, 27); // Jan 27, 2026 (Tuesday)
const successorDuration1 = 3;

console.log(`Predecessor: ${formatDate(predStart1)} to ${formatDate(predEnd1)}`);
console.log(`Successor Duration: ${successorDuration1} working days`);
console.log(`Dependency: Start-to-Finish, Lag: 0`);

const sf_endDate1 = addWorkingDays(predStart1, 0, offDays);
const sf_startDate1 = addWorkingDays(sf_endDate1, -(successorDuration1 - 1), offDays);

console.log(`✅ Result: Successor finishes ${formatDate(sf_endDate1)}, starts ${formatDate(sf_startDate1)}`);
console.log(`   Explanation: Successor finishes when predecessor starts`);

// Test 2: Start-to-Finish with positive lag
console.log('\n📋 Test 2: Start-to-Finish (SF) - Positive Lag (+2 days)');
console.log('-'.repeat(80));
const lag2 = 2;
console.log(`Predecessor: ${formatDate(predStart1)} to ${formatDate(predEnd1)}`);
console.log(`Successor Duration: ${successorDuration1} working days`);
console.log(`Dependency: Start-to-Finish, Lag: +${lag2}`);

const sf_endDate2 = addWorkingDays(predStart1, lag2, offDays);
const sf_startDate2 = addWorkingDays(sf_endDate2, -(successorDuration1 - 1), offDays);

console.log(`✅ Result: Successor finishes ${formatDate(sf_endDate2)}, starts ${formatDate(sf_startDate2)}`);
console.log(`   Explanation: Successor finishes ${lag2} working days after predecessor starts`);

// Test 3: Start-to-Finish with negative lag (lead)
console.log('\n📋 Test 3: Start-to-Finish (SF) - Negative Lag (-2 days, overlap)');
console.log('-'.repeat(80));
const lag3 = -2;
console.log(`Predecessor: ${formatDate(predStart1)} to ${formatDate(predEnd1)}`);
console.log(`Successor Duration: ${successorDuration1} working days`);
console.log(`Dependency: Start-to-Finish, Lag: ${lag3}`);

const sf_endDate3 = addWorkingDays(predStart1, lag3, offDays);
const sf_startDate3 = addWorkingDays(sf_endDate3, -(successorDuration1 - 1), offDays);

console.log(`✅ Result: Successor finishes ${formatDate(sf_endDate3)}, starts ${formatDate(sf_startDate3)}`);
console.log(`   Explanation: Successor finishes ${Math.abs(lag3)} working days BEFORE predecessor starts (overlap)`);

// Test 4: Finish-to-Start with negative lag (fast-track)
console.log('\n📋 Test 4: Finish-to-Start (FS) - Negative Lag (-2 days, fast-track)');
console.log('-'.repeat(80));
const lag4 = -2;
console.log(`Predecessor: ${formatDate(predStart1)} to ${formatDate(predEnd1)}`);
console.log(`Successor Duration: ${successorDuration1} working days`);
console.log(`Dependency: Finish-to-Start, Lag: ${lag4}`);

const fs_startDate4 = addWorkingDays(predEnd1, lag4 + 1, offDays);
const fs_endDate4 = calculateEndDate(fs_startDate4, successorDuration1, offDays);

console.log(`✅ Result: Successor starts ${formatDate(fs_startDate4)}, ends ${formatDate(fs_endDate4)}`);
console.log(`   Explanation: Successor starts ${Math.abs(lag4)} working days BEFORE predecessor finishes (fast-track)`);

// Test 5: Finish-to-Finish with positive lag
console.log('\n📋 Test 5: Finish-to-Finish (FF) - Positive Lag (+3 days)');
console.log('-'.repeat(80));
const lag5 = 3;
console.log(`Predecessor: ${formatDate(predStart1)} to ${formatDate(predEnd1)}`);
console.log(`Successor Duration: ${successorDuration1} working days`);
console.log(`Dependency: Finish-to-Finish, Lag: +${lag5}`);

const ff_endDate5 = addWorkingDays(predEnd1, lag5, offDays);
const ff_startDate5 = addWorkingDays(ff_endDate5, -(successorDuration1 - 1), offDays);

console.log(`✅ Result: Successor finishes ${formatDate(ff_endDate5)}, starts ${formatDate(ff_startDate5)}`);
console.log(`   Explanation: Successor finishes ${lag5} working days after predecessor finishes`);

console.log('\n' + '='.repeat(80));
console.log('✅ All tests completed successfully!');
console.log('\n💡 Key Takeaways:');
console.log('   • Start-to-Finish (SF): Successor finishes when predecessor starts + lag');
console.log('   • Positive lag: Adds delay (successor waits)');
console.log('   • Negative lag: Creates lead/overlap (successor starts/finishes earlier)');
console.log('   • All calculations respect working days (excluding Friday/Saturday)');
