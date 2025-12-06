"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import ReactSelect from 'react-select';
import { format } from 'date-fns';

interface TaskDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  inspectionId: string;
  task?: any; // null for create, task object for edit
  companyUsers: Array<{ value: string; label: string; user: any }>;
  currentUserId?: string;
}

const TASK_TYPE_OPTIONS = [
  { value: 'Confirm', label: 'Confirm' },
  { value: 'Inquiry', label: 'Inquiry' },
  { value: 'Networking', label: 'Networking' },
  { value: 'Scheduling', label: 'Scheduling' },
  { value: 'Other', label: 'Other' },
];

const PRIORITY_OPTIONS = [
  { value: 'Low', label: 'Low' },
  { value: 'Normal', label: 'Normal' },
  { value: 'High', label: 'High' },
];

export default function TaskDialog({
  open,
  onClose,
  onSave,
  inspectionId,
  task,
  companyUsers,
  currentUserId,
}: TaskDialogProps) {
  const isEditMode = !!task;

  const [formData, setFormData] = useState({
    taskType: '',
    assignedTo: '',
    priority: 'Normal',
    dueDate: null as Date | null,
    title: '',
    description: '',
  });

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Comments state (only for edit mode)
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (isEditMode && task) {
        setFormData({
          taskType: task.taskType || '',
          assignedTo: task.assignedTo?._id || '',
          priority: task.priority || 'Normal',
          dueDate: task.dueDate ? new Date(task.dueDate) : null,
          title: task.title || '',
          description: task.description || '',
        });
        
        // Fetch task details including comments if in edit mode
        if (task._id) {
          fetchTaskWithComments(task._id);
        }
      } else {
        // Reset for create mode
        setFormData({
          taskType: '',
          assignedTo: currentUserId || '',
          priority: 'Normal',
          dueDate: null,
          title: '',
          description: '',
        });
        setComments([]);
      }
      setErrors({});
      setNewComment('');
    }
  }, [open, task, isEditMode, currentUserId]);

  const fetchTaskWithComments = async (taskId: string) => {
    try {
      const response = await fetch(`/api/inspections/${inspectionId}/tasks/${taskId}`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.task.comments || []);
      }
    } catch (error) {
      console.error('Error fetching task comments:', error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.taskType) newErrors.taskType = 'Task type is required';
    if (!formData.assignedTo) newErrors.assignedTo = 'Assigned user is required';
    if (!formData.priority) newErrors.priority = 'Priority is required';
    if (!formData.dueDate) newErrors.dueDate = 'Due date is required';
    if (!formData.title.trim()) newErrors.title = 'Title is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const url = isEditMode
        ? `/api/inspections/${inspectionId}/tasks/${task._id}`
        : `/api/inspections/${inspectionId}/tasks`;

      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSave();
        onClose();
      } else {
        const errorData = await response.json();
        alert(`Failed to ${isEditMode ? 'update' : 'create'} task: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Failed to save task. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !task?._id) return;

    setAddingComment(true);
    try {
      const response = await fetch(`/api/inspections/${inspectionId}/tasks/${task._id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        setComments([data.comment, ...comments]);
        setNewComment('');
      } else {
        const errorData = await response.json();
        alert(`Failed to add comment: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment. Please try again.');
    } finally {
      setAddingComment(false);
    }
  };

  const handleDeleteComment = async () => {
    if (!commentToDelete) return;

    setDeletingCommentId(commentToDelete);
    try {
      const response = await fetch(`/api/inspections/${inspectionId}/tasks/${task._id}/comments`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId: commentToDelete }),
      });

      if (response.ok) {
        setComments(comments.filter(c => c._id !== commentToDelete));
        setCommentToDelete(null);
      } else {
        const errorData = await response.json();
        alert(`Failed to delete comment: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment. Please try again.');
    } finally {
      setDeletingCommentId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Task' : 'Create New Task'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Row 1: Task Type and Assign To */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="taskType">
                Task Type <span className="text-destructive">*</span>
              </Label>
              <ReactSelect
                id="taskType"
                value={TASK_TYPE_OPTIONS.find(opt => opt.value === formData.taskType) || null}
                onChange={(option) => setFormData({ ...formData, taskType: option?.value || '' })}
                options={TASK_TYPE_OPTIONS}
                placeholder="Select task type..."
                className="react-select-container"
                classNamePrefix="react-select"
              />
              {errors.taskType && <p className="text-sm text-destructive">{errors.taskType}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignedTo">
                Assign To <span className="text-destructive">*</span>
              </Label>
              <ReactSelect
                id="assignedTo"
                value={companyUsers.find(user => user.value === formData.assignedTo) || null}
                onChange={(option) => setFormData({ ...formData, assignedTo: option?.value || '' })}
                options={companyUsers}
                placeholder="Select user..."
                className="react-select-container"
                classNamePrefix="react-select"
              />
              {errors.assignedTo && <p className="text-sm text-destructive">{errors.assignedTo}</p>}
            </div>
          </div>

          {/* Row 2: Priority and Due Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">
                Priority <span className="text-destructive">*</span>
              </Label>
              <ReactSelect
                id="priority"
                value={PRIORITY_OPTIONS.find(opt => opt.value === formData.priority) || null}
                onChange={(option) => setFormData({ ...formData, priority: option?.value || 'Normal' })}
                options={PRIORITY_OPTIONS}
                placeholder="Select priority..."
                className="react-select-container"
                classNamePrefix="react-select"
              />
              {errors.priority && <p className="text-sm text-destructive">{errors.priority}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">
                Due Date <span className="text-destructive">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal ${!formData.dueDate && 'text-muted-foreground'}`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.dueDate ? format(formData.dueDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.dueDate || undefined}
                    onSelect={(date) => setFormData({ ...formData, dueDate: date || null })}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.dueDate && <p className="text-sm text-destructive">{errors.dueDate}</p>}
            </div>
          </div>

          {/* Title - Full Width */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter task title..."
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
          </div>

          {/* Description - Full Width */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter task description..."
              rows={3}
            />
          </div>

          {/* Comments Section (Edit Mode Only) */}
          {isEditMode && (
            <>
              <div className="border-t my-6"></div>
              <div className="space-y-4">
                <h4 className="font-semibold">Comments</h4>
                
                {/* Add Comment */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddComment();
                        }
                      }}
                    />
                    <Button
                      onClick={handleAddComment}
                      disabled={addingComment || !newComment.trim()}
                    >
                      {addingComment ? (
                        <i className="fas fa-spinner fa-spin"></i>
                      ) : (
                        'Add'
                      )}
                    </Button>
                  </div>
                </div>

                {/* Comments List */}
                {comments.length > 0 ? (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {comments.map((comment) => (
                      <div key={comment._id} className="p-3 bg-muted rounded-lg">
                        <div className="flex items-start gap-3">
                          {comment.createdBy?.profileImageUrl ? (
                            <img 
                              src={comment.createdBy.profileImageUrl} 
                              alt={`${comment.createdBy.firstName} ${comment.createdBy.lastName}`}
                              className="w-8 h-8 rounded-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(`${comment.createdBy.firstName} ${comment.createdBy.lastName}`) + '&background=8230c9&color=fff';
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-semibold text-xs">
                              {`${comment.createdBy?.firstName?.charAt(0) || ''}${comment.createdBy?.lastName?.charAt(0) || ''}`.toUpperCase() || 'U'}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className="font-semibold text-sm">
                                {comment.createdBy?.firstName} {comment.createdBy?.lastName}
                              </p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setCommentToDelete(comment._id)}
                                disabled={deletingCommentId === comment._id}
                                className="h-6 px-2 text-xs"
                              >
                                {deletingCommentId === comment._id ? (
                                  <i className="fas fa-spinner fa-spin"></i>
                                ) : (
                                  <i className="fas fa-trash"></i>
                                )}
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mb-1">
                              {new Date(comment.createdAt).toLocaleString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                            <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No comments yet</p>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                {isEditMode ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>{isEditMode ? 'Update Task' : 'Create Task'}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Delete Comment Confirmation Dialog */}
      <AlertDialog open={!!commentToDelete} onOpenChange={(open) => !open && setCommentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteComment} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

