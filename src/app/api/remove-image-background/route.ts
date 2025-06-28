// app/api/remove-image-background/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary'; // Use v2 for promise-based API
import { Readable } from 'stream';

// --- Cloudinary Configuration ---
// These will be picked up from process.env by the SDK if named correctly
// (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)
// Or you can configure explicitly:
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Use https
});


// Helper function to convert ArrayBuffer to a stream Cloudinary uploader can use
function bufferToStream(buffer: ArrayBuffer) {
    const readable = new Readable();
    readable._read = () => {}; // _read is required but you can noop it
    readable.push(Buffer.from(buffer));
    readable.push(null);
    return readable;
}

export async function POST(req: NextRequest) {
  console.log("API /api/remove-image-background POST request received (for Cloudinary)");

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error("Cloudinary environment variables are not fully set.");
    return NextResponse.json({ error: 'Server configuration error: Cloudinary service not configured.' }, { status: 500 });
  }

  try {
    const requestFormData = await req.formData();
    const imageFile = requestFormData.get('image_file') as File | null;

    if (!imageFile) {
      return NextResponse.json({ error: 'No image file provided.' }, { status: 400 });
    }

    console.log(`Received image: ${imageFile.name}, Size: ${imageFile.size}, Type: ${imageFile.type}`);

    const imageBuffer = await imageFile.arrayBuffer();
    if (imageBuffer.byteLength === 0) {
        return NextResponse.json({ error: 'Received empty image file.' }, { status: 400 });
    }

    // --- Upload to Cloudinary and Apply Transformation ---
    console.log("Uploading image to Cloudinary...");

    const uploadResult = await new Promise<cloudinary.UploadApiResponse | undefined>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: "background_removed_uploads", // Optional: organize in Cloudinary
                // Eager transformation to remove background and fetch this version
                // The result of this eager transformation isn't directly used if we fetch the transformed URL later,
                // but it ensures the transformation is applied.
                // A more common way is to upload, then construct the URL with transformation.
                // For simplicity in one step, let's try to get the URL from an eager transform if possible,
                // otherwise, we construct it.
                // eager: [
                //   { effect: "background_removal", fetch_format: "png" }
                // ],
                // To simply upload and then construct URL:
                resource_type: "image",
            },
            (error, result) => {
                if (error) {
                    console.error("Cloudinary upload error:", error);
                    return reject(error);
                }
                resolve(result);
            }
        );
        bufferToStream(imageBuffer).pipe(uploadStream);
    });

    if (!uploadResult || !uploadResult.public_id) {
        throw new Error('Cloudinary upload failed or did not return a public_id.');
    }

    console.log("Cloudinary upload successful. Public ID:", uploadResult.public_id);

    // Construct the URL for the image with background removal
    // `f_png` forces PNG output, good for transparency.
    // `e_background_removal` is the key transformation.
    const transformedUrl = cloudinary.url(uploadResult.public_id, {
        effect: "background_removal",
        fetch_format: "png", // Force PNG output for transparency
        // You can add other transformations like quality, dpr, etc.
        // quality: "auto",
        // dpr: "auto"
    });

    console.log("Transformed Cloudinary URL:", transformedUrl);

    // Fetch the transformed image from Cloudinary
    const imageResponse = await fetch(transformedUrl);
    if (!imageResponse.ok) {
        console.error("Failed to fetch transformed image from Cloudinary. Status:", imageResponse.status);
        const errorText = await imageResponse.text();
        console.error("Cloudinary fetch error body:", errorText);
        throw new Error(`Failed to retrieve processed image from Cloudinary: ${imageResponse.statusText} - ${errorText.substring(0,100)}`);
    }

    const processedImageBlob = await imageResponse.blob();

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', processedImageBlob.type || 'image/png');
    // You can set Content-Disposition if you want to suggest a filename
    // const originalNamePart = imageFile.name.substring(0, imageFile.name.lastIndexOf('.')) || imageFile.name;
    // const outputFilename = `${originalNamePart}_no_bg.png`;
    // responseHeaders.set('Content-Disposition', `attachment; filename="${outputFilename}"`);

    console.log(`Successfully processed image with Cloudinary, returning blob of type: ${processedImageBlob.type}`);
    return new NextResponse(processedImageBlob, { status: 200, headers: responseHeaders });

  } catch (error) {
    console.error('API Route /remove-image-background Error with Cloudinary:', error);
    let details = (error as Error).message;
     if ((error as any).cause) {
        details += ` | Cause: ${JSON.stringify((error as any).cause)}`;
    }
    // Check if it's a Cloudinary specific error structure
    if ((error as any).http_code && (error as any).message) {
        details = `Cloudinary API Error (${(error as any).http_code}): ${(error as any).message}`;
    }
    return NextResponse.json({ error: 'Background removal processing failed.', details: details }, { status: 500 });
  }
}