import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Document } from '../types/database';
import { FileText, Upload, Loader2, Download, X } from 'lucide-react';

interface DocumentsListProps {
  profileId?: string;
  isAdminView?: boolean;
}

export function DocumentsList({ profileId, isAdminView }: DocumentsListProps = {}) {
  const { profile } = useAuth();
  const targetProfileId = profileId || profile?.id;
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadData, setUploadData] = useState({
    file_name: '',
    file_url: '',
    description: '',
  });

  useEffect(() => {
    loadDocuments();
  }, [targetProfileId]);

  const loadDocuments = async () => {
    if (!targetProfileId) return;

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('profile_id', targetProfileId)
      .order('uploaded_at', { ascending: false });

    if (!error && data) {
      setDocuments(data);
    }
    setLoading(false);
  };

  const handleUpload = async () => {
    if (!targetProfileId || !uploadData.file_name.trim() || !uploadData.file_url.trim()) return;

    setUploading(true);

    try {
      const { error } = await supabase.from('documents').insert({
        profile_id: targetProfileId,
        file_name: uploadData.file_name,
        file_url: uploadData.file_url,
        description: uploadData.description,
      });

      if (error) throw error;

      setUploadData({ file_name: '', file_url: '', description: '' });
      setShowUpload(false);
      loadDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    const { error } = await supabase.from('documents').delete().eq('id', docId);

    if (!error) {
      loadDocuments();
    }
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600 mt-2">
            {isAdminView ? 'Manage customer documents' : 'Upload soil tests, photos, and farm plans for personalized advice'}
          </p>
        </div>
        {(isAdminView || !isAdminView) && (
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Upload className="w-5 h-5" />
            Upload Document
          </button>
        )}
      </div>

      {showUpload && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Upload New Document</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Name
              </label>
              <input
                type="text"
                value={uploadData.file_name}
                onChange={(e) => setUploadData({ ...uploadData, file_name: e.target.value })}
                placeholder="e.g., Soil Test Results 2024"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document URL
              </label>
              <input
                type="url"
                value={uploadData.file_url}
                onChange={(e) => setUploadData({ ...uploadData, file_url: e.target.value })}
                placeholder="https://example.com/document.pdf"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter a link to your document (Google Drive, Dropbox, etc.)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (optional)
              </label>
              <textarea
                value={uploadData.description}
                onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                rows={3}
                placeholder="Add notes about this document"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowUpload(false);
                  setUploadData({ file_name: '', file_url: '', description: '' });
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !uploadData.file_name.trim() || !uploadData.file_url.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Upload
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {documents.length === 0 ? (
          <div className="col-span-full bg-white rounded-lg shadow p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              No documents uploaded yet. Add your first document to get started!
            </p>
          </div>
        ) : (
          documents.map((doc) => (
            <div key={doc.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex gap-2">
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-green-600"
                  >
                    <Download className="w-5 h-5" />
                  </a>
                  {(isAdminView || !isAdminView) && (
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 truncate">{doc.file_name}</h3>
              {doc.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{doc.description}</p>
              )}
              <p className="text-xs text-gray-500">
                {doc.uploaded_at && new Date(doc.uploaded_at).toLocaleDateString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
