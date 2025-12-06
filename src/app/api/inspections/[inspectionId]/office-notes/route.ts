import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Inspection from '@/src/models/Inspection';
import { getCurrentUser } from '@/lib/auth-helpers';
import mongoose from 'mongoose';

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

    const { inspectionId } = await params;
    
    if (!inspectionId || !mongoose.Types.ObjectId.isValid(inspectionId)) {
      return NextResponse.json(
        { error: 'Invalid inspection ID' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { content } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Note content is required' },
        { status: 400 }
      );
    }

    // Create the new note object
    const newNote = {
      _id: new mongoose.Types.ObjectId(),
      content: content.trim(),
      createdBy: (currentUser as any)._id,
      createdAt: new Date(),
    };

    // Add the note to the inspection
    const result = await Inspection.updateOne(
      { _id: new mongoose.Types.ObjectId(inspectionId) },
      { $push: { officeNotes: newNote } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Inspection not found' },
        { status: 404 }
      );
    }

    // Return the created note with user details
    return NextResponse.json(
      {
        message: 'Note added successfully',
        note: {
          _id: newNote._id.toString(),
          content: newNote.content,
          createdAt: newNote.createdAt.toISOString(),
          createdBy: {
            _id: (currentUser as any)._id.toString(),
            firstName: (currentUser as any).firstName,
            lastName: (currentUser as any).lastName,
            profileImageUrl: (currentUser as any).profileImageUrl,
          },
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error adding office note:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add note' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const body = await req.json();
    const { noteId } = body;

    if (!noteId || !mongoose.Types.ObjectId.isValid(noteId)) {
      return NextResponse.json(
        { error: 'Invalid note ID' },
        { status: 400 }
      );
    }

    // Remove the note from the inspection
    const result = await Inspection.updateOne(
      { _id: new mongoose.Types.ObjectId(inspectionId) },
      { $pull: { officeNotes: { _id: new mongoose.Types.ObjectId(noteId) } } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Inspection not found' },
        { status: 404 }
      );
    }

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: 'Note not found or already deleted' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Note deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting office note:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete note' },
      { status: 500 }
    );
  }
}

