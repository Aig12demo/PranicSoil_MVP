import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { FileText, Trash2, Eye, Calendar, Loader2, ExternalLink } from 'lucide-react';

interface SoilTestReport {
  id: string;
  profile_id: string;
  farm_id: string | null;
  client_name: string | null;
  grower_name: string | null;
  report_date: string | null;
  date_received: string | null;
  field_id: string | null;
  sample_id: string | null;
  ph_soil: number | null;
  ph_buffer: number | null;
  phosphorus_op: number | null;
  phosphorus_m3: number | null;
  potassium: number | null;
  calcium: number | null;
  magnesium: number | null;
  sulfur: number | null;
  boron: number | null;
  copper: number | null;
  iron: number | null;
  manganese: number | null;
  zinc: number | null;
  sodium: number | null;
  soluble_salts: number | null;
  organic_matter: number | null;
  estimated_n_release: number | null;
  nitrate_nitrogen: number | null;
  cec: number | null;
  sat_k_percent: number | null;
  sat_k_meq: number | null;
  sat_ca_percent: number | null;
  sat_ca_meq: number | null;
  sat_mg_percent: number | null;
  sat_mg_meq: number | null;
  sat_h_percent: number | null;
  sat_h_meq: number | null;
  sat_na_percent: number | null;
  sat_na_meq: number | null;
  k_mg_ratio: number | null;
  ca_mg_ratio: number | null;
  report_image_url: string | null;
  extraction_status: string;
  created_at: string;
}

interface SoilTestReportsProps {
  profileId?: string;
  isAdminView?: boolean;
  refreshTrigger?: number;
}

