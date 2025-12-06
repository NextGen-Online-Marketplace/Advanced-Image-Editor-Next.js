"use client";

import { Control, Controller, FieldErrors } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ReactSelect from 'react-select';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';

interface LocationFieldsProps {
  control: Control<any>;
  errors?: FieldErrors<any>;
  foundationOptions: Array<{ value: string; label: string }>;
  isLoading?: boolean;
  onAddressSelect?: (placeId: string, description: string) => Promise<void>;
}

export function LocationFields({
  control,
  errors,
  foundationOptions,
  isLoading = false,
  onAddressSelect,
}: LocationFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="address">
          Address <span className="text-destructive">*</span>
        </Label>
        <Controller
          name="location.address"
          control={control}
          render={({ field }) => {
            const handleSelect = async (placeId: string, description: string) => {
              if (onAddressSelect) {
                await onAddressSelect(placeId, description);
              } else {
                // Default behavior: fetch address details
                try {
                  const response = await fetch(
                    `/api/addresses/details?placeId=${encodeURIComponent(placeId)}`,
                    { credentials: 'include' }
                  );

                  if (!response.ok) {
                    console.error('Failed to fetch address details');
                    return;
                  }

                  const data = await response.json();
                  const streetAddress = data.streetAddress || description.split(',')[0].trim();
                  field.onChange(streetAddress);
                } catch (error) {
                  console.error('Error fetching address details:', error);
                }
              }
            };

            return (
              <AddressAutocomplete
                id="address"
                value={field.value || ''}
                onChange={field.onChange}
                onSelect={handleSelect}
                placeholder="Type to search addresses..."
              />
            );
          }}
        />
        {errors?.location && typeof errors.location === 'object' && 'address' in errors.location && errors.location.address && (
          <p className="text-sm text-destructive">
            {typeof errors.location.address === 'object' && 'message' in errors.location.address 
              ? String(errors.location.address.message) 
              : 'Invalid address'}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="unit">Unit</Label>
          <Controller
            name="location.unit"
            control={control}
            render={({ field }) => (
              <Input
                id="unit"
                {...field}
                placeholder="Unit number..."
              />
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Controller
            name="location.city"
            control={control}
            render={({ field }) => (
              <Input
                id="city"
                {...field}
                placeholder="City..."
              />
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Controller
            name="location.state"
            control={control}
            render={({ field }) => (
              <Input
                id="state"
                {...field}
                placeholder="State..."
              />
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="zip">Zip</Label>
          <Controller
            name="location.zip"
            control={control}
            render={({ field }) => (
              <Input
                id="zip"
                {...field}
                placeholder="Zip code..."
              />
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="county">County</Label>
          <Controller
            name="location.county"
            control={control}
            render={({ field }) => (
              <Input
                id="county"
                {...field}
                placeholder="County..."
              />
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="foundation">Foundation</Label>
          <Controller
            name="location.foundation"
            control={control}
            render={({ field }) => (
              <ReactSelect
                value={field.value ? { value: field.value, label: field.value } : null}
                onChange={(option) => field.onChange(option?.value || undefined)}
                options={foundationOptions}
                isClearable
                placeholder="Select foundation type..."
                isLoading={isLoading}
                className="react-select-container"
                classNamePrefix="react-select"
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                menuPosition="fixed"
              />
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="squareFeet">Square Feet</Label>
          <Controller
            name="location.squareFeet"
            control={control}
            render={({ field }) => (
              <Input
                id="squareFeet"
                type="number"
                min="0"
                {...field}
                value={field.value || ''}
                onChange={(e) => field.onChange(e.target.value ? e.target.value : undefined)}
                placeholder="Square feet..."
              />
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="yearBuild">Year Built</Label>
          <Controller
            name="location.yearBuild"
            control={control}
            render={({ field }) => (
              <Input
                id="yearBuild"
                type="number"
                max={new Date().getFullYear()}
                {...field}
                value={field.value || ''}
                onChange={(e) => field.onChange(e.target.value ? e.target.value : undefined)}
                placeholder="Year..."
              />
            )}
          />
        </div>
      </div>
    </div>
  );
}

