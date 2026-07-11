import React from 'react';

interface FormFieldWrapperProps {
  label?: string;
  error?: string;
  helper?: string;
  required?: boolean;
  children: React.ReactNode;
  htmlFor?: string;
}

export const FormFieldWrapper: React.FC<FormFieldWrapperProps> = ({
  label,
  error,
  helper,
  required,
  children,
  htmlFor,
}) => {
  return (
    <div>
      {label && (
        <label 
          htmlFor={htmlFor}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      {children}
      
      {error && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}
      
      {helper && !error && (
        <p className="text-xs text-gray-500 mt-1">{helper}</p>
      )}
    </div>
  );
};