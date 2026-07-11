// Test negative lag calculations for Finish-to-Start dependency

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
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayName = dayNames[date.getDay()];
  return `${year}-${month}-${day} (${dayName})`;
};

const offDays = ['Friday', 'Saturday'];
console.log('🧪 Testing Finish-to-Start (FS) Dependency with Different Lag Values');
console.log('Off days:', offDays.join(', '));
console.log('='.repeat(80));

// Predecessor: Survey Works ends on Jan 27, 2026 (Tuesday)
const predEnd = new Date(2026, 0, 27); // Jan 27, 2026 (Tuesday)
console.log(`\n📋 Predecessor ends: ${formatDate(predEnd)}`);
console.log('-'.repeat(80));

// Test different lag values
const lagTests = [
  { lag: 0, description: 'Zero lag (immediate succession)' },
  { lag: 1, description: 'Positive lag +1 (1 day delay)' },
  { lag: 2, description: 'Positive lag +2 (2 days delay)' },
  { lag: -1, description: 'Negative lag -1 (1 day overlap/lead)' },
  { lag: -2, description: 'Negative lag -2 (2 days overlap/lead)' },
  { lag: -3, description: 'Negative lag -3 (3 days overlap/lead)' },
];

lagTests.forEach(({ lag, description }) => {
  // FS formula: successor starts = predecessor end + 1 + lag
  const successorStart = addWorkingDays(predEnd, 1 + lag, offDays);
  
  console.log(`\n✅ Lag = ${lag >= 0 ? '+' : ''}${lag}: ${description}`);
  console.log(`   Successor starts: ${formatDate(successorStart)}`);
  
  if (lag === 0) {
    console.log(`   → Starts immediately after predecessor finishes`);
  } else if (lag > 0) {
    console.log(`   → Waits ${lag} working day(s) after predecessor finishes`);
  } else {
    console.log(`   → Starts ${Math.abs(lag)} working day(s) BEFORE predecessor finishes (OVERLAP)`);
  }
});

console.log('\n' + '='.repeat(80));
console.log('✅ All tests completed!');
console.log('\n💡 Summary:');
console.log('   • Lag = 0: Start immediately after predecessor (next working day)');
console.log('   • Lag > 0: Add delay (wait N working days)');
console.log('   • Lag < 0: Create overlap (start N working days BEFORE predecessor finishes)');
console.log('   • Formula: startDate = predecessorEnd + 1 + lag (respecting working days)');
