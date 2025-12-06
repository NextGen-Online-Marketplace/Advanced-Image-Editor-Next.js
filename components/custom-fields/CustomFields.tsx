"use client";

import { useEffect, useState } from 'react';
import { Control, Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Info } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type CustomField = {
  _id?: string;
  name: string;
  fieldKey?: string;
  fieldType: 'Text' | 'Number' | 'Checkbox' | 'Calendar' | 'Paragraph' | 'Dropdown' | 'Date' | 'Date & Time';
  requiredForOnlineScheduler: boolean;
  displayOnSpectoraApp: boolean;
  showInOnlineSchedulerOrGetQuote: boolean;
  calendarIcon?: string;
  dropdownOptions?: string[];
  orderIndex?: number;
};

interface CustomFieldsProps {
  control: Control<any>;
  customData?: Record<string, any>;
  companyId?: string; // Optional companyId for public access
}

export default function CustomFields({ control, customData = {}, companyId }: CustomFieldsProps) {
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCustomFields = async () => {
      try {
        setLoading(true);
        // Use public API if companyId is provided, otherwise use authenticated API
        const apiUrl = companyId
          ? `/api/public/company/${companyId}/custom-fields`
          : '/api/scheduling-options/custom-fields';
        
        const response = await fetch(apiUrl, {
          credentials: 'include',
        });

        if (!response.ok) {
          console.error('Failed to load custom fields');
          return;
        }

        const data = await response.json();
        const fields = (data.customFields || []).sort((a: CustomField, b: CustomField) => {
          const aOrder = a.orderIndex ?? 0;
          const bOrder = b.orderIndex ?? 0;
          return aOrder - bOrder;
        });
        setCustomFields(fields);
      } catch (error) {
        console.error('Error loading custom fields:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCustomFields();
  }, [companyId]);

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">
        Loading custom fields...
      </div>
    );
  }

  if (customFields.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {customFields.map((field) => {
        if (!field.fieldKey) return null;

        const fieldName = `customData.${field.fieldKey}`;
        const fieldValue = customData[field.fieldKey];

        return (
          <div key={field._id || field.fieldKey} className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor={fieldName}>
                {field.name}
                {field.requiredForOnlineScheduler && <span className="text-destructive ml-1">*</span>}
              </Label>
              {field.fieldType === 'Calendar' && field.calendarIcon && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        This field will show in the calendar with the selected icon. 
                        N/A = no icon, Yes = green icon, No = red icon.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            {field.fieldType === 'Text' && (
              <Controller
                name={fieldName}
                control={control}
                rules={{
                  required: field.requiredForOnlineScheduler
                    ? `${field.name} is required`
                    : false,
                  validate: (value) => {
                    if (field.requiredForOnlineScheduler) {
                      if (!value || (typeof value === 'string' && !value.trim())) {
                        return `${field.name} is required`;
                      }
                    }
                    return true;
                  },
                }}
                render={({ field: formField, fieldState }) => (
                  <div className="space-y-1">
                    <Input
                      id={fieldName}
                      {...formField}
                      value={formField.value || ''}
                      placeholder={`Enter ${field.name.toLowerCase()}...`}
                      className={fieldState.error ? 'border-destructive' : ''}
                    />
                    {fieldState.error && (
                      <p className="text-sm text-destructive">{fieldState.error.message}</p>
                    )}
                  </div>
                )}
              />
            )}

            {field.fieldType === 'Number' && (
              <Controller
                name={fieldName}
                control={control}
                rules={{
                  required: field.requiredForOnlineScheduler
                    ? `${field.name} is required`
                    : false,
                  validate: (value) => {
                    if (field.requiredForOnlineScheduler) {
                      if (value === undefined || value === null || value === '') {
                        return `${field.name} is required`;
                      }
                      if (isNaN(Number(value))) {
                        return `${field.name} must be a valid number`;
                      }
                    }
                    return true;
                  },
                }}
                render={({ field: formField, fieldState }) => (
                  <div className="space-y-1">
                    <Input
                      id={fieldName}
                      type="number"
                      {...formField}
                      value={formField.value || ''}
                      onChange={(e) => formField.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      placeholder={`Enter ${field.name.toLowerCase()}...`}
                      className={fieldState.error ? 'border-destructive' : ''}
                    />
                    {fieldState.error && (
                      <p className="text-sm text-destructive">{fieldState.error.message}</p>
                    )}
                  </div>
                )}
              />
            )}

            {field.fieldType === 'Checkbox' && (
              <Controller
                name={fieldName}
                control={control}
                rules={{
                  required: field.requiredForOnlineScheduler
                    ? `${field.name} is required`
                    : false,
                  validate: (value) => {
                    if (field.requiredForOnlineScheduler && !value) {
                      return `${field.name} is required`;
                    }
                    return true;
                  },
                }}
                render={({ field: formField, fieldState }) => (
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={fieldName}
                        checked={formField.value || false}
                        onCheckedChange={(checked) => formField.onChange(checked === true)}
                        className={fieldState.error ? 'border-destructive' : ''}
                      />
                      <Label htmlFor={fieldName} className="text-sm font-normal cursor-pointer">
                        {field.name}
                      </Label>
                    </div>
                    {fieldState.error && (
                      <p className="text-sm text-destructive">{fieldState.error.message}</p>
                    )}
                  </div>
                )}
              />
            )}

            {field.fieldType === 'Calendar' && (
              <Controller
                name={fieldName}
                control={control}
                rules={{
                  required: field.requiredForOnlineScheduler
                    ? `${field.name} is required`
                    : false,
                  validate: (value) => {
                    if (field.requiredForOnlineScheduler) {
                      if (!value || value === 'N/A') {
                        return `${field.name} is required`;
                      }
                    }
                    return true;
                  },
                }}
                render={({ field: formField, fieldState }) => (
                  <div className="space-y-1">
                    <Select
                      value={formField.value || 'N/A'}
                      onValueChange={formField.onChange}
                    >
                      <SelectTrigger 
                        id={fieldName}
                        className={fieldState.error ? 'border-destructive' : ''}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="N/A">N/A</SelectItem>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldState.error && (
                      <p className="text-sm text-destructive">{fieldState.error.message}</p>
                    )}
                  </div>
                )}
              />
            )}

            {field.fieldType === 'Paragraph' && (
              <Controller
                name={fieldName}
                control={control}
                rules={{
                  required: field.requiredForOnlineScheduler
                    ? `${field.name} is required`
                    : false,
                  validate: (value) => {
                    if (field.requiredForOnlineScheduler) {
                      if (!value || (typeof value === 'string' && !value.trim())) {
                        return `${field.name} is required`;
                      }
                    }
                    return true;
                  },
                }}
                render={({ field: formField, fieldState }) => (
                  <div className="space-y-1">
                    <Textarea
                      id={fieldName}
                      {...formField}
                      value={formField.value || ''}
                      placeholder={`Enter ${field.name.toLowerCase()}...`}
                      rows={3}
                      className={fieldState.error ? 'border-destructive' : ''}
                    />
                    {fieldState.error && (
                      <p className="text-sm text-destructive">{fieldState.error.message}</p>
                    )}
                  </div>
                )}
              />
            )}

            {field.fieldType === 'Dropdown' && (
              <Controller
                name={fieldName}
                control={control}
                rules={{
                  required: field.requiredForOnlineScheduler
                    ? `${field.name} is required`
                    : false,
                  validate: (value) => {
                    if (field.requiredForOnlineScheduler) {
                      if (!value || value === '') {
                        return `${field.name} is required`;
                      }
                    }
                    return true;
                  },
                }}
                render={({ field: formField, fieldState }) => (
                  <div className="space-y-1">
                    <Select
                      value={formField.value || ''}
                      onValueChange={formField.onChange}
                    >
                      <SelectTrigger 
                        id={fieldName}
                        className={fieldState.error ? 'border-destructive' : ''}
                      >
                        <SelectValue placeholder={`Select ${field.name.toLowerCase()}...`} />
                      </SelectTrigger>
                      <SelectContent>
                        {(field.dropdownOptions || []).map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.error && (
                      <p className="text-sm text-destructive">{fieldState.error.message}</p>
                    )}
                  </div>
                )}
              />
            )}

            {field.fieldType === 'Date' && (
              <Controller
                name={fieldName}
                control={control}
                rules={{
                  required: field.requiredForOnlineScheduler
                    ? `${field.name} is required`
                    : false,
                  validate: (value) => {
                    if (field.requiredForOnlineScheduler && !value) {
                      return `${field.name} is required`;
                    }
                    return true;
                  },
                }}
                render={({ field: formField, fieldState }) => {
                  const dateValue = formField.value ? new Date(formField.value) : undefined;
                  return (
                    <div className="space-y-1">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !dateValue && "text-muted-foreground",
                              fieldState.error && "border-destructive"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateValue ? format(dateValue, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dateValue}
                            onSelect={(date) => formField.onChange(date ? date.toISOString() : undefined)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      {fieldState.error && (
                        <p className="text-sm text-destructive">{fieldState.error.message}</p>
                      )}
                    </div>
                  );
                }}
              />
            )}

            {field.fieldType === 'Date & Time' && (
              <Controller
                name={fieldName}
                control={control}
                rules={{
                  required: field.requiredForOnlineScheduler
                    ? `${field.name} is required`
                    : false,
                  validate: (value) => {
                    if (field.requiredForOnlineScheduler && !value) {
                      return `${field.name} is required`;
                    }
                    return true;
                  },
                }}
                render={({ field: formField, fieldState }) => {
                  const dateTimeValue = formField.value ? new Date(formField.value) : undefined;
                  const dateValue = dateTimeValue 
                    ? new Date(dateTimeValue.getFullYear(), dateTimeValue.getMonth(), dateTimeValue.getDate())
                    : undefined;
                  const timeValue = dateTimeValue 
                    ? `${String(dateTimeValue.getHours()).padStart(2, '0')}:${String(dateTimeValue.getMinutes()).padStart(2, '0')}`
                    : '00:00';

                  return (
                    <div className="space-y-1">
                      <div className="flex gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn(
                                "flex-1 justify-start text-left font-normal",
                                !dateValue && "text-muted-foreground",
                                fieldState.error && "border-destructive"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dateValue ? format(dateValue, "PPP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={dateValue}
                              onSelect={(date) => {
                                if (date) {
                                  const [hours, minutes] = timeValue.split(':').map(Number);
                                  const newDate = new Date(date);
                                  newDate.setHours(hours, minutes, 0, 0);
                                  formField.onChange(newDate.toISOString());
                                } else {
                                  formField.onChange(undefined);
                                }
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <Input
                          type="time"
                          value={timeValue}
                          onChange={(e) => {
                            if (dateValue) {
                              const [hours, minutes] = e.target.value.split(':').map(Number);
                              const newDate = new Date(dateValue);
                              newDate.setHours(hours, minutes, 0, 0);
                              formField.onChange(newDate.toISOString());
                            }
                          }}
                          className={cn("w-32", fieldState.error && "border-destructive")}
                        />
                      </div>
                      {fieldState.error && (
                        <p className="text-sm text-destructive">{fieldState.error.message}</p>
                      )}
                    </div>
                  );
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

