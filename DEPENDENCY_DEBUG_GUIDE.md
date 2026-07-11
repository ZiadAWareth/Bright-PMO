# Dependency Debugging Guide

## Testing Dependency Creation

Now that we've added comprehensive debugging, follow these steps to test:

### 1. Open Browser Console
Press F12 or right-click → Inspect → Console

### 2. Try Creating a Dependency

Go to your Project Scheduler or Task Management page and try to add a dependency between tasks. You'll see detailed logs like:

```
=== DEPENDENCY CREATION DEBUG ===
📝 Creating dependency:
   Successor Task ID (depends on): 58
   Predecessor Task ID (must finish first): 57
   Dependency Type: finish_to_start
   Lag Time: 0
✅ Both tasks found:
   Successor: Cleaning and leveling (ID: 58)
   Predecessor: Survey Works (ID: 57)
💾 Creating new dependency in database...
✅ DEPENDENCY CREATED SUCCESSFULLY!
   Dependency ID: 123
   Predecessor Task ID: 57
   Successor Task ID: 58
   Type: finish_to_start
   Lag Time: 0
=== END DEPENDENCY CREATION DEBUG ===
```

### 3. Check if Dependency Already Exists

If you try to create the same dependency again, you'll see:
```
⚠️ DEPENDENCY ALREADY EXISTS!
   Existing Dependency ID: 123
   Type: finish_to_start
```

### 4. Fetch Dependencies for a Task

When viewing tasks, the console will show:
```
=== DEPENDENCY FETCH DEBUG ===
📖 Fetching dependencies for Task ID: 58
✅ Task found: Cleaning and leveling
📊 Found 1 dependencies:
   - finish_to_start :
     Predecessor: Survey Works (ID: 57)
     Successor: Cleaning and leveling (ID: 58)
=== END DEPENDENCY FETCH DEBUG ===
```

### 5. Check Project API Response

When loading the tasks page, you'll see:
```
=== PROJECT API - TASK DEPENDENCIES DEBUG ===
📦 Project: Construction Project (ID: 26)
📋 Total tasks: 3

  Task: Survey Works (ID: 57)
    Status: todo
    ⚠️  No predecessor dependencies in data

  Task: Cleaning and leveling (ID: 58)
    Status: in_progress
    ✅ Has 1 predecessor dependencies:
      - Survey Works (ID: 57) [finish_to_start]
```

## What to Check

1. **If dependency creation shows "CREATED SUCCESSFULLY"** but it doesn't appear on the tasks page:
   - Check the PROJECT API DEBUG logs
   - The dependency might exist in the database but not being included in the query
   - Look for the task ID and see if dependencies are present

2. **If dependency creation shows "ALREADY EXISTS"**:
   - Note the Dependency ID
   - Try deleting it first and recreating it

3. **If you see "Self-dependency detected"**:
   - This confirms the bug we found
   - Run the fix script to remove invalid dependencies

## Manual Database Check

You can also verify directly in the console:

```javascript
// Check what dependencies exist for a specific task
const token = localStorage.getItem('token');
const taskId = 58; // Change this to your task ID

fetch(`http://localhost:3000/api/tasks/${taskId}/dependencies`, {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => {
  console.log('Dependencies for task', taskId, ':', data);
});
```

## Quick Test Script

Run this in the browser console to test the full flow:

```javascript
const token = localStorage.getItem('token');
const successorTaskId = 58; // Cleaning and leveling
const predecessorTaskId = 57; // Survey Works

// Create dependency
fetch(`http://localhost:3000/api/tasks/${successorTaskId}/dependencies`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    predecessor_task_id: predecessorTaskId,
    dependency_type: 'finish_to_start',
    lag_time: 0
  })
})
.then(r => r.json())
.then(data => {
  console.log('✅ Dependency creation result:', data);
  
  // Now fetch to verify
  return fetch(`http://localhost:3000/api/tasks/${successorTaskId}/dependencies`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
})
.then(r => r.json())
.then(data => {
  console.log('📊 Dependencies after creation:', data);
})
.catch(err => console.error('❌ Error:', err));
```

Watch the console for detailed debug output!
