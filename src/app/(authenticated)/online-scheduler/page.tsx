"use client";

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Info, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

const schedulerSchema = z.object({
  onlineSchedulerEnabled: z.boolean(),
  displayContactInfoBeforeDateSelection: z.boolean(),
  schedulingMinimumHours: z.number().min(0, 'Hours must be 0 or greater').optional(),
  allowChoiceOfInspectors: z.boolean(),
  hidePricing: z.boolean(),
  showClientPricingDetails: z.boolean(),
  allowRequestNotes: z.boolean(),
  requireConfirmation: z.boolean(),
  confirmationText: z.string().optional(),
  googleAnalyticsNumber: z.string().optional(),
  emailForCompleteBooking: z.boolean(),
  emailForInProgressBooking: z.boolean(),
  emailNotificationAddress: z
    .string()
    .email('Please enter a valid email address')
    .or(z.literal(''))
    .optional(),
  smsForCompleteBooking: z.boolean(),
  smsForInProgressBooking: z.boolean(),
  smsNotificationNumber: z.string().optional(),
});

type SchedulerFormValues = z.infer<typeof schedulerSchema>;

export default function OnlineSchedulerPage() {
  const router = useRouter();
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState<{ id: string; name: string } | null>(null);

  const form = useForm<SchedulerFormValues>({
    resolver: zodResolver(schedulerSchema),
    defaultValues: {
      onlineSchedulerEnabled: false,
      displayContactInfoBeforeDateSelection: false,
      schedulingMinimumHours: 0,
      allowChoiceOfInspectors: false,
      hidePricing: false,
      showClientPricingDetails: false,
      allowRequestNotes: false,
      requireConfirmation: true,
      confirmationText: '',
      googleAnalyticsNumber: '',
      emailForCompleteBooking: false,
      emailForInProgressBooking: false,
      emailNotificationAddress: '',
      smsForCompleteBooking: false,
      smsForInProgressBooking: false,
      smsNotificationNumber: '',
    },
  });

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = form;

  const onlineSchedulerEnabled = watch('onlineSchedulerEnabled');
  const emailForCompleteBooking = watch('emailForCompleteBooking');
  const emailForInProgressBooking = watch('emailForInProgressBooking');
  const smsForCompleteBooking = watch('smsForCompleteBooking');
  const smsForInProgressBooking = watch('smsForInProgressBooking');

  const quillModules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link'],
        ['clean'],
      ],
    }),
    []
  );

  useEffect(() => {
    const loadSchedulerSettings = async () => {
      try {
        setInitialLoading(true);
        
        // Load company data and scheduler settings in parallel
        const [schedulerResponse, profileResponse] = await Promise.all([
          fetch('/api/online-scheduler', { credentials: 'include' }),
          fetch('/api/profile', { credentials: 'include' }),
        ]);

        if (!schedulerResponse.ok) {
          const errorData = await schedulerResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to load scheduler settings');
        }

        const schedulerData = await schedulerResponse.json();

        // Load company data if profile response is ok
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          if (profileData.company) {
            setCompany({
              id: profileData.company.id,
              name: profileData.company.name,
            });
          }
        }

        reset({
          onlineSchedulerEnabled: schedulerData.onlineSchedulerEnabled ?? false,
          displayContactInfoBeforeDateSelection: schedulerData.displayContactInfoBeforeDateSelection ?? false,
          schedulingMinimumHours: schedulerData.schedulingMinimumHours ?? 0,
          allowChoiceOfInspectors: schedulerData.allowChoiceOfInspectors ?? false,
          hidePricing: schedulerData.hidePricing ?? false,
          showClientPricingDetails: schedulerData.showClientPricingDetails ?? false,
          allowRequestNotes: schedulerData.allowRequestNotes ?? false,
          requireConfirmation: schedulerData.requireConfirmation ?? true,
          confirmationText: schedulerData.confirmationText || '',
          googleAnalyticsNumber: schedulerData.googleAnalyticsNumber || '',
          emailForCompleteBooking: schedulerData.emailForCompleteBooking ?? false,
          emailForInProgressBooking: schedulerData.emailForInProgressBooking ?? false,
          emailNotificationAddress: schedulerData.emailNotificationAddress || '',
          smsForCompleteBooking: schedulerData.smsForCompleteBooking ?? false,
          smsForInProgressBooking: schedulerData.smsForInProgressBooking ?? false,
          smsNotificationNumber: schedulerData.smsNotificationNumber || '',
        });
      } catch (error: any) {
        console.error(error);
        toast.error(error.message || 'Unable to load scheduler settings');
      } finally {
        setInitialLoading(false);
      }
    };

    loadSchedulerSettings();
  }, [reset]);

  const handleViewScheduler = () => {
    if (!company) {
      toast.error('Company information not available');
      return;
    }

    // Create URL slug: company-name-company-id
    const companyNameSlug = company.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const schedulerUrl = `/schedule/${companyNameSlug}-${company.id}`;
    window.open(schedulerUrl, '_blank');
  };

  const onSubmit = async (values: SchedulerFormValues) => {
    try {
      setSaving(true);
      const response = await fetch('/api/online-scheduler', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save scheduler settings');
      }

      const data = await response.json();

      reset({
        onlineSchedulerEnabled: data.onlineSchedulerEnabled ?? false,
        displayContactInfoBeforeDateSelection: data.displayContactInfoBeforeDateSelection ?? false,
        schedulingMinimumHours: data.schedulingMinimumHours ?? 0,
        allowChoiceOfInspectors: data.allowChoiceOfInspectors ?? true,
        hidePricing: data.hidePricing ?? false,
        showClientPricingDetails: data.showClientPricingDetails ?? false,
        allowRequestNotes: data.allowRequestNotes ?? false,
        requireConfirmation: data.requireConfirmation ?? true,
        confirmationText: data.confirmationText || '',
        googleAnalyticsNumber: data.googleAnalyticsNumber || '',
        emailForCompleteBooking: data.emailForCompleteBooking ?? false,
        emailForInProgressBooking: data.emailForInProgressBooking ?? false,
        emailNotificationAddress: data.emailNotificationAddress || '',
        smsForCompleteBooking: data.smsForCompleteBooking ?? false,
        smsForInProgressBooking: data.smsForInProgressBooking ?? false,
        smsNotificationNumber: data.smsNotificationNumber || '',
      });

      toast.success('Scheduler settings updated successfully');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Unable to save scheduler settings');
    } finally {
      setSaving(false);
    }
  };

  const renderTooltipLabel = (label: string, tooltip?: string, htmlFor?: string) => (
    <div className="flex items-center gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {tooltip ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              aria-label={tooltip}
            >
              <Info className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-left">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );

  const renderCheckboxField = (
    name: string,
    label: string,
    field: any,
    description?: string
  ) => (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <Checkbox
          id={name}
          checked={field.value}
          onCheckedChange={(checked) => field.onChange(Boolean(checked))}
        />
        <div className="flex items-center gap-2 flex-1">
          <Label htmlFor={name} className="font-medium cursor-pointer">
            {label}
          </Label>
          {description && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={description}
                >
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-left">
                {description}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
      {description && (
        <p className="text-sm text-muted-foreground pl-7">{description}</p>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Online Scheduler</h2>
            <p className="text-muted-foreground">Configure your online booking system settings</p>
          </div>
          {company && onlineSchedulerEnabled && (
            <Button
              type="button"
              variant="outline"
              onClick={handleViewScheduler}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              View Scheduler
            </Button>
          )}
        </div>

        {initialLoading ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Loading scheduler settings...
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Scheduler Settings</CardTitle>
                <CardDescription>
                  Configure how your online scheduler works
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Controller
                  name="onlineSchedulerEnabled"
                  control={control}
                  render={({ field }) =>
                    renderCheckboxField(
                      'onlineSchedulerEnabled',
                      'Enable Online Scheduling',
                      field,
                      'The Online Scheduler lets you set up a scheduling system to automate your online booking, complete with service types, fees & cost calculations, and time slots or open blocks.'
                    )
                  }
                />

                {onlineSchedulerEnabled && (
                  <>
                    {/* <Controller
                      name="displayContactInfoBeforeDateSelection"
                      control={control}
                      render={({ field }) =>
                        renderCheckboxField(
                          'displayContactInfoBeforeDateSelection',
                          'Display Contact Info before Date Selection',
                          field,
                          'If disabled, schedulers will be able to select the date and time of the inspection before having to add contact information for clients/agents.'
                        )
                      }
                    /> */}

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="schedulingMinimumHours">Don't allow scheduling within (hours)</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground"
                          aria-label='Prevent last-minute bookings by showing "Not Available" for this many hours from now.'
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-left">
                        Prevent last-minute bookings by showing "Not Available" for this many hours from now.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Controller
                    name="schedulingMinimumHours"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="schedulingMinimumHours"
                        type="number"
                        min="0"
                        placeholder="0"
                        value={field.value ?? 0}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    )}
                  />
                  <p className="text-sm text-muted-foreground">
                    Prevent last-minute bookings by showing "Not Available" for this many hours from now.
                  </p>
                  {errors.schedulingMinimumHours && (
                    <p className="text-sm text-destructive">
                      {errors.schedulingMinimumHours.message}
                    </p>
                  )}
                </div>

                <Controller
                  name="allowChoiceOfInspectors"
                  control={control}
                  render={({ field }) =>
                    renderCheckboxField(
                      'allowChoiceOfInspectors',
                      'Allow Choice of inspectors',
                      field,
                      'If disabled, the scheduled inspection will default to the nearest inspector based on distance (either from the most recent inspection or, in the case of the first inspection for the day, from home.)'
                    )
                  }
                />

                <Controller
                  name="hidePricing"
                  control={control}
                  render={({ field }) =>
                    renderCheckboxField(
                      'hidePricing',
                      'Hide pricing',
                      field,
                      'Hides all pricing in the Online Scheduler.'
                    )
                  }
                />

                <Controller
                  name="showClientPricingDetails"
                  control={control}
                  render={({ field }) =>
                    renderCheckboxField(
                      'showClientPricingDetails',
                      'Show client pricing details',
                      field,
                      "Enabling this will show your client pricing details, such as how much was added for square footage, mileage, add-ons, etc."
                    )
                  }
                />

                <Controller
                  name="allowRequestNotes"
                  control={control}
                  render={({ field }) =>
                    renderCheckboxField(
                      'allowRequestNotes',
                      'Allow Request Notes',
                      field,
                      'Allow the Online Scheduler to have a free-entry text box prompting for additional comments: "Anything else you\'d like us to know?"'
                    )
                  }
                />

                <Controller
                  name="requireConfirmation"
                  control={control}
                  render={({ field }) =>
                    renderCheckboxField(
                      'requireConfirmation',
                      'Require Confirmation',
                      field,
                      'If disabled, your confirmation emails will send immediately. If enabled, you must confirm submitted inspections first. They will appear in your dashboard.'
                    )
                  }
                />

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="confirmationText">Confirmation Text</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground"
                          aria-label={`This is displayed once a client completes the Online Scheduler (You should include the {{INSPECTION_LINK}} shortcode if you do not require confirmation):`}
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-left">
                        This is displayed once a client completes the Online Scheduler (You should include the {`{{INSPECTION_LINK}}`} shortcode if you do not require confirmation):
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Controller
                    name="confirmationText"
                    control={control}
                    render={({ field }) => (
                      <div className="min-h-[200px] rounded-md border">
                        <ReactQuill
                          theme="snow"
                          value={field.value || ''}
                          onChange={field.onChange}
                          modules={quillModules}
                          className="h-[150px]"
                        />
                      </div>
                    )}
                  />
                  <p className="text-sm text-muted-foreground">
                    This is displayed once a client completes the Online Scheduler (You should include the {`{{INSPECTION_LINK}}`} shortcode if you do not require confirmation):
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="googleAnalyticsNumber">Google Analytics Number (Conversion Tracking)</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="Your GA property to post a page view to"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-left">
                        Your GA property to post a page view to
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Controller
                    name="googleAnalyticsNumber"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="googleAnalyticsNumber"
                        placeholder="UA-XXXXXXXXX-X"
                        {...field}
                      />
                    )}
                  />
                  <p className="text-sm text-muted-foreground">
                    Your GA property to post a page view to
                  </p>
                </div>
                  </>
                )}
              </CardContent>
            </Card>

            {onlineSchedulerEnabled && (
              <>
            <Card>
              <CardHeader>
                <CardTitle>Email Notifications</CardTitle>
                <CardDescription>
                  Configure email notifications for bookings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Controller
                    name="emailForCompleteBooking"
                    control={control}
                    render={({ field }) =>
                      renderCheckboxField(
                        'emailForCompleteBooking',
                        'Receive an email for complete booking',
                        field
                      )
                    }
                  />

                  <Controller
                    name="emailForInProgressBooking"
                    control={control}
                    render={({ field }) =>
                      renderCheckboxField(
                        'emailForInProgressBooking',
                        'Receive an email when booking is in-progress and client has entered info',
                        field
                      )
                    }
                  />

                  {(emailForCompleteBooking || emailForInProgressBooking) && (
                    <div className="space-y-2 pl-4">
                      <Label htmlFor="emailNotificationAddress">Email Address</Label>
                      <Controller
                        name="emailNotificationAddress"
                        control={control}
                        render={({ field }) => (
                          <Input
                            id="emailNotificationAddress"
                            type="email"
                            placeholder="notifications@yourcompany.com"
                            {...field}
                          />
                        )}
                      />
                      {errors.emailNotificationAddress && (
                        <p className="text-sm text-destructive">
                          {errors.emailNotificationAddress.message}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SMS Notifications</CardTitle>
                <CardDescription>
                  Configure SMS notifications for bookings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Controller
                    name="smsForCompleteBooking"
                    control={control}
                    render={({ field }) =>
                      renderCheckboxField(
                        'smsForCompleteBooking',
                        'Receive a text message for completed bookings',
                        field
                      )
                    }
                  />

                  <Controller
                    name="smsForInProgressBooking"
                    control={control}
                    render={({ field }) =>
                      renderCheckboxField(
                        'smsForInProgressBooking',
                        'Receive a text message when booking is in-progress and client has entered info',
                        field
                      )
                    }
                  />

                  {(smsForCompleteBooking || smsForInProgressBooking) && (
                    <div className="space-y-2 pl-4">
                      <Label htmlFor="smsNotificationNumber">Phone Number</Label>
                      <Controller
                        name="smsNotificationNumber"
                        control={control}
                        render={({ field }) => (
                          <Input
                            id="smsNotificationNumber"
                            type="tel"
                            placeholder="+1 (555) 123-4567"
                            {...field}
                          />
                        )}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
              </>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </TooltipProvider>
  );
}

