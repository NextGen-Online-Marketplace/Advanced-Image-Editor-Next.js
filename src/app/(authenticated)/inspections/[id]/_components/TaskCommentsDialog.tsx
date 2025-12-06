"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface TaskCommentsDialogProps {
  open: boolean;
  onClose: () => void;
  task: any | null;
  inspectionId: string;
  onCommentDeleted?: () => void;
}

export default function TaskCommentsDialog({
  open,
  onClose,
  task,
  inspectionId,
  onCommentDeleted,
}: TaskCommentsDialogProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (open && task?._id) {
      fetchComments();
    }
  }, [open, task]);

  const fetchComments = async () => {
    if (!task?._id) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/inspections/${inspectionId}/tasks/${task._id}`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.task.comments || []);
      } else {
        console.error('Failed to fetch comments');
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
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
        if (onCommentDeleted) {
          onCommentDeleted();
        }
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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Comments for: {task?.title || 'Task'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <i className="fas fa-spinner fa-spin text-2xl text-muted-foreground"></i>
            </div>
          ) : comments.length > 0 ? (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment._id} className="p-4 bg-card border rounded-lg hover:shadow-sm transition-shadow">
                  <div className="flex items-start gap-3">
                    {comment.createdBy?.profileImageUrl ? (
                      <img 
                        src={comment.createdBy.profileImageUrl} 
                        alt={`${comment.createdBy.firstName} ${comment.createdBy.lastName}`}
                        className="w-10 h-10 rounded-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(`${comment.createdBy.firstName} ${comment.createdBy.lastName}`) + '&background=8230c9&color=fff';
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-semibold text-sm">
                        {`${comment.createdBy?.firstName?.charAt(0) || ''}${comment.createdBy?.lastName?.charAt(0) || ''}`.toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="font-semibold text-sm">
                          {comment.createdBy?.firstName} {comment.createdBy?.lastName}
                        </p>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setCommentToDelete(comment._id)}
                          disabled={deletingCommentId === comment._id}
                          className="h-7 px-2 text-xs"
                        >
                          {deletingCommentId === comment._id ? (
                            <i className="fas fa-spinner fa-spin"></i>
                          ) : (
                            <>
                              <i className="fas fa-trash mr-1"></i>
                              Delete
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {new Date(comment.createdAt).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
                <i className="fas fa-comment-slash text-2xl text-muted-foreground"></i>
              </div>
              <p className="text-sm text-muted-foreground">No comments yet</p>
            </div>
          )}
        </div>
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

