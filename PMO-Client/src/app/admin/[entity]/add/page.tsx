'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { entityConfig, Field } from '@/lib/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import axios from 'axios';
import React from 'react';

interface PageProps {
  params: Promise<{
    entity: string;
  }>;
}

export default function AddPage({ params }: PageProps) {
  const router = useRouter();
  const { entity } = React.use(params);
  const config = entityConfig[entity];
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [relationOptions, setRelationOptions] = useState<Record<string, any[]>>({});

  if (!config) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold">Entity not found</h1>
        <p>The requested entity does not exist in the configuration.</p>
      </div>
    );
  }

  useEffect(() => {
    const fetchRelationOptions = async () => {
      const options: Record<string, any[]> = {};
      
      for (const field of config.fields) {
        if (field.type === 'relation') {
          try {
            // Get the correct endpoint based on the relation target
            const endpoint = field.relation?.target === 'account' ? 'accounts' : field.relation?.target + 's';
            const response = await axios.get(`/api/${endpoint}`);
            options[field.name] = response.data;
          } catch (error) {
            console.error(`Error fetching ${field.name} options:`, error);
          }
        }
      }
      
      setRelationOptions(options);
    };

    fetchRelationOptions();
  }, [config.fields]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Format the data to include relation IDs but exclude primary keys
    const submitData = { ...formData };
    config.fields.forEach(field => {
      // Remove primary key fields
      if (field.name.endsWith('_id') && field.isUnique) {
        delete submitData[field.name];
      }
      // Handle relation fields
      if (field.type === 'relation' && submitData[field.name]) {
        submitData[`${field.name}_id`] = submitData[field.name];
        delete submitData[field.name];
      }
    });

    try {
      await axios.post(`/api/${entity}`, submitData);
      toast.success(`${config.label} created successfully`);
      router.push(`/admin/${entity}`);
    } catch (error) {
      console.error('Error creating entity:', error);
      toast.error('Failed to create entity');
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

  const renderField = (field: Field) => {
    // Skip auto-generated fields: timestamps, IDs, and relation IDs
    if (
      field.name === 'created_at' || 
      field.name === 'updated_at' ||
      (field.name.endsWith('_id') && (field.isUnique || field.name === 'manager_id')) // Skip both primary keys and relation IDs
    ) {
      return null;
    }

    const label = field.name.replace(/_/g, ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase());

    // Handle relation fields
    if (field.type === 'relation') {
      return (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name}>
            {label}
            {field.isRequired && <span className="text-danger">*</span>}
          </Label>
          <Select
            value={formData[field.name] || ''}
            onValueChange={(value) => handleChange(field.name, value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${label}`} />
            </SelectTrigger>
            <SelectContent>
              {relationOptions[field.name]?.map((option: any) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name || option.username || option.title || option.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    return (
      <div key={field.name} className="space-y-2">
        <Label htmlFor={field.name}>
          {label}
          {field.isRequired && <span className="text-danger">*</span>}
        </Label>
        {field.type === 'string' && field.name.includes('description') ? (
          <Textarea
            id={field.name}
            value={formData[field.name] || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            required={field.isRequired}
          />
        ) : field.type === 'enum' ? (
          <Select
            value={formData[field.name]}
            onValueChange={(value) => handleChange(field.name, value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${label}`} />
            </SelectTrigger>
            <SelectContent>
              {field.enumValues?.map((value: string) => (
                <SelectItem key={value} value={value}>
                  {value.replace(/_/g, ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id={field.name}
            type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
            value={formData[field.name] || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            required={field.isRequired}
          />
        )}
      </div>
    );
  };

  return (
    <div className="p-4 w-full">
      <Card>
        <CardHeader>
          <CardTitle>Add New {config.label}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {config.fields.map(renderField)}
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Adding...' : 'Add'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}