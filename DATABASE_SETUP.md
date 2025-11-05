# Database Setup Instructions

## Quick Setup

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run the Complete Migration**
   - Open the file: `setup-database.sql`
   - Copy **ALL** the contents
   - Paste into SQL Editor
   - Click "Run" (or press Ctrl+Enter)

4. **Verify Tables Created**
   - Go to "Table Editor" in the sidebar
   - You should see: profiles, farms, service_agreements, invoices, etc.

5. **Fix Existing User "saahi"**
   - After migrations are complete, run:
   ```bash
   cd PranicSoil_MVP
   node fix-saahi-user.js
   ```

## What This Does

✅ Creates all tables (profiles, farms, service_agreements, invoices, etc.)
✅ Sets up Row Level Security (RLS) policies
✅ Creates database trigger that automatically creates profiles/farms for new users
✅ Configures proper permissions

## After Setup

- **New users**: Will automatically get profiles and farms created when they register
- **Existing users**: Run `node fix-saahi-user.js` to create missing records

## Troubleshooting

If you get errors:
- Make sure you're running this as a database admin/superuser
- Check that you have the correct Supabase project selected
- Ensure the SQL Editor has proper permissions

