"use client";

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Edit2, Trash2, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { DataTable, Column } from '@/components/ui/data-table';

const agencySchema = z.object({
  name: z.string().min(1, 'Agency name is required'),
});

type AgencyFormValues = z.infer<typeof agencySchema>;

interface Agency {
  _id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export default function AgencyManager() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);
  const [agencyToDelete, setAgencyToDelete] = useState<Agency | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const form = useForm<AgencyFormValues>({
    resolver: zodResolver(agencySchema),
    defaultValues: {
      name: '',
    },
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = form;

  useEffect(() => {
    loadAgencies(pagination.page, pagination.limit, searchQuery);
  }, [pagination.page, pagination.limit, searchQuery]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadAgencies = async (
    page: number = 1,
    limit: number = 10,
    search: string = ''
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

      const response = await fetch(`/api/agencies?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load agencies');
      }

      const data = await response.json();
      setAgencies(data.agencies || []);
      if (data.pagination) {
        setPagination(data.pagination);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Unable to load agencies');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchInputChange = (value: string) => {
    setSearchInput(value);
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to page 1 on search
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const columns: Column<Agency>[] = [
    {
      id: 'name',
      header: 'Name',
      cell: (row) => <span className="font-medium">{row.name}</span>,
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
    setEditingAgency(null);
    reset({
      name: '',
    });
    setDialogOpen(true);
  };

  const handleEdit = (agency: Agency) => {
    setEditingAgency(agency);
    reset({
      name: agency.name || '',
    });
    setDialogOpen(true);
  };

  const handleDeleteClick = (agency: Agency) => {
    setAgencyToDelete(agency);
  };

  const handleConfirmDelete = async () => {
    if (!agencyToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/agencies/${agencyToDelete._id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete agency');
      }

      toast.success('Agency deleted successfully');
      await loadAgencies(pagination.page, pagination.limit, searchQuery);
      setAgencyToDelete(null);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Unable to delete agency');
    } finally {
      setIsDeleting(false);
    }
  };

  const onSubmit = async (values: AgencyFormValues) => {
    try {
      setSaving(true);

      const url = editingAgency ? '/api/agencies' : '/api/agencies';
      const method = editingAgency ? 'PUT' : 'POST';

      const payload = editingAgency
        ? { ...values, _id: editingAgency._id }
        : values;

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
        throw new Error(errorData.error || 'Failed to save agency');
      }

      toast.success(`Agency ${editingAgency ? 'updated' : 'created'} successfully`);
      await loadAgencies(pagination.page, pagination.limit, searchQuery);
      setDialogOpen(false);
      setEditingAgency(null);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Unable to save agency');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Agencies</h3>
          <p className="text-sm text-muted-foreground">Manage your agencies</p>
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
                  placeholder="Search by name..."
                  value={searchInput}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Agencies</CardTitle>
          <CardDescription>Manage your agencies</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={agencies}
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
            emptyMessage="No agencies found. Click 'Create' to add your first agency."
          />
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAgency ? 'Edit Agency' : 'Create Agency'}</DialogTitle>
            <DialogDescription>
              {editingAgency ? 'Update agency details' : 'Create a new agency'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Agency Name</Label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <Input id="name" {...field} placeholder="Enter agency name" />
                )}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setEditingAgency(null);
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
                  editingAgency ? 'Update' : 'Create'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={Boolean(agencyToDelete)} onOpenChange={(open) => !open && !isDeleting && setAgencyToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agency?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{agencyToDelete?.name || ''}"? This action cannot be undone.
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

