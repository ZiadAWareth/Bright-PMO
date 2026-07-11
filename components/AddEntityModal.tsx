import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus } from 'lucide-react';

interface Field {
  name: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'select' | 'date' | 'checkbox';
  required?: boolean;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  defaultValue?: any;
}

interface AddEntityModalProps {
  entityName: string;
  fields: Field[];
  onSubmit: (data: Record<string, any>) => Promise<void>;
  triggerButton?: React.ReactNode;
}

export function AddEntityModal({ entityName, fields, onSubmit, triggerButton }: AddEntityModalProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    // Initialize form data with default values from fields
    const initialData: Record<string, any> = {};
    fields.forEach(field => {
      if (field.defaultValue !== undefined) {
        initialData[field.name] = field.defaultValue;
      }
    });
    return initialData;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form data when modal opens or fields change
  useEffect(() => {
    if (open) {
      const initialData: Record<string, any> = {};
      fields.forEach(field => {
        if (field.defaultValue !== undefined) {
          initialData[field.name] = field.defaultValue;
        }
      });
      setFormData(initialData);
    }
  }, [open, fields]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      setOpen(false);
      // Reset to default values
      const initialData: Record<string, any> = {};
      fields.forEach(field => {
        if (field.defaultValue !== undefined) {
          initialData[field.name] = field.defaultValue;
        }
      });
      setFormData(initialData);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button variant="default">
            Add {entityName}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl p-8 w-full max-w-2xl mx-4 shadow-2xl border border-white/20 dark:border-gray-700/50 transform animate-slideUp">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center">
            <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center mr-3">
              <Plus className="w-5 h-5 text-white" />
            </div>
            Add New {entityName}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {fields.map((field) => (
              <div key={field.name} className="group">
                <Label htmlFor={field.name} className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {field.label}
                  {field.required && <span className="text-red-500">*</span>}
                </Label>
                {field.type === 'textarea' ? (
                  <Textarea
                    id={field.name}
                    value={formData[field.name] || ''}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    required={field.required}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 group-hover:border-orange-300"
                  />
                ) : field.type === 'select' ? (
                  <Select
                    value={formData[field.name]}
                    onValueChange={(value) => handleChange(field.name, value)}
                  >
                    <SelectTrigger className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 group-hover:border-orange-300">
                      <SelectValue placeholder={`Select ${field.label}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options && field.options.length > 0 ? (
                        field.options.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-1.5 text-sm text-gray-500">
                          No options available
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                ) : field.type === 'checkbox' ? (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={field.name}
                      checked={formData[field.name] || false}
                      onCheckedChange={(checked) => handleChange(field.name, checked)}
                      className="accent-orange-500"
                    />
                    <Label htmlFor={field.name} className="text-sm text-gray-700 dark:text-gray-300">
                      {field.label}
                    </Label>
                  </div>
                ) : (
                  <Input
                    id={field.name}
                    type={field.type}
                    value={formData[field.name] || ''}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    required={field.required}
                    min={field.min}
                    max={field.max}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 group-hover:border-orange-300"
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-600">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="group relative overflow-hidden bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 hover:from-orange-600 hover:to-red-600"
            >
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              <span className="relative">{isSubmitting ? 'Adding...' : 'Add'}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 