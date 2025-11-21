import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Upload, X, Loader2, CheckCircle, AlertCircle, FileImage } from 'lucide-react';

interface SoilTestUploadProps {
  profileId?: string;
  isAdminView?: boolean;
  farmId?: string | null;
  onUploadComplete?: () => void;
  onRefreshReports?: () => void;
}

interface ExtractedData {
  client_name?: string | null;
  client_location?: string | null;
  grower_name?: string | null;
  grower_location?: string | null;
  report_date?: string | null;
  date_received?: string | null;
  field_id?: string | null;
  sample_id?: string | null;
  ph_soil?: number | null;
  ph_buffer?: number | null;
  phosphorus_op?: number | null;
  phosphorus_m3?: number | null;
  potassium?: number | null;
  calcium?: number | null;
  magnesium?: number | null;
  sulfur?: number | null;
  boron?: number | null;
  copper?: number | null;
  iron?: number | null;
  manganese?: number | null;
  zinc?: number | null;
  sodium?: number | null;
  soluble_salts?: number | null;
  organic_matter?: number | null;
  estimated_n_release?: number | null;
  nitrate_nitrogen?: number | null;
  cec?: number | null;
  sat_k_percent?: number | null;
  sat_k_meq?: number | null;
  sat_ca_percent?: number | null;
  sat_ca_meq?: number | null;
  sat_mg_percent?: number | null;
  sat_mg_meq?: number | null;
  sat_h_percent?: number | null;
  sat_h_meq?: number | null;
  sat_na_percent?: number | null;
  sat_na_meq?: number | null;
  k_mg_ratio?: number | null;
  ca_mg_ratio?: number | null;
}