export function SoilTestReports({ profileId, isAdminView, refreshTrigger }: SoilTestReportsProps) {
  const { profile } = useAuth();
  const targetProfileId = profileId || profile?.id;
  const [reports, setReports] = useState<SoilTestReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<SoilTestReport | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadReports();
  }, [targetProfileId, refreshTrigger]);

  const loadReports = async () => {
    if (!targetProfileId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('soil_test_reports')
      .select('*')
      .eq('profile_id', targetProfileId)
      .order('report_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (!error && data) {
      setReports(data);
    }
    setLoading(false);
  };

  const handleDelete = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this soil test report?')) return;

    const { error } = await supabase
      .from('soil_test_reports')
      .delete()
      .eq('id', reportId);

    if (error) {
      console.error('Error deleting report:', error);
      alert('Failed to delete report');
    } else {
      loadReports();
    }
  };

  const handleViewDetails = (report: SoilTestReport) => {
    setSelectedReport(report);
    setShowDetails(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div>
      {!showDetails ? (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Soil Test Reports</h2>

          {reports.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No soil test reports yet. Upload your first report to get started!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div key={report.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {report.sample_id || report.field_id || 'Untitled Report'}
                        </h3>
                        {report.report_date && (
                          <span className="text-sm text-gray-500 flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(report.report_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                        {report.grower_name && (
                          <div>
                            <span className="font-medium">Grower:</span> {report.grower_name}
                          </div>
                        )}
                        {report.client_name && (
                          <div>
                            <span className="font-medium">Client:</span> {report.client_name}
                          </div>
                        )}
                        {report.ph_soil !== null && (
                          <div>
                            <span className="font-medium">pH:</span> {report.ph_soil}
                          </div>
                        )}
                        {report.cec !== null && (
                          <div>
                            <span className="font-medium">CEC:</span> {report.cec} meq/100g
                          </div>
                        )}
                        {report.potassium !== null && (
                          <div>
                            <span className="font-medium">K:</span> {report.potassium} ppm
                          </div>
                        )}
                        {report.phosphorus_op !== null && (
                          <div>
                            <span className="font-medium">P (OP):</span> {report.phosphorus_op} ppm
                          </div>
                        )}
                        {report.phosphorus_m3 !== null && (
                          <div>
                            <span className="font-medium">P (M3):</span> {report.phosphorus_m3} ppm
                          </div>
                        )}
                        {report.organic_matter !== null && (
                          <div>
                            <span className="font-medium">OM:</span> {report.organic_matter}%
                          </div>
                        )}
                      </div>

                      {report.report_image_url && (
                        <a
                          href={report.report_image_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View Original Image
                        </a>
                      )}
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleViewDetails(report)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      {(isAdminView || !isAdminView) && (
                        <button
                          onClick={() => handleDelete(report.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete Report"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <button
            onClick={() => setShowDetails(false)}
            className="mb-4 text-gray-600 hover:text-gray-900 flex items-center gap-2"
          >
            ← Back to List
          </button>

          {selectedReport && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Report Details</h2>

              {selectedReport.report_image_url && (
                <div className="mb-6">
                  <img
                    src={selectedReport.report_image_url}
                    alt="Soil Test Report"
                    className="max-w-full rounded-lg shadow"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Client/Grower Info */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Client & Grower Information</h3>
                  <div className="space-y-2 text-sm">
                    {selectedReport.client_name && (
                      <div><span className="font-medium">Client:</span> {selectedReport.client_name}</div>
                    )}
                    {selectedReport.grower_name && (
                      <div><span className="font-medium">Grower:</span> {selectedReport.grower_name}</div>
                    )}
                    {selectedReport.report_date && (
                      <div><span className="font-medium">Report Date:</span> {new Date(selectedReport.report_date).toLocaleDateString()}</div>
                    )}
                    {selectedReport.sample_id && (
                      <div><span className="font-medium">Sample ID:</span> {selectedReport.sample_id}</div>
                    )}
                    {selectedReport.field_id && (
                      <div><span className="font-medium">Field ID:</span> {selectedReport.field_id}</div>
                    )}
                  </div>
                </div>

                {/* Key Metrics */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Key Metrics</h3>
                  <div className="space-y-2 text-sm">
                    {selectedReport.ph_soil !== null && (
                      <div><span className="font-medium">Soil pH:</span> {selectedReport.ph_soil}</div>
                    )}
                    {selectedReport.cec !== null && (
                      <div><span className="font-medium">CEC:</span> {selectedReport.cec} meq/100g</div>
                    )}
                    {selectedReport.organic_matter !== null && (
                      <div><span className="font-medium">Organic Matter:</span> {selectedReport.organic_matter}%</div>
                    )}
                    {selectedReport.potassium !== null && (
                      <div><span className="font-medium">Potassium (K):</span> {selectedReport.potassium} ppm</div>
                    )}
                    {selectedReport.calcium !== null && (
                      <div><span className="font-medium">Calcium (Ca):</span> {selectedReport.calcium} ppm</div>
                    )}
                    {selectedReport.magnesium !== null && (
                      <div><span className="font-medium">Magnesium (Mg):</span> {selectedReport.magnesium} ppm</div>
                    )}
                  </div>
                </div>

                {/* Base Saturation */}
                {(selectedReport.sat_ca_percent !== null || selectedReport.sat_mg_percent !== null) && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Base Saturation</h3>
                    <div className="space-y-2 text-sm">
                      {selectedReport.sat_k_percent !== null && (
                        <div>K: {selectedReport.sat_k_percent}% ({selectedReport.sat_k_meq || 0} meq)</div>
                      )}
                      {selectedReport.sat_ca_percent !== null && (
                        <div>Ca: {selectedReport.sat_ca_percent}% ({selectedReport.sat_ca_meq || 0} meq)</div>
                      )}
                      {selectedReport.sat_mg_percent !== null && (
                        <div>Mg: {selectedReport.sat_mg_percent}% ({selectedReport.sat_mg_meq || 0} meq)</div>
                      )}
                      {selectedReport.sat_h_percent !== null && (
                        <div>H: {selectedReport.sat_h_percent}% ({selectedReport.sat_h_meq || 0} meq)</div>
                      )}
                      {selectedReport.sat_na_percent !== null && (
                        <div>Na: {selectedReport.sat_na_percent}% ({selectedReport.sat_na_meq || 0} meq)</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Ratios */}
                {(selectedReport.k_mg_ratio !== null || selectedReport.ca_mg_ratio !== null) && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Ratios</h3>
                    <div className="space-y-2 text-sm">
                      {selectedReport.k_mg_ratio !== null && (
                        <div><span className="font-medium">K/Mg:</span> {selectedReport.k_mg_ratio}</div>
                      )}
                      {selectedReport.ca_mg_ratio !== null && (
                        <div><span className="font-medium">Ca/Mg:</span> {selectedReport.ca_mg_ratio}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

