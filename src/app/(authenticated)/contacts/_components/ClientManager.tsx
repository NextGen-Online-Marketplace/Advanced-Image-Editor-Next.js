"use client";

import { useEffect, useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Edit2, Trash2, Loader2, Check, ChevronsUpDown, X, Search } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { DataTable, Column } from '@/components/ui/data-table';
import { MultiSelect, MultiSelectOption } from '@/components/ui/multi-select';
import { cn } from '@/lib/utils';

const clientSchema = z.object({
  isCompany: z.boolean(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  companyName: z.string().optional(),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  ccEmail: z.string().email('Invalid CC email format').optional().or(z.literal('')),
  phone: z.string().optional(),
  homePhone: z.string().optional(),
  mobilePhone: z.string().optional(),
  tags: z.array(z.string()).optional(),
  internalNotes: z.string().optional(),
  internalAdminNotes: z.string().optional(),
  excludeFromMassEmail: z.boolean(),
  unsubscribedFromMassEmails: z.boolean(),
}).refine((data) => {
  if (data.isCompany) {
    return data.companyName && data.companyName.trim().length > 0;
  } else {
    return data.firstName && data.firstName.trim().length > 0 && data.lastName && data.lastName.trim().length > 0;
  }
}, {
  message: 'Required fields are missing',
  path: ['firstName'],
}).refine((data) => {
  if (data.email && data.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(data.email.trim());
  }
  return true;
}, {
  message: 'Invalid email format',
  path: ['email'],
}).refine((data) => {
  if (data.ccEmail && data.ccEmail.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(data.ccEmail.trim());
  }
  return true;
}, {
  message: 'Invalid CC email format',
  path: ['ccEmail'],
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface Tag {
  _id: string;
  name: string;
  color: string;
}

interface Client {
  _id: string;
  isCompany: boolean;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email?: string;
  ccEmail?: string;
  phone?: string;
  homePhone?: string;
  mobilePhone?: string;
  tags?: Tag[];
  internalNotes?: string;
  internalAdminNotes?: string;
  excludeFromMassEmail: boolean;
  unsubscribedFromMassEmails: boolean;
  createdAt: string;
  updatedAt: string;
}

// Tag Search Component
function TagSearchInput({
  selectedTags,
  onAddTag,
  onRemoveTag,
  allTags,
  disabled = false,
}: {
  selectedTags: Tag[];
  onAddTag: (tag: Tag) => void;
  onRemoveTag: (tagId: string) => void;
  allTags: Tag[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter tags client-side based on search query
  const filteredTags = useMemo(() => {
    // Filter out already selected tags
    const availableTags = allTags.filter(
      (tag) => !selectedTags.some((st) => st._id === tag._id)
    );

    if (!searchQuery.trim()) {
      return availableTags;
    }

    // Filter tags by name (case-insensitive)
    const query = searchQuery.trim().toLowerCase();
    return availableTags.filter((tag) =>
      tag.name.toLowerCase().includes(query)
    );
  }, [searchQuery, allTags, selectedTags]);

  const handleSelectTag = (tag: Tag) => {
    onAddTag(tag);
    setSearchQuery('');
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            <span className="text-muted-foreground">Search and select tags...</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search tags..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              {filteredTags.length > 0 ? (
                <CommandGroup>
                  {filteredTags.map((tag) => (
                    <CommandItem
                      key={tag._id}
                      value={tag.name}
                      onSelect={() => handleSelectTag(tag)}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <div
                          className="w-3 h-3 rounded border shrink-0"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span>{tag.name}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : (
                <CommandEmpty>
                  {searchQuery.trim() ? 'No tags found' : 'No tags available'}
                </CommandEmpty>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedTags.map((tag) => (
            <div
              key={tag._id}
              className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-sm"
            >
              <div
                className="w-3 h-3 rounded border"
                style={{ backgroundColor: tag.color }}
              />
              <span>{tag.name}</span>
              <button
                type="button"
                onClick={() => onRemoveTag(tag._id)}
                className="text-destructive hover:text-destructive/80 ml-1"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ClientManager() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedFilterTags, setSelectedFilterTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [allTagsForInput, setAllTagsForInput] = useState<Tag[]>([]);
  const [loadingAllTags, setLoadingAllTags] = useState(false);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      isCompany: false,
      firstName: '',
      lastName: '',
      companyName: '',
      email: '',
      ccEmail: '',
      phone: '',
      homePhone: '',
      mobilePhone: '',
      tags: [],
      internalNotes: '',
      internalAdminNotes: '',
      excludeFromMassEmail: false,
      unsubscribedFromMassEmails: false,
    },
  });

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = form;

  const isCompany = watch('isCompany');

  useEffect(() => {
    loadClients(pagination.page, pagination.limit, searchQuery, selectedFilterTags);
  }, [pagination.page, pagination.limit, searchQuery, selectedFilterTags]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    loadAvailableTags();
  }, []);

  const loadAllTags = async () => {
    try {
      setLoadingAllTags(true);
      const response = await fetch('/api/tags?limit=1000', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setAllTagsForInput(data.tags || []);
      }
    } catch (error: any) {
      console.error('Error loading all tags:', error);
    } finally {
      setLoadingAllTags(false);
    }
  };

  const loadAvailableTags = async () => {
    try {
      setLoadingTags(true);
      // Fetch all tags from the tags table
      const response = await fetch('/api/tags?limit=1000', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load tags');
      }

      const data = await response.json();
      setAvailableTags(data.tags || []);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Unable to load tags');
    } finally {
      setLoadingTags(false);
    }
  };

  const loadClients = async (
    page: number = 1,
    limit: number = 10,
    search: string = '',
    tags: string[] = []
  ) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (search.trim()) {
        params.append('search', search.trim());
      }

      if (tags.length > 0) {
        params.append('tags', tags.join(','));
      }

      const response = await fetch(`/api/clients?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load clients');
      }

      const data = await response.json();
      setClients(data.clients || []);
      if (data.pagination) {
        setPagination(data.pagination);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Unable to load clients');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchInputChange = (value: string) => {
    setSearchInput(value);
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to page 1 on search
  };

  const handleTagsChange = (tags: string[]) => {
    setSelectedFilterTags(tags);
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to page 1 on filter change
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const getClientDisplayName = (client: Client) => {
    if (client.isCompany) {
      return client.companyName || 'Unnamed Company';
    }
    return `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Unnamed Client';
  };

  const columns: Column<Client>[] = [
    {
      id: 'name',
      header: 'Name',
      cell: (row) => <span className="font-medium">{getClientDisplayName(row)}</span>,
    },
    {
      id: 'email',
      header: 'Email',
      cell: (row) => <span>{row.email || '-'}</span>,
    },
    {
      id: 'phone',
      header: 'Phone',
      cell: (row) => <span>{row.phone || row.mobilePhone || '-'}</span>,
    },
    {
      id: 'tags',
      header: 'Tags',
      cell: (row) => (
        <div>
          {row.tags && row.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {row.tags.slice(0, 3).map((tag) => (
                <div
                  key={tag._id}
                  className="flex items-center gap-1 px-2 py-0.5 bg-muted rounded text-xs"
                >
                  <div
                    className="w-2 h-2 rounded border"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span>{tag.name}</span>
                </div>
              ))}
              {row.tags.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{row.tags.length - 3}
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      className: 'text-right',
      cell: (row) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(row)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteClick(row)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const handleCreate = () => {
    setEditingClient(null);
    setSelectedTags([]);
    loadAllTags(); // Load all tags when dialog opens
    reset({
      isCompany: false,
      firstName: '',
      lastName: '',
      companyName: '',
      email: '',
      ccEmail: '',
      phone: '',
      homePhone: '',
      mobilePhone: '',
      tags: [],
      internalNotes: '',
      internalAdminNotes: '',
      excludeFromMassEmail: false,
      unsubscribedFromMassEmails: false,
    });
    setDialogOpen(true);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setSelectedTags(client.tags || []);
    loadAllTags(); // Load all tags when dialog opens
    reset({
      isCompany: client.isCompany,
      firstName: client.firstName || '',
      lastName: client.lastName || '',
      companyName: client.companyName || '',
      email: client.email || '',
      ccEmail: client.ccEmail || '',
      phone: client.phone || '',
      homePhone: client.homePhone || '',
      mobilePhone: client.mobilePhone || '',
      tags: (client.tags || []).map((t) => t._id),
      internalNotes: client.internalNotes || '',
      internalAdminNotes: client.internalAdminNotes || '',
      excludeFromMassEmail: client.excludeFromMassEmail || false,
      unsubscribedFromMassEmails: client.unsubscribedFromMassEmails || false,
    });
    setDialogOpen(true);
  };

  const handleDeleteClick = (client: Client) => {
    setClientToDelete(client);
  };

  const handleConfirmDelete = async () => {
    if (!clientToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/clients/${clientToDelete._id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete client');
      }

      toast.success('Client deleted successfully');
      await loadClients(pagination.page, pagination.limit, searchQuery, selectedFilterTags);
      await loadAvailableTags(); // Refresh available tags
      setClientToDelete(null);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Unable to delete client');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddTag = (tag: Tag) => {
    if (!selectedTags.some((t) => t._id === tag._id)) {
      setSelectedTags([...selectedTags, tag]);
      const currentTags = form.getValues('tags') || [];
      form.setValue('tags', [...currentTags, tag._id]);
    }
  };

  const handleRemoveTag = (tagId: string) => {
    setSelectedTags(selectedTags.filter((t) => t._id !== tagId));
    const currentTags = form.getValues('tags') || [];
    form.setValue('tags', currentTags.filter((id) => id !== tagId));
  };

  const onSubmit = async (values: ClientFormValues) => {
    try {
      setSaving(true);

      // Get all tag IDs from selectedTags (these are the tags the user selected)
      const tagIds: string[] = selectedTags.map((tag) => tag._id);

      // Also check form values.tags for any additional tag IDs
      if (values.tags && Array.isArray(values.tags)) {
        for (const tagId of values.tags) {
          if (typeof tagId === 'string' && !tagIds.includes(tagId)) {
            // Validate it's a proper ObjectId
            if (tagId.match(/^[0-9a-fA-F]{24}$/)) {
              tagIds.push(tagId);
            }
          }
        }
      }

      const url = editingClient ? '/api/clients' : '/api/clients';
      const method = editingClient ? 'PUT' : 'POST';

      const payload = editingClient
        ? { ...values, _id: editingClient._id, tags: tagIds }
        : { ...values, tags: tagIds };

      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save client');
      }

      toast.success(`Client ${editingClient ? 'updated' : 'created'} successfully`);
      await loadClients(pagination.page, pagination.limit, searchQuery, selectedFilterTags);
      await loadAvailableTags(); // Refresh available tags
      await loadAllTags(); // Refresh all tags for input
      setDialogOpen(false);
      setEditingClient(null);
      setSelectedTags([]);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Unable to save client');
    } finally {
      setSaving(false);
    }
  };

  const tagOptions: MultiSelectOption[] = availableTags.map((tag) => ({
    value: tag._id,
    label: tag.name,
    description: tag.color,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Clients</h3>
          <p className="text-sm text-muted-foreground">Manage your clients and contacts</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="search">Search by Name</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by first name, last name, or company..."
                  value={searchInput}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <Label>Filter by Tags</Label>
              <MultiSelect
                value={selectedFilterTags}
                onChange={handleTagsChange}
                options={tagOptions}
                placeholder="Select tags..."
                emptyText="No tags found"
                disabled={loadingTags}
                maxBadges={3}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Clients</CardTitle>
          <CardDescription>Manage your clients and contacts</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={clients}
            loading={loading}
            pagination={
              pagination.totalPages > 0
                ? {
                    page: pagination.page,
                    limit: pagination.limit,
                    total: pagination.total,
                    totalPages: pagination.totalPages,
                    onPageChange: handlePageChange,
                  }
                : undefined
            }
            emptyMessage="No clients found. Click 'Create' to add your first client."
          />
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingClient ? 'Edit Client' : 'Create Client'}</DialogTitle>
            <DialogDescription>
              {editingClient ? 'Update client details' : 'Create a new client or company'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Controller
                name="isCompany"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="isCompany"
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                    />
                    <Label htmlFor="isCompany" className="font-medium cursor-pointer">
                      Client is a Company/Organization
                    </Label>
                  </div>
                )}
              />
            </div>

            {isCompany ? (
              <div className="space-y-2">
                <Label htmlFor="companyName">Company/Organization</Label>
                <Controller
                  name="companyName"
                  control={control}
                  render={({ field }) => (
                    <Input id="companyName" {...field} />
                  )}
                />
                {errors.companyName && (
                  <p className="text-sm text-destructive">{errors.companyName.message}</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Controller
                    name="firstName"
                    control={control}
                    render={({ field }) => (
                      <Input id="firstName" {...field} />
                    )}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-destructive">{errors.firstName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Controller
                    name="lastName"
                    control={control}
                    render={({ field }) => (
                      <Input id="lastName" {...field} />
                    )}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-destructive">{errors.lastName.message}</p>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <Input id="email" type="email" {...field} />
                  )}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ccEmail">CC Email</Label>
                <Controller
                  name="ccEmail"
                  control={control}
                  render={({ field }) => (
                    <Input id="ccEmail" type="email" {...field} />
                  )}
                />
                {errors.ccEmail && (
                  <p className="text-sm text-destructive">{errors.ccEmail.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <Input id="phone" type="tel" {...field} />
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="homePhone">Home Phone</Label>
                <Controller
                  name="homePhone"
                  control={control}
                  render={({ field }) => (
                    <Input id="homePhone" type="tel" {...field} />
                  )}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobilePhone">Mobile Phone</Label>
              <Controller
                name="mobilePhone"
                control={control}
                render={({ field }) => (
                  <Input id="mobilePhone" type="tel" {...field} />
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <TagSearchInput
                selectedTags={selectedTags}
                onAddTag={handleAddTag}
                onRemoveTag={handleRemoveTag}
                allTags={allTagsForInput}
                disabled={saving || loadingAllTags}
              />
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="space-y-2">
                <Controller
                  name="excludeFromMassEmail"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="excludeFromMassEmail"
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                      />
                      <Label htmlFor="excludeFromMassEmail" className="font-medium cursor-pointer">
                        Exclude from Mass Email - Do not contact
                      </Label>
                    </div>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Controller
                  name="unsubscribedFromMassEmails"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="unsubscribedFromMassEmails"
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                      />
                      <Label htmlFor="unsubscribedFromMassEmails" className="font-medium cursor-pointer">
                        Unsubscribed from Mass Emails
                      </Label>
                    </div>
                  )}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="internalNotes">Internal - Only visible to company</Label>
              <Controller
                name="internalNotes"
                control={control}
                render={({ field }) => (
                  <Textarea
                    id="internalNotes"
                    rows={4}
                    {...field}
                  />
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="internalAdminNotes">Internal - Only visible to company admins</Label>
              <Controller
                name="internalAdminNotes"
                control={control}
                render={({ field }) => (
                  <Textarea
                    id="internalAdminNotes"
                    rows={4}
                    {...field}
                  />
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setEditingClient(null);
                  setSelectedTags([]);
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  editingClient ? 'Update' : 'Create'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={Boolean(clientToDelete)} onOpenChange={(open) => !open && !isDeleting && setClientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{clientToDelete ? getClientDisplayName(clientToDelete) : ''}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

