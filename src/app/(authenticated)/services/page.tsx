"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  Layers,
  Loader2,
  Pencil,
  PlusCircle,
  Trash2,
} from "lucide-react";

interface Service {
  _id: string;
  name: string;
  serviceCategory: string;
  description?: string;
  hiddenFromScheduler: boolean;
  baseCost: number;
  baseDurationHours: number;
  defaultInspectionEvents: string[];
  organizationServiceId?: string;
  createdAt: string;
  updatedAt: string;
}

type MessageState = {
  type: "success" | "error";
  text: string;
} | null;

export default function ServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<MessageState>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const noServices = useMemo(() => !loading && services.length === 0, [loading, services.length]);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/services", { credentials: "include" });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to fetch services");
      }

      const data = await response.json();
      setServices(data.services || []);
    } catch (error: any) {
      console.error("Error fetching services:", error);
      setMessage({ type: "error", text: error.message || "Failed to load services" });
    } finally {
      setLoading(false);
    }
  };

  const openDeleteDialog = (service: Service) => {
    setServiceToDelete(service);
    setDeleteDialogOpen(true);
  };

  const handleDeleteService = async () => {
    if (!serviceToDelete) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/services/${serviceToDelete._id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete service");
      }

      setMessage({ type: "success", text: result.message || "Service deleted" });
      setDeleteDialogOpen(false);
      setServiceToDelete(null);
      fetchServices();
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Failed to delete service" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Services</h1>
            <p className="text-muted-foreground">
              Manage your inspection services, pricing, and scheduling options.
            </p>
          </div>
          <Button onClick={() => router.push("/services/create")}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Service
          </Button>
        </div>

        {message && (
          <Card
            className={
              message.type === "success"
                ? "border-green-200 bg-green-50"
                : "border-red-200 bg-red-50"
            }
          >
            <CardContent className="flex items-start gap-3 p-4">
              {message.type === "success" ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <p className="text-sm text-muted-foreground">{message.text}</p>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setMessage(null)}>
                Dismiss
              </Button>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center gap-2 p-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading services...
            </CardContent>
          </Card>
        ) : noServices ? (
          <Card>
            <CardContent className="space-y-4 p-10 text-center text-muted-foreground">
              <p>No services found yet.</p>
              <Link href="/services/create" className="text-primary underline">
                Create your first service
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full divide-y divide-muted border-collapse text-sm">
              <thead className="bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Base Cost</th>
                  <th className="px-4 py-3">Base Duration</th>
                  <th className="px-4 py-3">Default Events</th>
                  <th className="px-4 py-3">Org Service ID</th>
                  <th className="px-4 py-3 text-center">Hidden</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted">
                {services.map((service) => {
                  const eventSummary = service.defaultInspectionEvents.join(", ");
                  return (
                    <tr key={service._id} className="hover:bg-muted/30">
                      <td className="max-w-xs px-4 py-3 align-top">
                        <span className="font-medium text-foreground">{service.name}</span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4 text-muted-foreground" />
                          <span>{service.serviceCategory || "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        {service.baseCost !== undefined ? `$${service.baseCost.toFixed(2)}` : "—"}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {service.baseDurationHours !== undefined
                          ? `${service.baseDurationHours.toFixed(2)} hrs`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 align-top text-muted-foreground">
                        {eventSummary || "—"}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {service.organizationServiceId || "—"}
                      </td>
                      <td className="px-4 py-3 text-center align-top">
                        {service.hiddenFromScheduler ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center gap-1 rounded-full border border-yellow-200 bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
                                Hidden
                                <Info className="h-3.5 w-3.5" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              This addon will not be available in your online scheduler.
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-xs text-muted-foreground">Visible</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right align-top">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => router.push(`/services/${service._id}`)}
                            title="Edit service"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => openDeleteDialog(service)}
                            title="Delete service"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Service</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {" "}
                <span className="font-semibold">{serviceToDelete?.name}</span>? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setServiceToDelete(null);
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteService} disabled={isDeleting}>
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}


