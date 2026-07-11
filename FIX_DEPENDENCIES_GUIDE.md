# Fix Task Dependencies

## Problem Summary
Based on the console logs, we identified these issues:
1. **Survey Works (ID: 57)** has a self-dependency (depends on itself)
2. **Cleaning and leveling (ID: 58)** is missing its dependency on Survey Works
3. Field data API was not validating dependencies before allowing edits

## Fixes Implemented

### 1. Created Admin Endpoint: `/api/admin/fix-dependencies`
- **GET**: Detects all invalid dependencies (self-dependencies and circular dependencies)
- **POST**: Automatically fixes self-dependencies by deleting them

### 2. Added Dependency Validation to Field Data API
- `/api/fieldData` (POST) - Now checks dependencies before creating field data
- `/api/fieldData/[id]` (PUT) - Now checks dependencies before updating field data

### 3. Enhanced Task Dependency Validation
- The existing `/api/tasks/[task_id]/dependencies` endpoint already prevents self-dependencies
- Self-dependencies in the database were likely created through data imports or direct database manipulation

## How to Fix Your Database

### Option 1: Using Browser Console (Easiest)
1. Open your browser console (F12)
2. Go to your PMO application
3. Make sure you're logged in as admin
4. Copy and paste this code:

```javascript
// Get your auth token
const token = localStorage.getItem('token');

// Check for issues first
fetch('http://localhost:3000/api/admin/fix-dependencies', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => {
  console.log('=== DEPENDENCY ISSUES FOUND ===');
  console.log(data);
  
  // If issues found, fix them
  if (data.issues?.selfDependencies?.length > 0) {
    console.log('\n=== FIXING ISSUES ===');
    return fetch('http://localhost:3000/api/admin/fix-dependencies', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }).then(res => res.json());
  }
  return null;
})
.then(result => {
  if (result) {
    console.log('=== FIX RESULTS ===');
    console.log(result);
    alert('Dependencies fixed! Refresh the page to see changes.');
  } else {
    console.log('No issues to fix.');
  }
})
.catch(err => console.error('Error:', err));
```

### Option 2: Using the Bash Script
1. Open `fix-dependencies.sh` in the project root
2. Replace the token placeholder with your actual JWT token from `localStorage.getItem('token')`
3. Run: `./fix-dependencies.sh`

### Option 3: Direct API Call
Using curl or Postman:
```bash
# Check for issues
curl -X GET "http://localhost:3000/api/admin/fix-dependencies" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"

# Fix issues
curl -X POST "http://localhost:3000/api/admin/fix-dependencies" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

## What Happens After Fixing

1. The self-dependency from Survey Works will be deleted
2. Survey Works will no longer show "Task Dependencies Not Met" warning
3. Field data can be added to Survey Works normally
4. Future dependency creations are now validated to prevent self-dependencies
5. Field data API now enforces dependency checks

## Adding the Correct Dependency

After fixing, if you want Cleaning and leveling to depend on Survey Works:
1. Go to the Project Scheduler page
2. Select "Cleaning and leveling" task
3. Add a dependency to "Survey Works" with type "Finish to Start"

## Prevention

The following validations are now in place:
- ✅ Task dependency API prevents self-dependencies
- ✅ Field data API checks dependencies before allowing edits
- ✅ Admin endpoint available to scan and fix issues
- ✅ Console logging shows dependency status for debugging
