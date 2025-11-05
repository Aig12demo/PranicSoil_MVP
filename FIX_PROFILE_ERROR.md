# 🔧 FIX: Profile Setup Required Error

## The Problem
Your admin profile exists in the database, but RLS (Row Level Security) policies are blocking access to it.

## The Solution
Run the SQL fix script in Supabase Dashboard.

## Step-by-Step Instructions

### Step 1: Open Supabase Dashboard
1. Go to: https://supabase.com/dashboard
2. Select your project

### Step 2: Open SQL Editor
1. Click **"SQL Editor"** in the left sidebar
2. Click **"New Query"** (or use existing editor)

### Step 3: Copy and Run the Fix
1. Open file: `fix-rls-policies.sql` (in your project folder)
2. **Select ALL** contents (Ctrl+A)
3. **Copy** (Ctrl+C)
4. **Paste** into SQL Editor
5. Click **"Run"** button (or press Ctrl+Enter)
6. Wait for success message: "Success. No rows returned"

### Step 4: Verify It Works
1. Refresh your browser (or restart your app)
2. Try logging in again with:
   - Email: `rkaruturi@gmail.com`
   - Password: `Test123`

### Step 5: Test
Run this command to verify:
```bash
node test-admin-login.js
```

You should see:
- ✅ Login successful
- ✅ Profile found
- ✅ Role: admin

## What the Fix Does
- Removes the broken RLS policies
- Creates new policies that allow:
  - Users to view their own profiles
  - Admins to view all profiles
  - Proper access without infinite recursion

## Still Having Issues?
If you still see errors after running the SQL:
1. Check the SQL Editor for any error messages
2. Make sure you copied the ENTIRE file
3. Try running it again

