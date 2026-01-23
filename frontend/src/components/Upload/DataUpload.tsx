import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useUploadData, useCalculateRisks, useDownloadTemplate } from '../../hooks/useApi';
import { showToast } from '../common/Toast';
import type { UploadResponse } from '../../types';

type DataType = 'cases' | 'environmental';

export default function DataUpload() {
  const [selectedType, setSelectedType] = useState<DataType>('cases');
  const [result, setResult] = useState<UploadResponse | null>(null);

  const uploadMutation = useUploadData();
  const calculateRisksMutation = useCalculateRisks();
  const downloadTemplateMutation = useDownloadTemplate();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      setResult(null);

      try {
        const response = await uploadMutation.mutateAsync({ file, dataType: selectedType });
        setResult(response);
        if (response.success) {
          showToast.success(`Successfully imported ${response.records_imported} records`);
        } else {
          showToast.error(response.message || 'Upload failed');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        showToast.error(message);
      }
    },
    [selectedType, uploadMutation]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    disabled: uploadMutation.isPending,
  });

  const handleRecalculateRisks = async () => {
    try {
      await calculateRisksMutation.mutateAsync();
      setResult({
        success: true,
        message: 'Risk scores recalculated successfully',
        records_imported: 0,
        records_failed: 0,
        errors: [],
      });
      showToast.success('Risk scores recalculated successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Recalculation failed';
      showToast.error(message);
    }
  };

  const handleDownloadTemplate = async (dataType: DataType) => {
    try {
      await downloadTemplateMutation.mutateAsync(dataType);
      showToast.success(`${dataType === 'cases' ? 'Case' : 'Environmental'} data template downloaded`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Download failed';
      showToast.error(message);
    }
  };

  const isUploading = uploadMutation.isPending || calculateRisksMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#111518]">Data Management</h2>
          <p className="text-sm text-[#637588] mt-1">Import case data and environmental observations</p>
        </div>
      </div>

      {/* Data Type Selector */}
      <div className="bg-white rounded-xl border border-[#e6e8eb] p-2 flex gap-2">
        <button
          onClick={() => setSelectedType('cases')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-colors ${
            selectedType === 'cases'
              ? 'bg-primary text-white'
              : 'text-[#637588] hover:bg-[#f0f2f5]'
          }`}
          aria-pressed={selectedType === 'cases'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>coronavirus</span>
          Case Data
        </button>
        <button
          onClick={() => setSelectedType('environmental')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-colors ${
            selectedType === 'environmental'
              ? 'bg-primary text-white'
              : 'text-[#637588] hover:bg-[#f0f2f5]'
          }`}
          aria-pressed={selectedType === 'environmental'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>water_drop</span>
          Environmental Data
        </button>
      </div>

      {/* Upload Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dropzone */}
        <div className="bg-white rounded-xl border border-[#e6e8eb] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px' }}>upload_file</span>
            </div>
            <div>
              <h3 className="font-bold text-[#111518]">Upload File</h3>
              <p className="text-sm text-[#637588]">Import {selectedType === 'cases' ? 'case' : 'environmental'} data</p>
            </div>
          </div>

          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-[#e6e8eb] hover:border-[#637588]'
            } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            role="button"
            aria-label="Drop zone for file upload"
          >
            <input {...getInputProps()} aria-label="File input" />
            {isUploading ? (
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-3" aria-hidden="true"></div>
                <p className="text-sm font-medium text-[#111518]">Uploading...</p>
              </div>
            ) : (
              <>
                <span className="material-symbols-outlined text-[#637588] mb-3" style={{ fontSize: '48px' }}>cloud_upload</span>
                <p className="text-sm font-medium text-[#111518]">
                  {isDragActive ? 'Drop the file here' : 'Drag and drop a file, or click to select'}
                </p>
                <p className="text-xs text-[#637588] mt-2">Supports CSV, XLS, XLSX files</p>
              </>
            )}
          </div>

          {/* Download Template Button */}
          <button
            onClick={() => handleDownloadTemplate(selectedType)}
            disabled={downloadTemplateMutation.isPending}
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors disabled:opacity-50"
            aria-label={`Download ${selectedType} data template`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
            {downloadTemplateMutation.isPending ? 'Downloading...' : 'Download Template'}
          </button>
        </div>

        {/* Template Info */}
        <div className="bg-white rounded-xl border border-[#e6e8eb] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#f0f2f5] flex items-center justify-center">
              <span className="material-symbols-outlined text-[#637588]" style={{ fontSize: '20px' }}>info</span>
            </div>
            <div>
              <h3 className="font-bold text-[#111518]">Required Columns</h3>
              <p className="text-sm text-[#637588]">For {selectedType === 'cases' ? 'case' : 'environmental'} data</p>
            </div>
          </div>

          {selectedType === 'cases' ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-[#f0f2f5] rounded-lg">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>location_on</span>
                <div>
                  <p className="text-sm font-medium text-[#111518]">lga_name</p>
                  <p className="text-xs text-[#637588]">Local Government Area name (or 'lga')</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-[#f0f2f5] rounded-lg">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>calendar_today</span>
                <div>
                  <p className="text-sm font-medium text-[#111518]">report_date</p>
                  <p className="text-xs text-[#637588]">Date of the report (or 'date')</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-[#f0f2f5] rounded-lg">
                <span className="material-symbols-outlined text-alert-orange" style={{ fontSize: '18px' }}>coronavirus</span>
                <div>
                  <p className="text-sm font-medium text-[#111518]">new_cases</p>
                  <p className="text-xs text-[#637588]">Number of new cases (or 'cases')</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-[#f0f2f5] rounded-lg">
                <span className="material-symbols-outlined text-red-500" style={{ fontSize: '18px' }}>warning</span>
                <div>
                  <p className="text-sm font-medium text-[#111518]">deaths <span className="text-xs text-[#637588] font-normal">(optional)</span></p>
                  <p className="text-xs text-[#637588]">Number of deaths reported</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-[#f0f2f5] rounded-lg">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>location_on</span>
                <div>
                  <p className="text-sm font-medium text-[#111518]">lga_name</p>
                  <p className="text-xs text-[#637588]">Local Government Area name (or 'lga')</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-[#f0f2f5] rounded-lg">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>calendar_today</span>
                <div>
                  <p className="text-sm font-medium text-[#111518]">observation_date</p>
                  <p className="text-xs text-[#637588]">Date of observation (or 'date')</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-[#f0f2f5] rounded-lg">
                <span className="material-symbols-outlined text-env-green" style={{ fontSize: '18px' }}>water_drop</span>
                <div>
                  <p className="text-sm font-medium text-[#111518]">rainfall_mm <span className="text-xs text-[#637588] font-normal">(optional)</span></p>
                  <p className="text-xs text-[#637588]">Rainfall in millimeters</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-[#f0f2f5] rounded-lg">
                <span className="material-symbols-outlined text-env-green" style={{ fontSize: '18px' }}>flood</span>
                <div>
                  <p className="text-sm font-medium text-[#111518]">ndwi, flood_observed <span className="text-xs text-[#637588] font-normal">(optional)</span></p>
                  <p className="text-xs text-[#637588]">Water index and flooding status</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Result message */}
      {result && (
        <div
          className={`rounded-xl p-4 ${
            result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}
          role="alert"
        >
          <div className="flex items-start gap-3">
            <span className={`material-symbols-outlined ${result.success ? 'text-env-green' : 'text-red-500'}`} style={{ fontSize: '24px' }}>
              {result.success ? 'check_circle' : 'error'}
            </span>
            <div className="flex-1">
              <p className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>{result.message}</p>
              {result.records_imported > 0 && (
                <p className="text-sm text-green-700 mt-1">
                  Imported: {result.records_imported} records
                </p>
              )}
              {result.records_failed > 0 && (
                <p className="text-sm text-red-700 mt-1">Failed: {result.records_failed} records</p>
              )}
              {result.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-red-800">Errors:</p>
                  <ul className="text-xs text-red-700 mt-1 space-y-1 list-disc list-inside">
                    {result.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {result.errors.length > 5 && (
                      <li>...and {result.errors.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Risk Recalculation Section */}
      <div className="bg-white rounded-xl border border-[#e6e8eb] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-alert-orange/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-alert-orange" style={{ fontSize: '20px' }}>calculate</span>
          </div>
          <div>
            <h3 className="font-bold text-[#111518]">Risk Score Calculation</h3>
            <p className="text-sm text-[#637588]">Recalculate risk scores based on latest data</p>
          </div>
        </div>

        <p className="text-sm text-[#637588] mb-4">
          After uploading new case or environmental data, you can recalculate all LGA risk scores
          to reflect the updated information. This process analyzes recent cases, environmental
          conditions, and historical patterns.
        </p>

        <button
          onClick={handleRecalculateRisks}
          disabled={isUploading}
          className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-alert-orange text-white rounded-lg hover:bg-alert-orange/90 transition-colors disabled:opacity-50 text-sm font-medium"
          aria-label="Recalculate all risk scores"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>refresh</span>
          {calculateRisksMutation.isPending ? 'Recalculating...' : 'Recalculate All Risk Scores'}
        </button>
      </div>

      {/* System Settings */}
      <div className="bg-white rounded-xl border border-[#e6e8eb] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#f0f2f5] flex items-center justify-center">
            <span className="material-symbols-outlined text-[#637588]" style={{ fontSize: '20px' }}>settings</span>
          </div>
          <div>
            <h3 className="font-bold text-[#111518]">System Settings</h3>
            <p className="text-sm text-[#637588]">Configure application parameters</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#f0f2f5] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[#111518]">Data Retention</span>
              <span className="text-sm font-bold text-primary">90 days</span>
            </div>
            <p className="text-xs text-[#637588]">Historical data older than this is archived</p>
          </div>
          <div className="bg-[#f0f2f5] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[#111518]">Auto-Refresh Interval</span>
              <span className="text-sm font-bold text-primary">5 min</span>
            </div>
            <p className="text-xs text-[#637588]">Dashboard data refresh frequency</p>
          </div>
          <div className="bg-[#f0f2f5] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[#111518]">High Risk Threshold</span>
              <span className="text-sm font-bold text-red-600">0.7</span>
            </div>
            <p className="text-xs text-[#637588]">Score threshold for critical alerts</p>
          </div>
          <div className="bg-[#f0f2f5] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[#111518]">Medium Risk Threshold</span>
              <span className="text-sm font-bold text-yellow-600">0.4</span>
            </div>
            <p className="text-xs text-[#637588]">Score threshold for warning alerts</p>
          </div>
        </div>
      </div>
    </div>
  );
}
