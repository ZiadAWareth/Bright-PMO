/**
 * Calculate the number of working days between two dates, excluding off days
 * @param startDate Start date
 * @param endDate End date
 * @param offDays Array of off days (e.g., ['Saturday', 'Sunday'])
 * @returns Number of working days (inclusive)
 */
export function calculateWorkingDays(
  startDate: Date,
  endDate: Date,
  offDays: string[] = []
): number {
  if (startDate > endDate) {
    return 0;
  }

  let count = 0;
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  const dayNames = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

  while (current <= end) {
    const dayName = dayNames[current.getDay()];
    if (!offDays.includes(dayName)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Add working days to a start date, excluding off days
 * @param startDate Start date
 * @param workingDays Number of working days to add (can be negative to go backwards)
 * @param offDays Array of off days (e.g., ['Saturday', 'Sunday'])
 * @returns End date after adding working days
 */
export function addWorkingDays(
  startDate: Date,
  workingDays: number,
  offDays: string[] = []
): Date {
  console.log('➕ addWorkingDays called:', {
    startDate: startDate.toISOString().split('T')[0],
    workingDays,
    offDays
  });

  if (workingDays === 0) {
    console.log('  workingDays is 0, returning startDate');
    return new Date(startDate);
  }

  const dayNames = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

  const result = new Date(startDate);
  result.setHours(0, 0, 0, 0);
  
  // Handle negative values (going backwards)
  if (workingDays < 0) {
    console.log('  Going BACKWARDS by', Math.abs(workingDays), 'working days');
    let remainingDays = Math.abs(workingDays);
    
    // Check if start date is a working day - if yes, it counts as day 1
    const startDayName = dayNames[result.getDay()];
    if (!offDays.includes(startDayName)) {
      remainingDays--;
      console.log(`  Start date (${startDayName}) is working day, remaining: ${remainingDays}`);
    }

    // Go backwards
    while (remainingDays > 0) {
      result.setDate(result.getDate() - 1);
      const dayName = dayNames[result.getDay()];
      if (!offDays.includes(dayName)) {
        remainingDays--;
        console.log(`  Moved to ${result.toISOString().split('T')[0]} (${dayName}), remaining: ${remainingDays}`);
      } else {
        console.log(`  Skipped ${result.toISOString().split('T')[0]} (${dayName}) - off day`);
      }
    }
  } else {
    // Handle positive values (going forwards)
    console.log('  Going FORWARDS by', workingDays, 'working days');
    let remainingDays = workingDays;

    // Check if start date is a working day - if yes, it counts as day 1
    const startDayName = dayNames[result.getDay()];
    if (!offDays.includes(startDayName)) {
      remainingDays--;
      console.log(`  Start date (${startDayName}) is working day, remaining: ${remainingDays}`);
    }

    // Now add the remaining working days
    while (remainingDays > 0) {
      result.setDate(result.getDate() + 1);
      const dayName = dayNames[result.getDay()];
      if (!offDays.includes(dayName)) {
        remainingDays--;
        console.log(`  Moved to ${result.toISOString().split('T')[0]} (${dayName}), remaining: ${remainingDays}`);
      } else {
        console.log(`  Skipped ${result.toISOString().split('T')[0]} (${dayName}) - off day`);
      }
    }
  }

  const finalResult = result.toISOString().split('T')[0];
  console.log('✅ addWorkingDays result:', finalResult);
  return result;
}

/**
 * Calculate the end date from start date and duration (in working days)
 * @param startDate Start date
 * @param duration Duration in working days
 * @param offDays Array of off days (e.g., ['Saturday', 'Sunday'])
 * @returns End date
 */
export function calculateEndDate(
  startDate: Date,
  duration: number,
  offDays: string[] = []
): Date {
  if (duration <= 1) {
    return new Date(startDate);
  }
  // addWorkingDays now counts the start date as day 1, so pass full duration
  return addWorkingDays(startDate, duration, offDays);
}
