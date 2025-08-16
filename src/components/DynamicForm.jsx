import React, { useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import Cancell from '../icons/Cancell'
import Save from '../icons/Save'
import Upload from '../icons/Upload'


function DynamicForm({ formFields, defaultValues = {}, onSubmit, onCancel, isSubmitting = false }) {
  const { register, handleSubmit, watch, control, formState: { errors } } = useForm({
    defaultValues
  });
  
  const watchedValues = watch();
  
  // File input state for all file fields
  const [selectedFiles, setSelectedFiles] = useState({});

  const renderField = (field) => {
    const { name, type, label, required = false, options = [] } = field;
    
    const baseInputClasses = "mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors nodrag";
    const errorClasses = errors[name] ? "border-red-500 focus:ring-red-500 focus:border-red-500" : "";

    switch (type) {
      case 'textarea':
        return (
          <div key={name} className="mb-4">
            <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
              {label} {required && <span className="text-red-500">*</span>}
            </label>
            <textarea
              id={name}
              rows={3}
              {...register(name, { required: required ? `${label} is required` : false })}
              className={`${baseInputClasses} ${errorClasses}`}
            />
            {errors[name] && (
              <p className="mt-1 text-sm text-red-600">{errors[name].message}</p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={name} className="mb-4">
            <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
              {label} {required && <span className="text-red-500">*</span>}
            </label>
            <select
              id={name}
              {...register(name, { required: required ? `${label} is required` : false })}
              className={`${baseInputClasses} ${errorClasses}`}
            >
              <option value="">Select {label}</option>
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors[name] && (
              <p className="mt-1 text-sm text-red-600">{errors[name].message}</p>
            )}
          </div>
        );

      case 'number':
        return (
          <div key={name} className="mb-4">
            <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
              {label} {required && <span className="text-red-500">*</span>}
            </label>
            <input
              id={name}
              type="number"
              {...register(name, { 
                required: required ? `${label} is required` : false,
                valueAsNumber: true
              })}
              className={`${baseInputClasses} ${errorClasses}`}
            />
            {errors[name] && (
              <p className="mt-1 text-sm text-red-600">{errors[name].message}</p>
            )}
          </div>
        );

      case 'email':
        return (
          <div key={name} className="mb-4">
            <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
              {label} {required && <span className="text-red-500">*</span>}
            </label>
            <input
              id={name}
              type="email"
              {...register(name, {
                required: required ? `${label} is required` : false,
                pattern: {
                  value: /^\S+@\S+$/i,
                  message: 'Please enter a valid email address'
                }
              })}
              className={`${baseInputClasses} ${errorClasses}`}
            />
            {errors[name] && (
              <p className="mt-1 text-sm text-red-600">{errors[name].message}</p>
            )}
          </div>
        );

      case 'url':
        return (
          <div key={name} className="mb-4">
            <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
              {label} {required && <span className="text-red-500">*</span>}
            </label>
            <input
              id={name}
              type="url"
              {...register(name, {
                required: required ? `${label} is required` : false,
                pattern: {
                  value: /^https?:\/\/.+/i,
                  message: 'Please enter a valid URL (starting with http:// or https://)'
                }
              })}
              className={`${baseInputClasses} ${errorClasses}`}
              placeholder="https://example.com"
            />
            {errors[name] && (
              <p className="mt-1 text-sm text-red-600">{errors[name].message}</p>
            )}
          </div>
        );

      case 'range':
        const { min = 0, max = 100, step = 1 } = field;
        return (
          <div key={name} className="mb-4">
            <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
              {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-500">{min}</span>
              <input
                id={name}
                type="range"
                min={min}
                max={max}
                step={step}
                {...register(name, {
                  required: required ? `${label} is required` : false,
                  valueAsNumber: true
                })}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider nodrag"
              />
              <span className="text-sm text-gray-500">{max}</span>
            </div>
            <div className="mt-1 text-sm text-gray-600">
              Current value: <span className="font-medium">{watchedValues[name] || defaultValues[name] || min}</span>
            </div>
            {errors[name] && (
              <p className="mt-1 text-sm text-red-600">{errors[name].message}</p>
            )}
          </div>
        );

      case 'datetime-local':
        return (
          <div key={name} className="mb-4">
            <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
              {label} {required && <span className="text-red-500">*</span>}
            </label>
            <input
              id={name}
              type="datetime-local"
              {...register(name, {
                required: required ? `${label} is required` : false
              })}
              className={`${baseInputClasses} ${errorClasses}`}
            />
            {errors[name] && (
              <p className="mt-1 text-sm text-red-600">{errors[name].message}</p>
            )}
          </div>
        );

      case 'time':
        return (
          <div key={name} className="mb-4">
            <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
              {label} {required && <span className="text-red-500">*</span>}
            </label>
            <input
              id={name}
              type="time"
              {...register(name, {
                required: required ? `${label} is required` : false
              })}
              className={`${baseInputClasses} ${errorClasses}`}
            />
            {errors[name] && (
              <p className="mt-1 text-sm text-red-600">{errors[name].message}</p>
            )}
          </div>
        );

      case 'file':
        const { multiple = false, accept } = field;

        return (
          <div key={name} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {label} {required && <span className="text-red-500">*</span>}
            </label>
            
            <Controller
              name={name}
              control={control}
              rules={{ required: required ? `${label} is required` : false }}
              render={({ field: { onChange, value, ...fieldProps } }) => {
                const handleFileClick = () => {
                  const fileInput = document.getElementById(`file-input-${name}`);
                  if (fileInput) {
                    fileInput.click();
                  }
                };

                const handleFileChange = (e) => {
                  const files = e.target.files;
                  onChange(files); // Update react-hook-form state
                  
                  // Update local state for UI display
                  const filesArray = Array.from(files || []);
                  setSelectedFiles(prev => ({
                    ...prev,
                    [name]: filesArray
                  }));
                };
                
                const fieldFiles = selectedFiles[name] || [];

                return (
                  <>
                    {/* Hidden file input */}
                    <input
                      id={`file-input-${name}`}
                      type="file"
                      multiple={multiple}
                      accept={accept}
                      onChange={handleFileChange}
                      className="hidden"
                      {...fieldProps}
                    />
                    
                    {/* Custom icon button */}
                    <button
                      type="button"
                      onClick={handleFileClick}
                      className={`inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium transition-colors nodrag ${
                        fieldFiles.length > 0
                          ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'
                          : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors[name] ? 'border-red-500' : ''}`}
                    >
                      <Upload/>
                      {fieldFiles.length > 0 ? `${"  "+fieldFiles.length} file(s) selected` : '  Choose Files'}
                    </button>
                    
                    {fieldFiles.length > 0 && (
                      <div className="mt-2 text-xs text-gray-600">
                        {fieldFiles.map((file, index) => (
                          <div key={index} className="truncate">{file.name}</div>
                        ))}
                      </div>
                    )}
                    
                    {multiple && (
                      <p className="mt-1 text-xs text-gray-500">You can select multiple files</p>
                    )}
                  </>
                );
              }}
            />
            {errors[name] && (
              <p className="mt-1 text-sm text-red-600">{errors[name].message}</p>
            )}
          </div>
        );

      case 'checkbox':
        return (
          <div key={name} className="mb-4">
            <div className="flex items-center">
              <input
                id={name}
                type="checkbox"
                {...register(name, {
                  required: required ? `${label} is required` : false
                })}
                className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded nodrag ${errors[name] ? 'border-red-500' : ''}`}
              />
              <label htmlFor={name} className="ml-2 block text-sm font-medium text-gray-700">
                {label} {required && <span className="text-red-500">*</span>}
              </label>
            </div>
            {errors[name] && (
              <p className="mt-1 text-sm text-red-600">{errors[name].message}</p>
            )}
          </div>
        );

      case 'hidden':
        return (
          <input
            key={name}
            id={name}
            type="hidden"
            {...register(name)}
          />
        );

      default: // text
        return (
          <div key={name} className="mb-4">
            <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
              {label} {required && <span className="text-red-500">*</span>}
            </label>
            <input
              id={name}
              type="text"
              {...register(name, { required: required ? `${label} is required` : false })}
              className={`${baseInputClasses} ${errorClasses}`}
            />
            {errors[name] && (
              <p className="mt-1 text-sm text-red-600">{errors[name].message}</p>
            )}
          </div>
        );
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Form Data</h3>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {formFields.map(renderField)}
        
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className={`p-2 transition-colors rounded hover:bg-gray-100 nodrag ${
              isSubmitting
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-red-400 hover:text-red-600'
            }`}
            title="Cancel"
          >
            <Cancell/>
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`p-2 transition-colors rounded hover:bg-gray-100 nodrag ${
              isSubmitting
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-400 hover:text-blue-600'
            }`}
            title={isSubmitting ? "Saving..." : "Save Changes"}
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
            ) : (
              <Save/>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default DynamicForm;


/* Cancell
<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12M6 18L18 6" />
            </svg>

*/

/* Upload
<svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>

*/