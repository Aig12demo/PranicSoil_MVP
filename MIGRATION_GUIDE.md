# How to Run Database Migrations

## Quick Method: Supabase Dashboard SQL Editor

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project (zilrthstnuxncufdgiys)

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run Initial Schema**
   - Copy the entire contents of: `supabase/migrations/00000000000000_initial_schema.sql`
   - Paste into SQL Editor
   - Click "Run" (or press Ctrl+Enter)

4. **Run Remaining Migrations** (in order):
   - Copy and paste each migration file from `supabase/migrations/` folder
   - Files are already sorted by timestamp (chronological order)
   - Run them one by one or combine them

5. **Verify Tables Created**
   - Go to "Table Editor" in the sidebar
   - You should see: profiles, farms, service_agreements, invoices, etc.

## Alternative: Using Supabase CLI

```powershell
# Install Supabase CLI first
npm install -g supabase

# Link to your project
cd PranicSoil_MVP
supabase link --project-ref zilrthstnuxncufdgiys

# Push migrations
supabase db push
```

## After Migrations Are Complete

Run the admin creation script:
```powershell
cd PranicSoil_MVP
node create-admin.js
```

This will create the admin user profile for: rkaruturi@gmail.com

