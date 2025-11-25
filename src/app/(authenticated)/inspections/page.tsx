"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, Column } from '@/components/ui/data-table';
import DefectEditModal from '../../../../components/DefectEditModal';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Edit, Trash2, Plus } from 'lucide-react';

interface Inspection {
  id: string;
  name: string;
  date: string;
  status: string;
}

const mapInspection = (item: any): Inspection => ({
  id: (item && (item.id || item._id))?.toString?.() || Math.random().toString(36).slice(2, 9),
  name: item?.name || item?.inspectionName || "Unnamed Inspection",
  date: item?.date
    ? new Date(item.date).toLocaleDateString()
    : new Date().toLocaleDateString(),
  status: item?.status || "Pending",
});

export default function InspectionsPage() {
  const router = useRouter();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [defectModalOpen, setDefectModalOpen] = useState(false);
  const [selectedInspectionId, setSelectedInspectionId] = useState<string>('');
  const [selectedInspectionName, setSelectedInspectionName] = useState<string>('');
  const [inspectionPendingDelete, setInspectionPendingDelete] = useState<string | null>(null);
  const [deleteInFlight, setDeleteInFlight] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fetch inspections on component mount
  useEffect(() => {
    fetchInspections();
  }, []);

  const fetchInspections = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/inspections', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        const mappedInspections: Inspection[] = Array.isArray(data)
          ? data.map(mapInspection)
          : [];
        setInspections(mappedInspections);
      } else {
        console.error('Failed to fetch inspections');
      }
    } catch (error) {
      console.error('Error fetching inspections:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle row click to open ImageEditor
  const handleRowClick = (inspectionId: string) => {
    router.push(`/image-editor?inspectionId=${inspectionId}`);
  };

  // Handle document click to view inspection report
  const handleDocumentClick = (inspectionId: string) => {
    router.push(`/inspection_report/${inspectionId}`);
  };

  // Handle edit click to edit inspection defects
  const handleEditClick = (inspectionId: string) => {
    setSelectedInspectionId(inspectionId);
    setSelectedInspectionName(`Inspection ${inspectionId.slice(-4)}`);
    setDefectModalOpen(true);
  };

  // Handle close defect modal
  const handleCloseDefectModal = () => {
    setDefectModalOpen(false);
    setSelectedInspectionId('');
    setSelectedInspectionName('');
  };

  // Check for pending annotations when page loads or receives focus
  useEffect(() => {
    const checkPendingAnnotation = () => {
      const pending = localStorage.getItem('pendingAnnotation');
      if (pending) {
        try {
          const annotation = JSON.parse(pending);
          console.log('🔍 Main page detected pending annotation:', annotation);

          // If we have an inspectionId, auto-open the modal
          if (annotation.inspectionId) {
            console.log('🚀 Auto-opening modal for inspection:', annotation.inspectionId);
            setSelectedInspectionId(annotation.inspectionId);
            setSelectedInspectionName(`Inspection ${annotation.inspectionId.slice(-4)}`);
            setDefectModalOpen(true);
            // Note: Don't clear localStorage here - let InformationSections handle it
          }
        } catch (e) {
          console.error('Error parsing pending annotation:', e);
        }
      }
    };

    // Check immediately on mount
    checkPendingAnnotation();

    // Also check when window regains focus
    const handleFocus = () => {
      checkPendingAnnotation();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Handle delete click to delete inspection
  const handleDeleteClick = (inspectionId: string) => {
    setDeleteError(null);
    setInspectionPendingDelete(inspectionId);
  };

  const confirmDeleteInspection = async () => {
    if (!inspectionPendingDelete) return;

    try {
      setDeleteInFlight(true);
      setDeleteError(null);

      const response = await fetch(`/api/inspections/${inspectionPendingDelete}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete inspection');
      }

      // Refresh the inspections list
      await fetchInspections();
      setInspectionPendingDelete(null);
    } catch (error: any) {
      console.error('Error deleting inspection:', error);
      setDeleteError(error.message || 'Failed to delete inspection');
    } finally {
      setDeleteInFlight(false);
    }
  };

  const closeDeleteDialog = () => {
    if (deleteInFlight) return;
    setInspectionPendingDelete(null);
    setDeleteError(null);
  };

  const handleAddInspection = () => {
    router.push('/inspections/create');
  };

  const getStatusBadgeVariant = (status: string) => {
    const normalizedStatus = status.toLowerCase().replace(' ', '-');
    switch (normalizedStatus) {
      case 'completed':
      case 'done':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'in-progress':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const columns: Column<Inspection>[] = [
    {
      id: 'id',
      header: 'ID',
      cell: (row) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.id.slice(-4)}
        </span>
      ),
    },
    {
      id: 'name',
      header: 'Inspection Name',
      cell: (row) => (
        <span className="font-medium">{row.name}</span>
      ),
    },
    {
      id: 'date',
      header: 'Date',
      cell: (row) => (
        <span className="text-muted-foreground">{row.date}</span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => (
        <Badge variant={getStatusBadgeVariant(row.status)}>
          {row.status}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleDocumentClick(row.id);
            }}
            className="h-8 w-8"
            title="View Document"
          >
            <FileText className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleEditClick(row.id);
            }}
            className="h-8 w-8"
            title="Edit Inspection"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteClick(row.id);
            }}
            className="h-8 w-8 text-destructive hover:text-destructive"
            title="Delete Inspection"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inspections</h1>
          <p className="text-muted-foreground mt-1">
            Manage your property inspections efficiently
          </p>
        </div>
        <Button onClick={handleAddInspection}>
          <Plus className="h-4 w-4 mr-2" />
          Add Inspection
        </Button>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={inspections}
        loading={loading}
        emptyMessage="No inspections found. Get started by creating your first inspection."
        onRowClick={(row) => handleRowClick(row.id)}
      />

      {/* Defect Edit Modal */}
      <DefectEditModal
        isOpen={defectModalOpen}
        onClose={handleCloseDefectModal}
        inspectionId={selectedInspectionId}
        inspectionName={selectedInspectionName}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={Boolean(inspectionPendingDelete)} onOpenChange={closeDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete inspection?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The inspection and all related data will be permanently
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {deleteError}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteInFlight}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteInspection}
              disabled={deleteInFlight}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteInFlight ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
