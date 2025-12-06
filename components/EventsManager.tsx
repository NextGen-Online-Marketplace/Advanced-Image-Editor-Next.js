"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, Pencil, X } from 'lucide-react';
import ReactSelect from 'react-select';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface EventData {
  _id?: string;
  name: string;
  description: string;
  inspector: { value: string; label: string } | null;
  startDate: Date | undefined;
  startTime: string;
  endDate: Date | undefined;
  endTime: string;
}

interface EventsManagerProps {
  mode: 'create' | 'edit';
  inspectionId?: string;
  inspectors: Array<{ value: string; label: string }>;
  defaultDate?: Date;
  defaultInspector?: { value: string; label: string } | null;
  events: EventData[];
  onEventsChange: (events: EventData[]) => void;
  onEventSaved?: () => void;
}

export default function EventsManager({
  mode,
  inspectionId,
  inspectors,
  defaultDate,
  defaultInspector,
  events,
  onEventsChange,
  onEventSaved,
}: EventsManagerProps) {
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEventIndex, setEditingEventIndex] = useState<number | null>(null);
  const [currentEvent, setCurrentEvent] = useState<EventData>({
    name: '',
    description: '',
    inspector: null,
    startDate: undefined,
    startTime: '00:00',
    endDate: undefined,
    endTime: '00:00',
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<{ id?: string; index?: number } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch events in edit mode
  useEffect(() => {
    if (mode === 'edit' && inspectionId) {
      fetchEvents();
    }
  }, [mode, inspectionId]);

  const fetchEvents = async () => {
    if (!inspectionId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/inspections/${inspectionId}/events`);
      if (response.ok) {
        const data = await response.json();
        const formattedEvents = (data.events || []).map((event: any) => {
          const startDate = event.startDate ? new Date(event.startDate) : undefined;
          const endDate = event.endDate ? new Date(event.endDate) : undefined;

          return {
            _id: event._id,
            name: event.name,
            description: event.description || '',
            inspector: event.inspector
              ? {
                  value: event.inspector._id,
                  label: `${event.inspector.firstName} ${event.inspector.lastName}`,
                }
              : null,
            startDate,
            startTime: startDate ? format(startDate, 'HH:mm') : '00:00',
            endDate,
            endTime: endDate ? format(endDate, 'HH:mm') : '00:00',
          };
        });
        onEventsChange(formattedEvents);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDefaultEventData = (): EventData => {
    if (defaultDate) {
      const startDate = new Date(defaultDate);
      const endDate = new Date(defaultDate);
      endDate.setHours(endDate.getHours() + 1);

      return {
        name: '',
        description: '',
        inspector: defaultInspector || null,
        startDate,
        startTime: format(startDate, 'HH:mm'),
        endDate,
        endTime: format(endDate, 'HH:mm'),
      };
    }

    return {
      name: '',
      description: '',
      inspector: defaultInspector || null,
      startDate: undefined,
      startTime: '00:00',
      endDate: undefined,
      endTime: '00:00',
    };
  };

  const handleOpenEventModal = (index?: number) => {
    if (index !== undefined) {
      const event = events[index];
      setCurrentEvent({ ...event });
      setEditingEventIndex(index);
    } else {
      setCurrentEvent(getDefaultEventData());
      setEditingEventIndex(null);
    }
    setIsEventModalOpen(true);
  };

  const validateEvent = () => {
    const newErrors: Record<string, string> = {};

    if (!currentEvent.name.trim()) newErrors.name = 'Event name is required';
    if (!currentEvent.inspector) newErrors.inspector = 'Inspector is required';
    if (!currentEvent.startDate) newErrors.startDate = 'Start date is required';
    if (!currentEvent.endDate) newErrors.endDate = 'End date is required';

    // Validate end date is not before start date
    if (currentEvent.startDate && currentEvent.endDate) {
      const start = new Date(currentEvent.startDate);
      const end = new Date(currentEvent.endDate);
      
      // Apply times
      if (currentEvent.startTime) {
        const [hours, minutes] = currentEvent.startTime.split(':').map(Number);
        start.setHours(hours, minutes, 0, 0);
      }
      if (currentEvent.endTime) {
        const [hours, minutes] = currentEvent.endTime.split(':').map(Number);
        end.setHours(hours, minutes, 0, 0);
      }

      if (end < start) {
        newErrors.endDate = 'End date/time cannot be before start date/time';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveEvent = async () => {
    if (!validateEvent()) return;

    if (mode === 'create') {
      // Create mode: just update local state
      if (editingEventIndex !== null) {
        const newEvents = [...events];
        newEvents[editingEventIndex] = { ...currentEvent };
        onEventsChange(newEvents);
      } else {
        onEventsChange([...events, { ...currentEvent }]);
      }
      setIsEventModalOpen(false);
      resetCurrentEvent();
    } else {
      // Edit mode: make API call
      setSaving(true);
      try {
        // Combine date and time into full Date objects
        let startDateTime: Date | undefined = undefined;
        let endDateTime: Date | undefined = undefined;

        if (currentEvent.startDate) {
          startDateTime = new Date(currentEvent.startDate);
          if (currentEvent.startTime) {
            const [hours, minutes] = currentEvent.startTime.split(':').map(Number);
            startDateTime.setHours(hours, minutes, 0, 0);
          }
        }

        if (currentEvent.endDate) {
          endDateTime = new Date(currentEvent.endDate);
          if (currentEvent.endTime) {
            const [hours, minutes] = currentEvent.endTime.split(':').map(Number);
            endDateTime.setHours(hours, minutes, 0, 0);
          }
        }

        const eventData = {
          name: currentEvent.name.trim(),
          description: currentEvent.description.trim() || undefined,
          inspector: currentEvent.inspector?.value || undefined,
          startDate: startDateTime?.toISOString(),
          endDate: endDateTime?.toISOString(),
        };

        const url = editingEventIndex !== null && events[editingEventIndex]._id
          ? `/api/inspections/${inspectionId}/events/${events[editingEventIndex]._id}`
          : `/api/inspections/${inspectionId}/events`;

        const method = editingEventIndex !== null && events[editingEventIndex]._id ? 'PUT' : 'POST';

        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData),
        });

        if (response.ok) {
          setIsEventModalOpen(false);
          resetCurrentEvent();
          if (onEventSaved) {
            onEventSaved();
          }
          fetchEvents(); // Refresh events list
        } else {
          const errorData = await response.json();
          alert(`Failed to ${editingEventIndex !== null ? 'update' : 'create'} event: ${errorData.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error saving event:', error);
        alert('Failed to save event. Please try again.');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleDeleteEvent = async () => {
    if (!eventToDelete) return;

    if (mode === 'create') {
      // Create mode: just update local state
      if (eventToDelete.index !== undefined) {
        onEventsChange(events.filter((_, i) => i !== eventToDelete.index));
      }
      setEventToDelete(null);
    } else {
      // Edit mode: make API call
      if (!eventToDelete.id) {
        setEventToDelete(null);
        return;
      }

      setDeleting(true);
      try {
        const response = await fetch(`/api/inspections/${inspectionId}/events/${eventToDelete.id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setEventToDelete(null);
          if (onEventSaved) {
            onEventSaved();
          }
          fetchEvents(); // Refresh events list
        } else {
          const errorData = await response.json();
          alert(`Failed to delete event: ${errorData.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error deleting event:', error);
        alert('Failed to delete event. Please try again.');
      } finally {
        setDeleting(false);
      }
    }
  };

  const resetCurrentEvent = () => {
    setCurrentEvent(getDefaultEventData());
    setEditingEventIndex(null);
    setErrors({});
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Events</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleOpenEventModal()}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Event
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <i className="fas fa-spinner fa-spin text-2xl text-muted-foreground"></i>
        </div>
      ) : events.length === 0 ? (
        <p className="text-sm text-muted-foreground">No events added yet</p>
      ) : (
        <div className="space-y-2">
          {events.map((event, index) => {
            const startDateTime = event.startDate
              ? `${format(event.startDate, 'PPP')} ${event.startTime}`
              : 'Not set';
            const endDateTime = event.endDate
              ? `${format(event.endDate, 'PPP')} ${event.endTime}`
              : 'Not set';
            const inspectorName = event.inspector?.label || 'Not assigned';

            return (
              <div key={event._id || index} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">{event.name || 'Unnamed Event'}</h4>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                    )}
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <p><span className="font-medium">Inspector:</span> {inspectorName}</p>
                      <p><span className="font-medium">Start:</span> {startDateTime}</p>
                      <p><span className="font-medium">End:</span> {endDateTime}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEventModal(index)}
                      className="h-8 w-8"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setEventToDelete({ id: event._id, index })}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Event Dialog */}
      <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEventIndex !== null ? 'Edit Event' : 'Add Event'}</DialogTitle>
            <DialogDescription>
              Add an event to this inspection. Events can be scheduled with specific dates and assigned to inspectors.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="eventName">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="eventName"
                value={currentEvent.name}
                onChange={(e) => setCurrentEvent({ ...currentEvent, name: e.target.value })}
                placeholder="Enter event name..."
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="eventDescription">Description</Label>
              <Textarea
                id="eventDescription"
                value={currentEvent.description}
                onChange={(e) => setCurrentEvent({ ...currentEvent, description: e.target.value })}
                placeholder="Enter event description..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>
                Inspector <span className="text-destructive">*</span>
              </Label>
              <ReactSelect
                value={currentEvent.inspector}
                onChange={(option) => setCurrentEvent({ ...currentEvent, inspector: option })}
                options={inspectors}
                isClearable
                placeholder="Select an inspector..."
                className="react-select-container"
                classNamePrefix="react-select"
              />
              {errors.inspector && <p className="text-sm text-destructive">{errors.inspector}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Start Date <span className="text-destructive">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !currentEvent.startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {currentEvent.startDate ? format(currentEvent.startDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={currentEvent.startDate}
                      onSelect={(date) => setCurrentEvent({ ...currentEvent, startDate: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.startDate && <p className="text-sm text-destructive">{errors.startDate}</p>}
              </div>
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={currentEvent.startTime}
                  onChange={(e) => setCurrentEvent({ ...currentEvent, startTime: e.target.value })}
                  className="w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  End Date <span className="text-destructive">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !currentEvent.endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {currentEvent.endDate ? format(currentEvent.endDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={currentEvent.endDate}
                      onSelect={(date) => setCurrentEvent({ ...currentEvent, endDate: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.endDate && <p className="text-sm text-destructive">{errors.endDate}</p>}
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={currentEvent.endTime}
                  onChange={(e) => setCurrentEvent({ ...currentEvent, endTime: e.target.value })}
                  className="w-full"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEventModalOpen(false);
                resetCurrentEvent();
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveEvent} disabled={saving}>
              {saving ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  {editingEventIndex !== null ? 'Updating...' : 'Adding...'}
                </>
              ) : (
                <>{editingEventIndex !== null ? 'Update Event' : 'Add Event'}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Event Confirmation Dialog */}
      <AlertDialog open={!!eventToDelete} onOpenChange={(open) => !open && setEventToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this event? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEvent}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
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

