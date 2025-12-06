import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Task from '@/src/models/Task';
import TaskComment from '@/src/models/TaskComment';
import { getCurrentUser } from '@/lib/auth-helpers';
import mongoose from 'mongoose';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ inspectionId: string }> }
) {
  try {
    await dbConnect();
    
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { inspectionId } = await params;
    
    if (!inspectionId || !mongoose.Types.ObjectId.isValid(inspectionId)) {
      return NextResponse.json(
        { error: 'Invalid inspection ID' },
        { status: 400 }
      );
    }

    // Fetch all tasks for this inspection
    const tasks = await Task.find({
      inspectionId: new mongoose.Types.ObjectId(inspectionId),
      companyId: currentUser.company,
    })
      .populate('assignedTo', 'firstName lastName profileImageUrl')
      .populate('createdBy', 'firstName lastName profileImageUrl')
      .sort({ createdAt: -1 })
      .lean();

    // Get comment counts for each task
    const taskIds = tasks.map((task) => task._id);
    const commentCounts = await TaskComment.aggregate([
      { $match: { taskId: { $in: taskIds } } },
      { $group: { _id: '$taskId', count: { $sum: 1 } } },
    ]);

    const commentCountMap = new Map(
      commentCounts.map((item) => [item._id.toString(), item.count])
    );

    // Format tasks with comment counts
    const formattedTasks = tasks.map((task) => ({
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
      commentCount: commentCountMap.get(task._id.toString()) || 0,
      createdAt: task.createdAt ? new Date(task.createdAt).toISOString() : null,
      updatedAt: task.updatedAt ? new Date(task.updatedAt).toISOString() : null,
    }));

    return NextResponse.json({ tasks: formattedTasks }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ inspectionId: string }> }
) {
  try {
    await dbConnect();
    
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!currentUser.company) {
      return NextResponse.json(
        { error: 'User is not associated with a company' },
        { status: 400 }
      );
    }

    const { inspectionId } = await params;
    
    if (!inspectionId || !mongoose.Types.ObjectId.isValid(inspectionId)) {
      return NextResponse.json(
        { error: 'Invalid inspection ID' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { taskType, assignedTo, priority, dueDate, title, description } = body;

    // Validate required fields
    if (!taskType || !assignedTo || !priority || !dueDate || !title) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate enum values
    const validTaskTypes = ['Confirm', 'Inquiry', 'Networking', 'Scheduling', 'Other'];
    const validPriorities = ['Low', 'Normal', 'High'];
    
    if (!validTaskTypes.includes(taskType)) {
      return NextResponse.json(
        { error: 'Invalid task type' },
        { status: 400 }
      );
    }

    if (!validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
      return NextResponse.json(
        { error: 'Invalid assigned user ID' },
        { status: 400 }
      );
    }

    // Create the task
    const task = await Task.create({
      inspectionId: new mongoose.Types.ObjectId(inspectionId),
      companyId: currentUser.company,
      taskType,
      assignedTo: new mongoose.Types.ObjectId(assignedTo),
      priority,
      dueDate: new Date(dueDate),
      title: title.trim(),
      description: description?.trim() || '',
      status: 'On Hold',
      createdBy: currentUser._id,
    });

    // Populate the created task
    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'firstName lastName profileImageUrl')
      .populate('createdBy', 'firstName lastName profileImageUrl')
      .lean();

    if (!populatedTask) {
      return NextResponse.json(
        { error: 'Failed to create task' },
        { status: 500 }
      );
    }

    const formattedTask = {
      _id: populatedTask._id.toString(),
      inspectionId: populatedTask.inspectionId.toString(),
      taskType: populatedTask.taskType,
      title: populatedTask.title,
      description: populatedTask.description || '',
      priority: populatedTask.priority,
      status: populatedTask.status,
      dueDate: populatedTask.dueDate ? new Date(populatedTask.dueDate).toISOString() : null,
      assignedTo: populatedTask.assignedTo && typeof populatedTask.assignedTo === 'object'
        ? {
            _id: (populatedTask.assignedTo as any)._id.toString(),
            firstName: (populatedTask.assignedTo as any).firstName || '',
            lastName: (populatedTask.assignedTo as any).lastName || '',
            profileImageUrl: (populatedTask.assignedTo as any).profileImageUrl || '',
          }
        : null,
      createdBy: populatedTask.createdBy && typeof populatedTask.createdBy === 'object'
        ? {
            _id: (populatedTask.createdBy as any)._id.toString(),
            firstName: (populatedTask.createdBy as any).firstName || '',
            lastName: (populatedTask.createdBy as any).lastName || '',
            profileImageUrl: (populatedTask.createdBy as any).profileImageUrl || '',
          }
        : null,
      commentCount: 0,
      createdAt: populatedTask.createdAt ? new Date(populatedTask.createdAt).toISOString() : null,
      updatedAt: populatedTask.updatedAt ? new Date(populatedTask.updatedAt).toISOString() : null,
    };

    return NextResponse.json(
      { message: 'Task created successfully', task: formattedTask },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create task' },
      { status: 500 }
    );
  }
}

