import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Task from '@/src/models/Task';
import TaskComment from '@/src/models/TaskComment';
import { getCurrentUser } from '@/lib/auth-helpers';
import mongoose from 'mongoose';

export async function GET(
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

    // Fetch the task
    const task = await Task.findOne({
      _id: new mongoose.Types.ObjectId(taskId),
      inspectionId: new mongoose.Types.ObjectId(inspectionId),
      companyId: currentUser.company,
    })
      .populate('assignedTo', 'firstName lastName profileImageUrl')
      .populate('createdBy', 'firstName lastName profileImageUrl')
      .lean();

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Fetch comments for this task
    const comments = await TaskComment.find({ taskId: task._id })
      .populate('createdBy', 'firstName lastName profileImageUrl')
      .sort({ createdAt: -1 })
      .lean();

    const formattedComments = comments.map((comment) => ({
      _id: comment._id.toString(),
      taskId: comment.taskId.toString(),
      content: comment.content,
      createdBy: comment.createdBy && typeof comment.createdBy === 'object'
        ? {
            _id: (comment.createdBy as any)._id.toString(),
            firstName: (comment.createdBy as any).firstName || '',
            lastName: (comment.createdBy as any).lastName || '',
            profileImageUrl: (comment.createdBy as any).profileImageUrl || '',
          }
        : null,
      createdAt: comment.createdAt ? new Date(comment.createdAt).toISOString() : null,
    }));

    const formattedTask = {
      _id: task._id.toString(),
      inspectionId: task.inspectionId.toString(),
      taskType: task.taskType,
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : null,
      assignedTo: task.assignedTo && typeof task.assignedTo === 'object'
        ? {
            _id: (task.assignedTo as any)._id.toString(),
            firstName: (task.assignedTo as any).firstName || '',
            lastName: (task.assignedTo as any).lastName || '',
            profileImageUrl: (task.assignedTo as any).profileImageUrl || '',
          }
        : null,
      createdBy: task.createdBy && typeof task.createdBy === 'object'
        ? {
            _id: (task.createdBy as any)._id.toString(),
            firstName: (task.createdBy as any).firstName || '',
            lastName: (task.createdBy as any).lastName || '',
            profileImageUrl: (task.createdBy as any).profileImageUrl || '',
          }
        : null,
      comments: formattedComments,
      createdAt: task.createdAt ? new Date(task.createdAt).toISOString() : null,
      updatedAt: task.updatedAt ? new Date(task.updatedAt).toISOString() : null,
    };

    return NextResponse.json({ task: formattedTask }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const { taskType, assignedTo, priority, dueDate, title, description, status } = body;

    // Build update object
    const updateData: any = {};

    if (taskType !== undefined) {
      const validTaskTypes = ['Confirm', 'Inquiry', 'Networking', 'Scheduling', 'Other'];
      if (!validTaskTypes.includes(taskType)) {
        return NextResponse.json(
          { error: 'Invalid task type' },
          { status: 400 }
        );
      }
      updateData.taskType = taskType;
    }

    if (assignedTo !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
        return NextResponse.json(
          { error: 'Invalid assigned user ID' },
          { status: 400 }
        );
      }
      updateData.assignedTo = new mongoose.Types.ObjectId(assignedTo);
    }

    if (priority !== undefined) {
      const validPriorities = ['Low', 'Normal', 'High'];
      if (!validPriorities.includes(priority)) {
        return NextResponse.json(
          { error: 'Invalid priority' },
          { status: 400 }
        );
      }
      updateData.priority = priority;
    }

    if (dueDate !== undefined) {
      updateData.dueDate = new Date(dueDate);
    }

    if (title !== undefined) {
      if (!title.trim()) {
        return NextResponse.json(
          { error: 'Title cannot be empty' },
          { status: 400 }
        );
      }
      updateData.title = title.trim();
    }

    if (description !== undefined) {
      updateData.description = description.trim();
    }

    if (status !== undefined) {
      const validStatuses = ['On Hold', 'In Progress', 'Complete'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status' },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    // Update the task
    const result = await Task.updateOne(
      {
        _id: new mongoose.Types.ObjectId(taskId),
        inspectionId: new mongoose.Types.ObjectId(inspectionId),
        companyId: currentUser.company,
      },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Fetch updated task
    const updatedTask = await Task.findById(taskId)
      .populate('assignedTo', 'firstName lastName profileImageUrl')
      .populate('createdBy', 'firstName lastName profileImageUrl')
      .lean();

    if (!updatedTask) {
      return NextResponse.json(
        { error: 'Failed to fetch updated task' },
        { status: 500 }
      );
    }

    const commentCount = await TaskComment.countDocuments({ taskId: updatedTask._id });

    const formattedTask = {
      _id: updatedTask._id.toString(),
      inspectionId: updatedTask.inspectionId.toString(),
      taskType: updatedTask.taskType,
      title: updatedTask.title,
      description: updatedTask.description || '',
      priority: updatedTask.priority,
      status: updatedTask.status,
      dueDate: updatedTask.dueDate ? new Date(updatedTask.dueDate).toISOString() : null,
      assignedTo: updatedTask.assignedTo && typeof updatedTask.assignedTo === 'object'
        ? {
            _id: (updatedTask.assignedTo as any)._id.toString(),
            firstName: (updatedTask.assignedTo as any).firstName || '',
            lastName: (updatedTask.assignedTo as any).lastName || '',
            profileImageUrl: (updatedTask.assignedTo as any).profileImageUrl || '',
          }
        : null,
      createdBy: updatedTask.createdBy && typeof updatedTask.createdBy === 'object'
        ? {
            _id: (updatedTask.createdBy as any)._id.toString(),
            firstName: (updatedTask.createdBy as any).firstName || '',
            lastName: (updatedTask.createdBy as any).lastName || '',
            profileImageUrl: (updatedTask.createdBy as any).profileImageUrl || '',
          }
        : null,
      commentCount,
      createdAt: updatedTask.createdAt ? new Date(updatedTask.createdAt).toISOString() : null,
      updatedAt: updatedTask.updatedAt ? new Date(updatedTask.updatedAt).toISOString() : null,
    };

    return NextResponse.json(
      { message: 'Task updated successfully', task: formattedTask },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update task' },
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

    const { inspectionId, taskId } = await params;
    
    if (!taskId || !mongoose.Types.ObjectId.isValid(taskId)) {
      return NextResponse.json(
        { error: 'Invalid task ID' },
        { status: 400 }
      );
    }

    // Delete the task
    const result = await Task.deleteOne({
      _id: new mongoose.Types.ObjectId(taskId),
      inspectionId: new mongoose.Types.ObjectId(inspectionId),
      companyId: currentUser.company,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Delete all comments associated with this task
    await TaskComment.deleteMany({ taskId: new mongoose.Types.ObjectId(taskId) });

    return NextResponse.json(
      { message: 'Task and associated comments deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete task' },
      { status: 500 }
    );
  }
}

