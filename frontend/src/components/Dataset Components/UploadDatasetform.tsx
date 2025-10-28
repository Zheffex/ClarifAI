import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  X,
  Info,
  File,
  Database,
  Image,
  FileSpreadsheet,
  FileCode,
  Download,
  Eye,
  Trash2,
  Plus,
  ArrowRight,
  Clock,
  Zap
} from 'lucide-react';
import { useDataset } from '../../contexts/DatasetContext';
import './DatasetComponent.css';

interface UploadDatasetFormModalProps {
  onUploadSuccess?: () => void;
}

interface DatasetRequirement {
  id: string;
  title: string;
  description: string;
  required: boolean;
  checked: boolean;
}

export const UploadDatasetFormModal: React.FC<UploadDatasetFormModalProps> = ({ onUploadSuccess }) => {
  const { uploadDataset, isLoading } = useDataset();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    file: null as File | null,
    tags: [] as string[],
    isPublic: false,
    category: 'general'
  });

  const [newTag, setNewTag] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Dataset requirements
  const [requirements, setRequirements] = useState<DatasetRequirement[]>([
    {
      id: 'format',
      title: 'Supported File Format',
      description: 'CSV, Excel (.xlsx), JSON, or TSV files are supported',
      required: true,
      checked: false
    },
    {
      id: 'size',
      title: 'File Size Limit',
      description: 'Maximum file size is 100MB for optimal performance',
      required: true,
      checked: false
    },
    {
      id: 'structure',
      title: 'Data Structure',
      description: 'Data should have clear headers and consistent formatting',
      required: true,
      checked: false
    },
    {
      id: 'encoding',
      title: 'Character Encoding',
      description: 'UTF-8 encoding is recommended for best compatibility',
      required: false,
      checked: false
    },
    {
      id: 'privacy',
      title: 'Data Privacy',
      description: 'Ensure your data complies with privacy regulations',
      required: true,
      checked: false
    }
  ]);

  const supportedFormats = ['.csv', '.xlsx', '.json', '.tsv', '.txt'];
  const maxFileSize = 100 * 1024 * 1024; // 100MB

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'csv':
      case 'tsv':
        return FileSpreadsheet;
      case 'xlsx':
      case 'xls':
        return FileSpreadsheet;
      case 'json':
        return FileCode;
      case 'txt':
        return FileText;
      default:
        return File;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File) => {
    const errors: string[] = [];
    
    // Check file format
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!supportedFormats.includes(extension)) {
      errors.push(`Unsupported file format. Supported formats: ${supportedFormats.join(', ')}`);
    }

    // Check file size
    if (file.size > maxFileSize) {
      errors.push(`File size exceeds 100MB limit. Current size: ${formatFileSize(file.size)}`);
    }

    return errors;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    const validationErrors = validateFile(file);
    if (validationErrors.length > 0) {
      setErrors({ file: validationErrors.join(', ') });
      return;
    }

    setFormData(prev => ({ ...prev, file }));
    setErrors(prev => ({ ...prev, file: '' }));

    // Auto-check requirements based on file
    setRequirements(prev => prev.map(req => {
      if (req.id === 'format') {
        const extension = '.' + file.name.split('.').pop()?.toLowerCase();
        return { ...req, checked: supportedFormats.includes(extension) };
      }
      if (req.id === 'size') {
        return { ...req, checked: file.size <= maxFileSize };
      }
      return req;
    }));
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const toggleRequirement = (id: string) => {
    setRequirements(prev => prev.map(req => 
      req.id === id ? { ...req, checked: !req.checked } : req
    ));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Dataset name is required';
    }

    if (!formData.file) {
      newErrors.file = 'Please select a file to upload';
    }

    const requiredRequirements = requirements.filter(req => req.required);
    const uncheckedRequired = requiredRequirements.filter(req => !req.checked);
    if (uncheckedRequired.length > 0) {
      newErrors.requirements = 'Please confirm all required dataset requirements';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await uploadDataset(formData.file!, formData.name, formData.description);
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        file: null,
        tags: [],
        isPublic: false,
        category: 'general'
      });
      setRequirements(prev => prev.map(req => ({ ...req, checked: false })));
      setCurrentStep(1);
      setIsOpen(false);
      
      onUploadSuccess?.();
    } catch (error: any) {
      setErrors({ submit: error.message || 'Failed to upload dataset' });
    }
  };

  const nextStep = () => {
    if (currentStep === 1 && formData.file) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    if (currentStep === 1) return formData.file !== null;
    if (currentStep === 2) return formData.name.trim() !== '';
    return true;
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        className="upload-trigger-btn"
        onClick={() => setIsOpen(true)}
      >
        <Upload className="btn-icon" />
        Upload Dataset
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="upload-modal-content" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header">
              <div className="modal-title-section">
                <h2>Upload Dataset</h2>
                <p>Step {currentStep} of 3</p>
              </div>
              <button 
                className="close-btn"
                onClick={() => setIsOpen(false)}
              >
                <X className="close-icon" />
              </button>
            </div>

            {/* Progress Steps */}
            <div className="progress-steps">
              {[1, 2, 3].map(step => (
                <div key={step} className={`step ${step <= currentStep ? 'active' : ''} ${step < currentStep ? 'completed' : ''}`}>
                  <div className="step-number">
                    {step < currentStep ? <CheckCircle className="step-icon" /> : step}
                  </div>
                  <div className="step-label">
                    {step === 1 ? 'Select File' : step === 2 ? 'Details' : 'Requirements'}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="upload-form">
              {/* Step 1: File Selection */}
              {currentStep === 1 && (
                <div className="step-content">
                  <div className="step-header">
                    <h3>Select Your Dataset File</h3>
                    <p>Choose a file to upload and analyze</p>
                  </div>

                  <div 
                    className={`file-drop-zone ${dragActive ? 'drag-active' : ''} ${formData.file ? 'has-file' : ''}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                      accept={supportedFormats.join(',')}
                      style={{ display: 'none' }}
                    />

                    {formData.file ? (
                      <div className="file-preview">
                        <div className="file-info">
                          {React.createElement(getFileIcon(formData.file.name), { className: 'file-icon' })}
                          <div className="file-details">
                            <h4>{formData.file.name}</h4>
                            <p>{formatFileSize(formData.file.size)}</p>
                          </div>
                        </div>
                        <button 
                          type="button"
                          className="remove-file"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormData(prev => ({ ...prev, file: null }));
                          }}
                        >
                          <Trash2 className="remove-icon" />
                        </button>
                      </div>
                    ) : (
                      <div className="drop-content">
                        <Upload className="drop-icon" />
                        <h3>Drop your file here or click to browse</h3>
                        <p>Supports CSV, Excel, JSON, and TSV files up to 100MB</p>
                        <div className="supported-formats">
                          {supportedFormats.map(format => (
                            <span key={format} className="format-tag">{format}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {errors.file && (
                    <div className="error-message">
                      <AlertCircle className="error-icon" />
                      {errors.file}
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Dataset Details */}
              {currentStep === 2 && (
                <div className="step-content">
                  <div className="step-header">
                    <h3>Dataset Information</h3>
                    <p>Provide details about your dataset</p>
                  </div>

                  <div className="form-fields">
                    <div className="form-group">
                      <label>Dataset Name *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Enter a descriptive name for your dataset"
                        className={errors.name ? 'error' : ''}
                      />
                      {errors.name && <span className="field-error">{errors.name}</span>}
                    </div>

                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        placeholder="Describe what this dataset contains and how it can be used"
                        rows={4}
                      />
                    </div>

                    <div className="form-group">
                      <label>Category</label>
                      <select
                        value={formData.category}
                        onChange={(e) => handleInputChange('category', e.target.value)}
                      >
                        <option value="general">General</option>
                        <option value="business">Business</option>
                        <option value="research">Research</option>
                        <option value="education">Education</option>
                        <option value="finance">Finance</option>
                        <option value="healthcare">Healthcare</option>
                        <option value="marketing">Marketing</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Tags</label>
                      <div className="tags-input">
                        <div className="tags-list">
                          {formData.tags.map(tag => (
                            <span key={tag} className="tag">
                              {tag}
                              <button 
                                type="button"
                                onClick={() => removeTag(tag)}
                                className="remove-tag"
                              >
                                <X className="remove-icon" />
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="add-tag">
                          <input
                            type="text"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            placeholder="Add a tag"
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                          />
                          <button type="button" onClick={addTag}>
                            <Plus className="add-icon" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="form-group checkbox-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={formData.isPublic}
                          onChange={(e) => handleInputChange('isPublic', e.target.checked)}
                        />
                        <span className="checkmark"></span>
                        Make this dataset public (visible to other users)
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Requirements Confirmation */}
              {currentStep === 3 && (
                <div className="step-content">
                  <div className="step-header">
                    <h3>Dataset Requirements</h3>
                    <p>Please confirm that your dataset meets these requirements</p>
                  </div>

                  <div className="requirements-list">
                    {requirements.map(requirement => (
                      <div key={requirement.id} className={`requirement-item ${requirement.checked ? 'checked' : ''}`}>
                        <button
                          type="button"
                          className="requirement-checkbox"
                          onClick={() => toggleRequirement(requirement.id)}
                        >
                          {requirement.checked ? (
                            <CheckCircle className="check-icon" />
                          ) : (
                            <div className="empty-check"></div>
                          )}
                        </button>
                        <div className="requirement-content">
                          <h4>
                            {requirement.title}
                            {requirement.required && <span className="required-badge">Required</span>}
                          </h4>
                          <p>{requirement.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {errors.requirements && (
                    <div className="error-message">
                      <AlertCircle className="error-icon" />
                      {errors.requirements}
                    </div>
                  )}

                  {errors.submit && (
                    <div className="error-message">
                      <AlertCircle className="error-icon" />
                      {errors.submit}
                    </div>
                  )}
                </div>
              )}

              {/* Modal Actions */}
              <div className="modal-actions">
                <div className="action-buttons">
                  {currentStep > 1 && (
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={prevStep}
                    >
                      <ArrowRight className="btn-icon" style={{ transform: 'rotate(180deg)' }} />
                      Back
                    </button>
                  )}
                  
                  {currentStep < 3 ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={nextStep}
                      disabled={!canProceed()}
                    >
                      Next
                      <ArrowRight className="btn-icon" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Clock className="btn-icon spinning" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Zap className="btn-icon" />
                          Upload Dataset
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};