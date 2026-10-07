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
          className="block text-sm font-medium text-ink-3 mb-1"
        >
          {label}
          {required && <span className="text-danger ml-1">*</span>}
        </label>
      )}
      
      {children}
      
      {error && (
        <p className="text-danger text-xs mt-1">{error}</p>
      )}
      
      {helper && !error && (
        <p className="text-xs text-muted mt-1">{helper}</p>
      )}
    </div>
  );
};