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
      <DialogContent className="bg-surface rounded-2xl p-8 w-full max-w-2xl mx-4 shadow-2xl border border-line">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold mb-6 text-ink flex items-center gap-3">
            <div className="w-9 h-9 bg-bright-soft rounded-lg flex items-center justify-center">
              <Plus className="w-4.5 h-4.5 text-bright" aria-hidden="true" />
            </div>
            Add New {entityName}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {fields.map((field) => (
              <div key={field.name}>
                <Label htmlFor={field.name} className="block text-sm font-medium text-ink-3 mb-2">
                  {field.label}
                  {field.required && <span className="text-danger">*</span>}
                </Label>
                {field.type === 'textarea' ? (
                  <Textarea
                    id={field.name}
                    value={formData[field.name] || ''}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    required={field.required}
                    className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-ink focus:ring-2 focus:ring-bright focus:border-transparent transition-colors"
                  />
                ) : field.type === 'select' ? (
                  <Select
                    value={formData[field.name]}
                    onValueChange={(value) => handleChange(field.name, value)}
                  >
                    <SelectTrigger className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-ink focus:ring-2 focus:ring-bright focus:border-transparent transition-colors">
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
                        <div className="px-2 py-1.5 text-sm text-muted">
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
                      className="accent-bright"
                    />
                    <Label htmlFor={field.name} className="text-sm text-ink-3">
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
                    className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-ink focus:ring-2 focus:ring-bright focus:border-transparent transition-colors"
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end space-x-3 pt-6 border-t border-line">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="px-4 py-2 text-ink-3 font-medium rounded-lg border border-line hover:bg-surface-2 transition-colors"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-bright text-white rounded-lg font-medium hover:bg-bright-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Adding...' : 'Add'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 