# Soil Test Report Image Transcription - Setup Guide

## Overview
This system uses Google Gemini Vision API to extract structured data from soil test report images and stores them in Supabase.

## Prerequisites
- Google Gemini API key (cheapest option: Gemini Flash)
- Supabase project with storage enabled

## Step 1: Get Google Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy your API key (starts with `AIza...`)

**Cost**: Gemini 1.5 Flash is ~$0.0025 per image (very affordable!)

## Step 2: Set Google Gemini API Key in Supabase

Run this command in PowerShell:

```powershell
cd PranicSoil_MVP
supabase secrets set GOOGLE_GEMINI_API_KEY="AIza_your_api_key_here"
```

Or if you prefer, set it in Supabase Dashboard:
1. Go to your Supabase project
2. Navigate to **Settings > Edge Functions > Secrets**
3. Add new secret:
   - **Name**: `GOOGLE_GEMINI_API_KEY`
   - **Value**: Your API key

## Step 3: Create Supabase Storage Bucket

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"**
4. Configure:
   - **Name**: `soil-test-reports`
   - **Public bucket**: ✅ **Checked** (so images are accessible)
   - **File size limit**: 10 MB (or your preference)
   - **Allowed MIME types**: `image/jpeg,image/png,image/webp`
5. Click **"Create bucket"**

## Step 4: Set Storage Policies

After creating the bucket, you need to set policies so users can upload:

1. Click on the `soil-test-reports` bucket
2. Go to **"Policies"** tab
3. Click **"New Policy"**

**Upload Policy:**
- Policy name: `Allow authenticated users to upload`
- Allowed operation: `INSERT`
- Policy definition:
```sql
(bucket_id = 'soil-test-reports'::text) AND (auth.role() = 'authenticated'::text)
```

**Read Policy:**
- Policy name: `Allow authenticated users to read`
- Allowed operation: `SELECT`
- Policy definition:
```sql
(bucket_id = 'soil-test-reports'::text) AND (auth.role() = 'authenticated'::text)
```

**Delete Policy (optional):**
- Policy name: `Allow users to delete own files`
- Allowed operation: `DELETE`
- Policy definition:
```sql
(bucket_id = 'soil-test-reports'::text) AND (auth.role() = 'authenticated'::text) AND (auth.uid()::text = (storage.foldername(name))[1])
```

## Step 5: Deploy Database Migration

Run the database migration to create the `soil_test_reports` table:

```powershell
cd PranicSoil_MVP
supabase db push
```

Or manually run the SQL in Supabase SQL Editor:
- Go to **SQL Editor** in Supabase Dashboard
- Open `supabase/migrations/20250105140000_create_soil_test_reports.sql`
- Copy and paste the SQL
- Click **Run**

## Step 6: Deploy Edge Function

Deploy the transcription Edge Function:

```powershell
cd PranicSoil_MVP
supabase functions deploy transcribe-soil-test
```

## Step 7: Test the System

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **Sign in to your app**

3. **Navigate to Dashboard > Soil Tests tab**

4. **Upload a test image:**
   - Click or drag-drop a soil test report image
   - Click **"Transcribe Image"**
   - Wait for extraction (usually 5-10 seconds)
   - Review the extracted data
   - Edit any fields if needed
   - Click **"Save Report"**

5. **Verify:**
   - Report appears in the list below
   - Data is saved correctly
   - Image is accessible via the "View Original Image" link

## Troubleshooting

### "GOOGLE_GEMINI_API_KEY not configured"
- Make sure you set the secret in Supabase
- Verify the secret name is exactly `GOOGLE_GEMINI_API_KEY`

### "Failed to upload image to storage"
- Check that the `soil-test-reports` bucket exists
- Verify storage policies are set correctly
- Check file size (must be < 10MB)

### "Failed to transcribe image"
- Check your Gemini API key is valid
- Verify you have API quota remaining
- Check browser console for detailed error messages

### "Failed to parse extracted data"
- The image might be too blurry or low quality
- Try a clearer image
- Check the raw response in browser console

## Data Fields Extracted

The system extracts all fields from the Danaus Consultants report format:

- **Client/Grower Info**: Client name, grower name, locations, dates, IDs
- **pH & Basic**: Soil pH, Buffer pH, Organic Matter, CEC
- **Macronutrients**: Phosphorus (OP & M3), Potassium, Calcium, Magnesium, Sulfur
- **Micronutrients**: Boron, Copper, Iron, Manganese, Zinc, Sodium
- **Base Saturation**: K, Ca, Mg, H, Na (both % and meq)
- **Ratios**: K/Mg, Ca/Mg
- **Other**: Soluble Salts, Estimated N Release, Nitrate Nitrogen

## Cost Estimates

- **Gemini Flash**: ~$0.0025 per image
- **Supabase Storage**: Free tier includes 1GB
- **Example**: 1000 reports = ~$2.50 in API costs

## Next Steps

Once everything is set up:
1. Test with your actual soil test report images
2. Verify all fields are extracted correctly
3. Adjust the Gemini prompt if needed (in Edge Function)
4. Train users on how to use the system

## Support

If you encounter issues:
1. Check Supabase Edge Function logs
2. Check browser console for frontend errors
3. Verify all environment variables are set
4. Test the Gemini API key directly in Google AI Studio

