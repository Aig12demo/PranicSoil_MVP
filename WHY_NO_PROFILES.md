# Why profiles and farms tables aren't populated automatically

## The Problem

When you register a user named "saahi", the following should happen automatically:

1. **User created** in `auth.users` table ✅ (This happened)
2. **Database trigger fires** → Creates record in `profiles` table ❌ (This didn't happen)
3. **Database trigger continues** → Creates record in `farms` table ❌ (This didn't happen)

## Why This Happened

The automatic creation relies on a **database trigger** called `handle_new_user()` that:
- Listens for new users in `auth.users`
- Automatically creates a `profiles` record
- Automatically creates a `farms` record (for farmer/gardener/rancher roles)

**The trigger likely doesn't exist** because:
- Migrations haven't been run yet
- The trigger function wasn't created
- The trigger wasn't attached to the `auth.users` table

## Quick Fix: Create Profile & Farm Manually

Run this script to manually create the missing records:

```bash
cd PranicSoil_MVP
node fix-saahi-user.js
```

This will:
1. Find the "saahi" user in `auth.users`
2. Create the missing `profiles` record
3. Create the missing `farms` record

## Permanent Fix: Run Migrations

To fix this for **future users**, you need to run the database migrations:

### Option 1: Supabase Dashboard (Easiest)

1. Go to https://supabase.com/dashboard → Your Project
2. Click **SQL Editor**
3. Run these migrations in order:
   - `supabase/migrations/00000000000000_initial_schema.sql` (creates tables)
   - All other migrations in chronological order (creates triggers)

### Option 2: Check if Trigger Exists

Run this SQL in Supabase SQL Editor to check:

```sql
-- Check if trigger exists
SELECT 
  trigger_name, 
  event_object_table, 
  action_statement 
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Check if function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'handle_new_user';
```

If these return empty, the trigger doesn't exist - you need to run migrations.

## How to View Tables in Supabase Dashboard

1. Go to https://supabase.com/dashboard → Your Project
2. Click **Table Editor** in the sidebar
3. You should see:
   - `profiles` table
   - `farms` table
   - Other tables (service_agreements, invoices, etc.)

If you don't see these tables, **run the migrations first**.

## After Running Migrations

Once migrations are run:
- New users will automatically get `profiles` and `farms` records
- For existing users (like "saahi"), run `node fix-saahi-user.js` to create them manually

