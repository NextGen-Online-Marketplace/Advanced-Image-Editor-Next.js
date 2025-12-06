import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Task from '@/src/models/Task';
import TaskComment from '@/src/models/TaskComment';
import { getCurrentUser } from '@/lib/auth-helpers';
import mongoose from 'mongoose';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ inspectionId: string; taskId: string }> }
) {
  try {
    await dbConnect();
    
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { inspectionId, taskId } = await params;
    
    if (!taskId || !mongoose.Types.ObjectId.isValid(taskId)) {
      return NextResponse.json(
        { error: 'Invalid task ID' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { content } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      );
    }

    // Verify task exists and belongs to user's company
    const task = await Task.findOne({
      _id: new mongoose.Types.ObjectId(taskId),
      inspectionId: new mongoose.Types.ObjectId(inspectionId),
      companyId: currentUser.company,
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Create the comment
    const comment = await TaskComment.create({
      taskId: new mongoose.Types.ObjectId(taskId),
      content: content.trim(),
      createdBy: currentUser._id,
    });

    // Populate the created comment
    const populatedComment = await TaskComment.findById(comment._id)
      .populate('createdBy', 'firstName lastName profileImageUrl')
      .lean();

    if (!populatedComment) {
      return NextResponse.json(
        { error: 'Failed to create comment' },
        { status: 500 }
      );
    }

    const formattedComment = {
      _id: populatedComment._id.toString(),
      taskId: populatedComment.taskId.toString(),
      content: populatedComment.content,
      createdBy: populatedComment.createdBy && typeof populatedComment.createdBy === 'object'
        ? {
            _id: (populatedComment.createdBy as any)._id.toString(),
            firstName: (populatedComment.createdBy as any).firstName || '',
            lastName: (populatedComment.createdBy as any).lastName || '',
            profileImageUrl: (populatedComment.createdBy as any).profileImageUrl || '',
          }
        : null,
      createdAt: populatedComment.createdAt ? new Date(populatedComment.createdAt).toISOString() : null,
    };

    return NextResponse.json(
      { message: 'Comment added successfully', comment: formattedComment },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error adding comment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add comment' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ inspectionId: string; taskId: string }> }
) {
  try {
    await dbConnect();
    
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId } = await params;
    
    if (!taskId || !mongoose.Types.ObjectId.isValid(taskId)) {
      return NextResponse.json(
        { error: 'Invalid task ID' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { commentId } = body;

    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
      return NextResponse.json(
        { error: 'Invalid comment ID' },
        { status: 400 }
      );
    }

    // Delete the comment (verify it belongs to the specified task)
    const result = await TaskComment.deleteOne({
      _id: new mongoose.Types.ObjectId(commentId),
      taskId: new mongoose.Types.ObjectId(taskId),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Comment not found or does not belong to this task' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Comment deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting comment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete comment' },
      { status: 500 }
    );
  }
}