export function SoilTestUpload({ profileId, isAdminView, farmId, onUploadComplete, onRefreshReports }: SoilTestUploadProps) {
  const { profile } = useAuth();
  const targetProfileId = profileId || profile?.id;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<ExtractedData>({});

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('File size exceeds 10MB limit');
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setError('Invalid file type. Only JPEG, PNG, and WebP are supported.');
        return;
      }
      setSelectedFile(file);
      setError(null);
      setPreviewUrl(URL.createObjectURL(file));
      setExtractedData(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('File size exceeds 10MB limit');
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setError('Invalid file type. Only JPEG, PNG, and WebP are supported.');
        return;
      }
      setSelectedFile(file);
      setError(null);
      setPreviewUrl(URL.createObjectURL(file));
      setExtractedData(null);
    }
  };

  const handleTranscribe = async () => {
    if (!selectedFile || !targetProfileId) return;

    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('profile_id', targetProfileId);
      if (farmId) {
        formData.append('farm_id', farmId);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-soil-test`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to transcribe image');
      }

      const result = await response.json();
      setExtractedData(result.extracted_data);
      setFormData(result.extracted_data);
      setImageUrl(result.image_url);
    } catch (err) {
      console.error('Transcription error:', err);
      setError(err instanceof Error ? err.message : 'Failed to transcribe image');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!targetProfileId || !imageUrl) return;

    setIsSaving(true);
    setError(null);

    try {
      const { error } = await supabase.from('soil_test_reports').insert({
        profile_id: targetProfileId,
        farm_id: farmId || null,
        report_image_url: imageUrl,
        extraction_status: 'completed',
        extraction_raw_json: extractedData,
        ...formData,
      });

      if (error) throw error;

      // Reset form
      setSelectedFile(null);
      setPreviewUrl(null);
      setExtractedData(null);
      setFormData({});
      setImageUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (onUploadComplete) {
        onUploadComplete();
      }
      if (onRefreshReports) {
        onRefreshReports();
      }
    } catch (err) {
      console.error('Save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save report');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setExtractedData(null);
    setFormData({});
    setImageUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const updateField = (field: keyof ExtractedData, value: string | number | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value === '' ? null : (typeof value === 'string' && !isNaN(Number(value)) ? Number(value) : value),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Upload Soil Test Report</h2>

        {/* File Upload Area */}
        {!extractedData && (
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-green-500 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            {previewUrl ? (
              <div className="space-y-4">
                <img src={previewUrl} alt="Preview" className="max-h-64 mx-auto rounded-lg shadow" />
                <p className="text-sm text-gray-600">{selectedFile?.name}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancel();
                  }}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div>
                <FileImage className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">
                  Drag and drop an image here, or click to select
                </p>
                <p className="text-sm text-gray-500">JPEG, PNG, or WebP (max 10MB)</p>
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        {selectedFile && !extractedData && (
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleTranscribe}
              disabled={isProcessing}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Transcribe Image
                </>
              )}
            </button>
            <button
              onClick={handleCancel}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Extracted Data Review Form */}
        {extractedData && (
          <div className="mt-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Review Extracted Data</h3>
              {previewUrl && (
                <img src={previewUrl} alt="Report" className="h-32 rounded-lg shadow" />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Client/Grower Info */}
              <div className="md:col-span-2">
                <h4 className="font-semibold text-gray-900 mb-3">Client & Grower Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                    <input
                      type="text"
                      value={formData.client_name || ''}
                      onChange={(e) => updateField('client_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Client Location</label>
                    <input
                      type="text"
                      value={formData.client_location || ''}
                      onChange={(e) => updateField('client_location', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Grower Name</label>
                    <input
                      type="text"
                      value={formData.grower_name || ''}
                      onChange={(e) => updateField('grower_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Grower Location</label>
                    <input
                      type="text"
                      value={formData.grower_location || ''}
                      onChange={(e) => updateField('grower_location', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Report Date</label>
                    <input
                      type="date"
                      value={formData.report_date || ''}
                      onChange={(e) => updateField('report_date', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Received</label>
                    <input
                      type="date"
                      value={formData.date_received || ''}
                      onChange={(e) => updateField('date_received', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Field ID</label>
                    <input
                      type="text"
                      value={formData.field_id || ''}
                      onChange={(e) => updateField('field_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sample ID</label>
                    <input
                      type="text"
                      value={formData.sample_id || ''}
                      onChange={(e) => updateField('sample_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* pH and Basic Tests */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">pH & Basic Tests</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Soil pH</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.ph_soil || ''}
                      onChange={(e) => updateField('ph_soil', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Buffer pH</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.ph_buffer || ''}
                      onChange={(e) => updateField('ph_buffer', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Organic Matter (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.organic_matter || ''}
                      onChange={(e) => updateField('organic_matter', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CEC (meq/100g)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.cec || ''}
                      onChange={(e) => updateField('cec', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Macronutrients */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Macronutrients (ppm)</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phosphorus (OP)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.phosphorus_op || ''}
                      onChange={(e) => updateField('phosphorus_op', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phosphorus (M3)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.phosphorus_m3 || ''}
                      onChange={(e) => updateField('phosphorus_m3', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Potassium (K)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.potassium || ''}
                      onChange={(e) => updateField('potassium', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Calcium (Ca)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.calcium || ''}
                      onChange={(e) => updateField('calcium', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Magnesium (Mg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.magnesium || ''}
                      onChange={(e) => updateField('magnesium', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sulfur (S)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.sulfur || ''}
                      onChange={(e) => updateField('sulfur', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Micronutrients */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Micronutrients (ppm)</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Boron (B)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.boron || ''}
                      onChange={(e) => updateField('boron', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Copper (Cu)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.copper || ''}
                      onChange={(e) => updateField('copper', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Iron (Fe)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.iron || ''}
                      onChange={(e) => updateField('iron', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Manganese (Mn)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.manganese || ''}
                      onChange={(e) => updateField('manganese', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Zinc (Zn)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.zinc || ''}
                      onChange={(e) => updateField('zinc', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sodium (Na)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.sodium || ''}
                      onChange={(e) => updateField('sodium', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Base Saturation */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Base Saturation</h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">K %</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.sat_k_percent || ''}
                        onChange={(e) => updateField('sat_k_percent', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">K meq</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.sat_k_meq || ''}
                        onChange={(e) => updateField('sat_k_meq', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Ca %</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.sat_ca_percent || ''}
                        onChange={(e) => updateField('sat_ca_percent', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Ca meq</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.sat_ca_meq || ''}
                        onChange={(e) => updateField('sat_ca_meq', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Mg %</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.sat_mg_percent || ''}
                        onChange={(e) => updateField('sat_mg_percent', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Mg meq</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.sat_mg_meq || ''}
                        onChange={(e) => updateField('sat_mg_meq', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">H %</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.sat_h_percent || ''}
                        onChange={(e) => updateField('sat_h_percent', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">H meq</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.sat_h_meq || ''}
                        onChange={(e) => updateField('sat_h_meq', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Na %</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.sat_na_percent || ''}
                        onChange={(e) => updateField('sat_na_percent', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Na meq</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.sat_na_meq || ''}
                        onChange={(e) => updateField('sat_na_meq', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Ratios & Other */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Ratios & Other</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">K/Mg Ratio</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.k_mg_ratio || ''}
                      onChange={(e) => updateField('k_mg_ratio', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ca/Mg Ratio</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.ca_mg_ratio || ''}
                      onChange={(e) => updateField('ca_mg_ratio', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estimated N Release (lbs/acre)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.estimated_n_release || ''}
                      onChange={(e) => updateField('estimated_n_release', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nitrate Nitrogen</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.nitrate_nitrogen || ''}
                      onChange={(e) => updateField('nitrate_nitrogen', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Soluble Salts</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.soluble_salts || ''}
                      onChange={(e) => updateField('soluble_salts', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Save/Cancel Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={handleCancel}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Save Report
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

