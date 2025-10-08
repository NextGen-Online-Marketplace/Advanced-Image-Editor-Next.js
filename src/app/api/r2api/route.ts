import { NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/r2";

// Dynamic import for heic-convert (ESM module)
let heicConvert: any = null;

async function getHeicConvert() {
  if (!heicConvert) {
    heicConvert = (await import('heic-convert')).default;
  }
  return heicConvert;
}

// GET handler to proxy image fetching (avoid CORS issues)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const imageUrl = searchParams.get('imageUrl');

    if (!imageUrl) {
      return NextResponse.json({ error: "No imageUrl provided" }, { status: 400 });
    }

    console.log('🔄 Proxying image fetch for:', imageUrl);

    // Fetch the image from R2
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    // Get the image as a blob
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();

    console.log('✅ Image fetched successfully, size:', arrayBuffer.byteLength);

    // Return the image with proper headers
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': blob.type || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error: any) {
    console.error("❌ Image proxy failed:", error);
    return NextResponse.json(
      { error: `Failed to fetch image: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    // Check if required environment variables are set
    const requiredEnvVars = [
      "CLOUDFLARE_ACCOUNT_ID",
      "CLOUDFLARE_R2_BUCKET",
      "CLOUDFLARE_R2_ACCESS_KEY_ID",
      "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
      "CLOUDFLARE_PUBLIC_URL"
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      console.error(`Missing environment variables: ${missingVars.join(', ')}`);
      return NextResponse.json(
        { error: "Server configuration error: Missing R2 storage credentials" },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size (limit to 10MB to accommodate HEIC files which are larger)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size exceeds the 10MB limit" },
        { status: 400 }
      );
    }

    // Validate file type - now includes HEIC/HEIF formats
    const allowedTypes = [
      "image/jpeg", 
      "image/png", 
      "image/gif", 
      "image/webp",
      "image/heic",
      "image/heif",
      "image/heic-sequence",
      "image/heif-sequence"
    ];
    
    // Also check file extension for HEIC files (some browsers don't set correct MIME type)
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const isHeicFile = fileExtension === 'heic' || fileExtension === 'heif' || 
                       file.type.toLowerCase().includes('heic') || 
                       file.type.toLowerCase().includes('heif');
    
    if (!allowedTypes.includes(file.type) && !isHeicFile) {
      return NextResponse.json(
        { error: "Only JPG, PNG, GIF, WebP, and HEIC/HEIF images are supported" },
        { status: 400 }
      );
    }

    // Convert to Buffer for processing
    let arrayBuffer = await file.arrayBuffer();
    let buffer = Buffer.from(arrayBuffer);
    let finalContentType = file.type;
    let finalFileName = file.name;

    // Convert HEIC/HEIF to JPEG
    if (isHeicFile) {
      try {
        console.log("📸 Converting HEIC/HEIF image to JPEG...");
        const convert = await getHeicConvert();
        
        const jpegBuffer = await convert({
          buffer: buffer,
          format: 'JPEG',
          quality: 0.92 // High quality conversion
        });
        
        buffer = Buffer.from(jpegBuffer);
        finalContentType = 'image/jpeg';
        // Change file extension to .jpg
        finalFileName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
        console.log("✅ HEIC/HEIF converted to JPEG successfully");
      } catch (conversionError) {
        console.error("❌ HEIC conversion failed:", conversionError);
        return NextResponse.json(
          { error: "Failed to convert HEIC/HEIF image. Please try a different format." },
          { status: 500 }
        );
      }
    }

    // Create unique filename with sanitized name
    const sanitizedName = finalFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `uploads/${Date.now()}-${sanitizedName}`;

    console.log("Starting R2 upload process...");
    const result = await uploadToR2(buffer, key, finalContentType);

    return NextResponse.json(
      { success: true, url: result },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Upload failed:", error);
    return NextResponse.json(
      { error: `Upload failed: ${error.message}` },
      { status: 500 }
    );
  }
}
