const calculateWorkingDays = (startDate, endDate, offDays = []) => {
  if (!startDate || !endDate) return 0;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (end < start) return 0;
  
  let workingDays = 0;
  const currentDate = new Date(start);
  const days = [];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay();
    const dayName = dayNames[dayOfWeek];
    const isWorking = !offDays.includes(dayName);
    
    if (isWorking) {
      workingDays++;
    }
    
    days.push(`${currentDate.toISOString().split('T')[0]} - ${dayName} (${isWorking ? 'WORKING' : 'OFF'})`);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  console.log('Days breakdown:');
  days.forEach(d => console.log('  ' + d));
  
  return workingDays;
};

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addWorkingDays = (startDate, workingDaysToAdd, offDays = []) => {
  if (workingDaysToAdd <= 0) return new Date(startDate);
  
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const result = new Date(startDate);
  result.setHours(0, 0, 0, 0);
  
  let remainingDays = workingDaysToAdd;
  console.log(`  Starting from ${formatDate(result)} (${dayNames[result.getDay()]}), need ${workingDaysToAdd} working days total`);
  
  // Check if start date is a working day - if yes, it counts as day 1
  const startDayName = dayNames[result.getDay()];
  if (!offDays.includes(startDayName)) {
    console.log(`    Start date is a working day, counts as day 1, remaining: ${remainingDays - 1}`);
    remainingDays--;
  }
  
  // Now add the remaining working days
  while (remainingDays > 0) {
    result.setDate(result.getDate() + 1);
    const dayName = dayNames[result.getDay()];
    const isWorking = !offDays.includes(dayName);
    console.log(`    -> ${formatDate(result)} (${dayName}) ${isWorking ? 'WORKING' : 'OFF'}, remaining: ${remainingDays}${isWorking ? ' → ' + (remainingDays-1) : ''}`);
    if (isWorking) {
      remainingDays--;
    }
  }
  
  return result;
};

const calculateEndDate = (startDate, duration, offDays = []) => {
  if (duration <= 1) return new Date(startDate);
  return addWorkingDays(startDate, duration, offDays);
};

console.log('=== TEST CASE: Jan 21 to Jan 27, 2026 (What calendar?) ===');
console.log('Let\'s check what days these are:');
for (let d = 21; d <= 27; d++) {
  const date = new Date(`2026-01-${d}`);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  console.log(`  Jan ${d}: ${dayNames[date.getDay()]}`);
}

console.log('\n=== TEST WITH NO OFF DAYS (7-day calendar) ===');
let offDays = [];
let result = calculateWorkingDays('2026-01-21', '2026-01-27', offDays);
console.log(`\nTotal working days: ${result}`);

console.log('\n=== TEST WITH Friday-Saturday OFF (5-day calendar) ===');
offDays = ['Friday', 'Saturday'];
result = calculateWorkingDays('2026-01-21', '2026-01-27', offDays);
console.log(`\nTotal working days: ${result}`);

console.log('\n=== ACTUAL USER SCENARIO: Friday+Saturday OFF (5-day calendar) ===');
offDays = ['Friday', 'Saturday'];
console.log('\nTest 1: Jan 21 to Jan 27 - how many working days?');
result = calculateWorkingDays('2026-01-21', '2026-01-27', offDays);
console.log(`Result: ${result} working days`);

console.log('\nTest 2: Start Jan 21, Duration 5 - what should end date be?');
// Parse date correctly as local time (same way the form does it now)
const [year, month, day] = '2026-01-21'.split('-').map(Number);
const startDate = new Date(year, month - 1, day);
console.log(`Parsed start date: ${startDate.toDateString()}`);
const endDateWith5Days = calculateEndDate(startDate, 5, offDays);
console.log(`End date: ${formatDate(endDateWith5Days)}`);
console.log(`Expected: 2026-01-27 (Days: 21-Wed, 22-Thu, 25-Sun, 26-Mon, 27-Tue)`);

console.log('\nVerification:');
const verificationWith5Days = calculateWorkingDays('2026-01-21', formatDate(endDateWith5Days), offDays);
console.log(`Working days from Jan 21 to ${formatDate(endDateWith5Days)}: ${verificationWith5Days}`);
