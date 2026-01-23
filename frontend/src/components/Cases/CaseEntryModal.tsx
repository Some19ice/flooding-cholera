import { useState, useEffect } from 'react';
import { useLgas } from '../../hooks/useApi';
import { showToast } from '../common/Toast';

interface CaseEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CaseFormData {
  // Location
  lga_id: string;
  ward: string;
  village: string;

  // Patient
  age: string;
  age_unit: 'years' | 'months';
  sex: 'M' | 'F' | '';

  // Clinical
  onset_date: string;
  symptoms: {
    watery_diarrhea: boolean;
    vomiting: boolean;
    dehydration: boolean;
    fever: boolean;
  };
  severity: 'mild' | 'moderate' | 'severe' | '';

  // GPS
  latitude: string;
  longitude: string;
}

interface FormErrors {
  [key: string]: string;
}

const initialFormData: CaseFormData = {
  lga_id: '',
  ward: '',
  village: '',
  age: '',
  age_unit: 'years',
  sex: '',
  onset_date: '',
  symptoms: {
    watery_diarrhea: false,
    vomiting: false,
    dehydration: false,
    fever: false,
  },
  severity: '',
  latitude: '',
  longitude: '',
};

export default function CaseEntryModal({ isOpen, onClose }: CaseEntryModalProps) {
  const [formData, setFormData] = useState<CaseFormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: lgasData, isLoading: lgasLoading } = useLgas();

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormData);
      setErrors({});
    }
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleInputChange = (
    field: keyof CaseFormData,
    value: string | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSymptomChange = (symptom: keyof CaseFormData['symptoms']) => {
    setFormData((prev) => ({
      ...prev,
      symptoms: {
        ...prev.symptoms,
        [symptom]: !prev.symptoms[symptom],
      },
    }));
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast.error('Geolocation is not supported by your browser');
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
        setIsGettingLocation(false);
        showToast.success('Location captured successfully');
      },
      (error) => {
        setIsGettingLocation(false);
        let errorMessage = 'Failed to get location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        showToast.error(errorMessage);
      }
    );
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Location validation
    if (!formData.lga_id) {
      newErrors.lga_id = 'LGA is required';
    }
    if (!formData.ward.trim()) {
      newErrors.ward = 'Ward is required';
    }
    if (!formData.village.trim()) {
      newErrors.village = 'Village is required';
    }

    // Patient validation
    if (!formData.age.trim()) {
      newErrors.age = 'Age is required';
    } else if (isNaN(Number(formData.age)) || Number(formData.age) <= 0) {
      newErrors.age = 'Age must be a positive number';
    }
    if (!formData.sex) {
      newErrors.sex = 'Sex is required';
    }

    // Clinical validation
    if (!formData.onset_date) {
      newErrors.onset_date = 'Onset date is required';
    } else {
      const onsetDate = new Date(formData.onset_date);
      const today = new Date();
      if (onsetDate > today) {
        newErrors.onset_date = 'Onset date cannot be in the future';
      }
    }

    const hasSymptoms = Object.values(formData.symptoms).some((v) => v);
    if (!hasSymptoms) {
      newErrors.symptoms = 'At least one symptom must be selected';
    }

    if (!formData.severity) {
      newErrors.severity = 'Severity is required';
    }

    // GPS validation (optional but if provided, must be valid)
    if (formData.latitude && isNaN(Number(formData.latitude))) {
      newErrors.latitude = 'Latitude must be a valid number';
    }
    if (formData.longitude && isNaN(Number(formData.longitude))) {
      newErrors.longitude = 'Longitude must be a valid number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast.error('Please fix the errors in the form');
      return;
    }

    setIsSubmitting(true);

    // Demo: Just log the data and show success
    console.log('Case Entry Data:', {
      ...formData,
      age: Number(formData.age),
      latitude: formData.latitude ? Number(formData.latitude) : null,
      longitude: formData.longitude ? Number(formData.longitude) : null,
      submitted_at: new Date().toISOString(),
    });

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      showToast.success('Case reported successfully!');
      onClose();
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          aria-hidden="true"
          onClick={onClose}
        ></div>

        {/* Modal panel */}
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
          {/* Header */}
          <div className="bg-blue-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white" id="modal-title">
                Quick Case Entry
              </h3>
              <button
                type="button"
                className="text-white hover:text-gray-200 transition-colors"
                onClick={onClose}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white">
            <div className="max-h-[calc(100vh-12rem)] overflow-y-auto px-6 py-4">
              {/* Location Section */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Location
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label htmlFor="lga_id" className="block text-sm font-medium text-gray-700 mb-1">
                      LGA <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="lga_id"
                      value={formData.lga_id}
                      onChange={(e) => handleInputChange('lga_id', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.lga_id ? 'border-red-500' : 'border-gray-300'
                      }`}
                      disabled={lgasLoading}
                    >
                      <option value="">Select LGA</option>
                      {lgasData?.lgas.map((lga) => (
                        <option key={lga.id} value={lga.id}>
                          {lga.name}
                        </option>
                      ))}
                    </select>
                    {errors.lga_id && <p className="mt-1 text-xs text-red-500">{errors.lga_id}</p>}
                  </div>

                  <div>
                    <label htmlFor="ward" className="block text-sm font-medium text-gray-700 mb-1">
                      Ward <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="ward"
                      value={formData.ward}
                      onChange={(e) => handleInputChange('ward', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.ward ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter ward name"
                    />
                    {errors.ward && <p className="mt-1 text-xs text-red-500">{errors.ward}</p>}
                  </div>

                  <div>
                    <label htmlFor="village" className="block text-sm font-medium text-gray-700 mb-1">
                      Village <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="village"
                      value={formData.village}
                      onChange={(e) => handleInputChange('village', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.village ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter village name"
                    />
                    {errors.village && <p className="mt-1 text-xs text-red-500">{errors.village}</p>}
                  </div>
                </div>
              </div>

              {/* Patient Section */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Patient Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">
                      Age <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      id="age"
                      min="0"
                      value={formData.age}
                      onChange={(e) => handleInputChange('age', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.age ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Age"
                    />
                    {errors.age && <p className="mt-1 text-xs text-red-500">{errors.age}</p>}
                  </div>

                  <div>
                    <label htmlFor="age_unit" className="block text-sm font-medium text-gray-700 mb-1">
                      Unit <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="age_unit"
                      value={formData.age_unit}
                      onChange={(e) => handleInputChange('age_unit', e.target.value as 'years' | 'months')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="years">Years</option>
                      <option value="months">Months</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="sex" className="block text-sm font-medium text-gray-700 mb-1">
                      Sex <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="sex"
                      value={formData.sex}
                      onChange={(e) => handleInputChange('sex', e.target.value as 'M' | 'F')}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.sex ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select</option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                    </select>
                    {errors.sex && <p className="mt-1 text-xs text-red-500">{errors.sex}</p>}
                  </div>
                </div>
              </div>

              {/* Clinical Section */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Clinical Information
                </h4>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="onset_date" className="block text-sm font-medium text-gray-700 mb-1">
                      Onset Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      id="onset_date"
                      value={formData.onset_date}
                      onChange={(e) => handleInputChange('onset_date', e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.onset_date ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.onset_date && <p className="mt-1 text-xs text-red-500">{errors.onset_date}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Symptoms <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { key: 'watery_diarrhea', label: 'Watery Diarrhea' },
                        { key: 'vomiting', label: 'Vomiting' },
                        { key: 'dehydration', label: 'Dehydration' },
                        { key: 'fever', label: 'Fever' },
                      ].map((symptom) => (
                        <label key={symptom.key} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.symptoms[symptom.key as keyof typeof formData.symptoms]}
                            onChange={() => handleSymptomChange(symptom.key as keyof typeof formData.symptoms)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{symptom.label}</span>
                        </label>
                      ))}
                    </div>
                    {errors.symptoms && <p className="mt-1 text-xs text-red-500">{errors.symptoms}</p>}
                  </div>

                  <div>
                    <label htmlFor="severity" className="block text-sm font-medium text-gray-700 mb-1">
                      Severity <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="severity"
                      value={formData.severity}
                      onChange={(e) => handleInputChange('severity', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.severity ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select severity</option>
                      <option value="mild">Mild</option>
                      <option value="moderate">Moderate</option>
                      <option value="severe">Severe</option>
                    </select>
                    {errors.severity && <p className="mt-1 text-xs text-red-500">{errors.severity}</p>}
                  </div>
                </div>
              </div>

              {/* GPS Section */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  GPS Coordinates (Optional)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="latitude" className="block text-sm font-medium text-gray-700 mb-1">
                      Latitude
                    </label>
                    <input
                      type="text"
                      id="latitude"
                      value={formData.latitude}
                      onChange={(e) => handleInputChange('latitude', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.latitude ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="e.g., 5.870000"
                    />
                    {errors.latitude && <p className="mt-1 text-xs text-red-500">{errors.latitude}</p>}
                  </div>

                  <div>
                    <label htmlFor="longitude" className="block text-sm font-medium text-gray-700 mb-1">
                      Longitude
                    </label>
                    <input
                      type="text"
                      id="longitude"
                      value={formData.longitude}
                      onChange={(e) => handleInputChange('longitude', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.longitude ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="e.g., 8.590000"
                    />
                    {errors.longitude && <p className="mt-1 text-xs text-red-500">{errors.longitude}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      disabled={isGettingLocation}
                      className="w-full sm:w-auto px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGettingLocation ? (
                        <>
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Getting Location...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Get Current Location
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  'Submit Case'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
