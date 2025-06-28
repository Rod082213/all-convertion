// app/remove-background/page.tsx
"use client";

import { useState, useCallback, FormEvent, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, Loader2, ImageOff, AlertTriangle, XCircle, Download, Wand2 } from 'lucide-react';
import { cn } from '@/app/lib/utils'; // ENSURE THIS PATH IS CORRECT
import NextImage from 'next/image';

const SUPPORTED_BG_INPUT_FORMATS = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/webp': ['.webp'],
};

export default function RemoveBackgroundPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState<string | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [processedFileName, setProcessedFileName] = useState<string | null>(null);
  const [hasAttemptedProcessing, setHasAttemptedProcessing] = useState<boolean>(false);

  // Fix 1: Wrapped resetState in useCallback to make it a stable function
  const resetState = useCallback((clearOriginal: boolean = true) => {
    if (clearOriginal) {
        setSelectedFile(null);
        setFileName(null);
        if (originalPreviewUrl) URL.revokeObjectURL(originalPreviewUrl);
        setOriginalPreviewUrl(null);
    }
    if (processedImageUrl) URL.revokeObjectURL(processedImageUrl);
    setProcessedImageUrl(null);
    setProcessedFileName(null);
    setError(null);
    if (clearOriginal) {
        setHasAttemptedProcessing(false);
    }
  }, [originalPreviewUrl, processedImageUrl]); // It depends on these values for cleanup

  // Fix 1 (cont.): Added the now-stable resetState to the dependency array
  const onDrop = useCallback((acceptedFiles: File[]) => {
    resetState(true);
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const acceptedMimeTypes = Object.keys(SUPPORTED_BG_INPUT_FORMATS);
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      let isValidType = acceptedMimeTypes.includes(file.type);
      if (!isValidType && fileExtension) {
        isValidType = Object.values(SUPPORTED_BG_INPUT_FORMATS).flat().includes(`.${fileExtension}`);
      }
      if (!isValidType) {
        setError('Invalid file type. Please upload a JPG, PNG, or WEBP image.');
        return;
      }
      setSelectedFile(file);
      setFileName(file.name);
      setOriginalPreviewUrl(URL.createObjectURL(file));
      setHasAttemptedProcessing(false);
    }
  }, [resetState]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: SUPPORTED_BG_INPUT_FORMATS,
    multiple: false,
  });

  const handleRemoveBackground = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select an image file first.');
      return;
    }
    setIsProcessing(true);
    setHasAttemptedProcessing(true);
    setProcessedImageUrl(null);
    setProcessedFileName(null);
    setError(null);

    const formData = new FormData();
    formData.append('image_file', selectedFile);
    formData.append('size', 'auto');

    try {
      const response = await fetch('/api/remove-image-background', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        let errorData: unknown; // Use unknown for max type safety
        try {
            // Fix 2: Removed unused 'parseErr' variable
            errorData = await response.json();
        } catch {
            // If JSON parsing fails, construct a standard error object
            const details = await response.text().catch(() => "Could not retrieve error details.");
            errorData = { error: `Server error: ${response.status} ${response.statusText}`, details };
        }
        console.error("API Error Response:", errorData);

        // Fix 3: Replaced 'any' casts with safe, typed property access
        let apiErrorMsg = `An unexpected error occurred. Status: ${response.status}`;
        if (typeof errorData === 'object' && errorData !== null) {
            const err = errorData as Record<string, unknown>;
            if (Array.isArray(err.errors) && err.errors.length > 0) {
                const firstError = err.errors[0] as Record<string, unknown>;
                if (typeof firstError.title === 'string') {
                    apiErrorMsg = firstError.title;
                }
            } else if (typeof err.error === 'string') {
                apiErrorMsg = err.error;
            } else if (typeof err.details === 'string') {
                apiErrorMsg = err.details;
            }
        }
        throw new Error(apiErrorMsg);
      }
      const blob = await response.blob();
      if (blob.type && !blob.type.startsWith('image/')) {
        throw new Error('Processing completed, but the server did not return a valid image.');
      }
      const url = URL.createObjectURL(blob);
      setProcessedImageUrl(url);
      const namePart = fileName ? (fileName.substring(0, fileName.lastIndexOf('.')) || fileName) : 'background_removed';
      const extension = blob.type.split('/')[1] || 'png';
      setProcessedFileName(`${namePart}_no_bg.${extension}`);
      setError(null);
    } catch (err) {
      console.error("Frontend Error:", err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setProcessedImageUrl(null);
      setProcessedFileName(null);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    return () => {
      if (originalPreviewUrl) URL.revokeObjectURL(originalPreviewUrl);
      if (processedImageUrl) URL.revokeObjectURL(processedImageUrl);
    };
  }, [originalPreviewUrl, processedImageUrl]);

  const showProcessedColumn = isProcessing || (hasAttemptedProcessing && (processedImageUrl || error));

  return (
    <div className="w-full max-w-4xl bg-slate-800/50 backdrop-blur-md shadow-2xl rounded-xl p-6 md:p-10">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">
          AI Background Remover
        </h1>
        <p className="text-slate-400 mt-2">Upload an image to automatically remove its background.</p>
      </header>

      {error && !isProcessing && hasAttemptedProcessing && (
        <div className="bg-red-500/20 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative mb-6 flex items-start" role="alert">
          <AlertTriangle className="h-5 w-5 mr-2 mt-1 text-red-400 flex-shrink-0" />
          <div><strong className="font-bold">Error! </strong><span className="block sm:inline">{error}</span></div>
        </div>
      )}
      
      <div className={`grid ${showProcessedColumn ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-8 items-start`}>
        <div> 
          <form onSubmit={handleRemoveBackground}>
            {!selectedFile ? (
              <div
                {...getRootProps()}
                className={cn(
                  "border-2 border-dashed border-slate-600 rounded-lg p-12 text-center cursor-pointer hover:border-slate-500 transition-colors duration-200 w-full",
                  isDragActive && "border-purple-500 bg-slate-700/30"
                )}
              >
                <input {...getInputProps()} />
                <UploadCloud className="mx-auto h-16 w-16 text-slate-500 mb-4" />
                {isDragActive ? (
                  <p className="text-slate-300">Drop the image here ...</p>
                ) : (
                  <p className="text-slate-300">Drag & drop an image, or click to select</p>
                )}
                <p className="text-xs text-slate-500 mt-2">Supports JPG, PNG, WEBP.</p>
              </div>
            ) : (
              <div className="mb-6 p-4 bg-slate-700/30 rounded-lg relative w-full">
                <button type="button" onClick={() => resetState(true)} className="absolute top-2 right-2 text-slate-400 hover:text-red-400" aria-label="Remove image">
                  <XCircle size={20} />
                </button>
                <h3 className="text-lg font-semibold text-slate-200 mb-3">Original Image:</h3>
                <div className="bg-slate-800 rounded-md overflow-hidden flex items-center justify-center mx-auto" style={{ aspectRatio: '1 / 1', maxWidth: '400px', maxHeight: '400px' }}>
                  {originalPreviewUrl && <NextImage src={originalPreviewUrl} alt={fileName || "Original"} width={400} height={400} className="object-contain max-h-full w-auto" />}
                </div>
                <p className="text-sm text-slate-400 mt-2 truncate text-center" title={fileName || ""}>{fileName}</p>
              </div>
            )}

            {selectedFile && (
                <button
                    type="submit"
                    disabled={isProcessing || !selectedFile}
                    className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-semibold py-3 px-4 rounded-md transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                    {isProcessing ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Processing...</>
                    ) : (
                    <><Wand2 className="mr-2 h-5 w-5" /> Remove Background</>
                    )}
                </button>
            )}
          </form>
        </div>

        {showProcessedColumn && (
          <div className="flex flex-col items-center">
            <h3 className="text-lg font-semibold text-slate-200 mb-3 text-center md:text-left">
              {isProcessing ? "Processing..." : (error ? "Processing Failed" : "Processed Image:")}
            </h3>
            <div 
              className="w-full p-4 bg-slate-700/30 rounded-lg flex items-center justify-center" 
              style={{ minHeight: '200px', aspectRatio: '1 / 1', maxHeight: '400px' }}
            >
              {isProcessing && ( 
                   <Loader2 className="h-12 w-12 text-purple-400 animate-spin" />
              )}
              {!isProcessing && processedImageUrl && ( 
                  <NextImage src={processedImageUrl} alt="Background removed" width={400} height={400} className="object-contain max-h-full w-auto rounded-md" />
              )}
              {!isProcessing && !processedImageUrl && error && ( 
                  <div className="text-center">
                    <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-2" />
                    <p className="text-sm text-red-400">Could not process image.</p>
                  </div>
              )}
              {!isProcessing && !processedImageUrl && !error && (
                   <ImageOff className="h-12 w-12 text-slate-500" />
              )}
            </div>

            {!isProcessing && processedImageUrl && processedFileName && (
              <a
                href={processedImageUrl}
                download={processedFileName}
                className="mt-4 inline-flex items-center justify-center bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-md transition-colors duration-200"
              >
                <Download className="mr-2 h-5 w-5" />
                Download Image
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}