// app/transcribe/page.tsx
"use client";

import { useState, useCallback, MouseEvent } from 'react'; // Corrected: Removed unused 'FormEvent'
import { useDropzone } from 'react-dropzone';
import { UploadCloud, Loader2, FileText, AlertTriangle, XCircle, Link2 } from 'lucide-react';
import { cn } from '@/app/lib/utils';

type InputType = 'upload' | 'url';

export default function VideoTranscribePage() {
  const [inputType, setInputType] = useState<InputType>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    setTranscription(null);
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (!file.type.startsWith('video/')) {
        setError('Invalid file type. Please upload a video file.');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/*': [] },
    multiple: false,
  });

  const handleProcessRequest = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setError(null);
    setTranscription(null);
    setVideoTitle(null);

    const formData = new FormData();
    
    if (inputType === 'upload') {
      if (!selectedFile) {
        setError('Please select a video file first.');
        return;
      }
      formData.append('operationType', 'file');
      formData.append('video', selectedFile);
    } else if (inputType === 'url') {
      if (!videoUrl.trim()) {
        setError('Please enter a YouTube video URL.');
        return;
      }
      formData.append('operationType', 'url');
      formData.append('videoUrl', videoUrl);
    }

    setIsTranscribing(true);

    try {
      const response = await fetch('/api/transcribe-video', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `Transcription failed: ${response.status}`);
      }

      setTranscription(result.transcription);
      if (result.videoTitle) {
        setVideoTitle(result.videoTitle);
      }

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setError(null);
    setTranscription(null);
  };

  const isProcessButtonDisabled = isTranscribing || (inputType === 'upload' && !selectedFile) || (inputType === 'url' && !videoUrl.trim());

  return (
    <div className="w-full max-w-3xl bg-slate-800/50 backdrop-blur-md shadow-2xl rounded-xl p-6 md:p-10">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500">
          Video Transcription Service
        </h1>
        <p className="text-slate-400 mt-2">Get a transcription from a video file or YouTube URL.</p>
      </header>

      {error && (
        <div className="bg-red-500/20 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative mb-6 flex items-start" role="alert">
          <AlertTriangle className="h-5 w-5 mr-2 mt-1 text-red-400 flex-shrink-0" />
          <div><strong className="font-bold">Error! </strong><span className="block sm:inline">{error}</span></div>
        </div>
      )}
      
      {/* Input Type Selector */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex rounded-md shadow-sm bg-slate-700 p-1">
          <button onClick={() => setInputType('upload')} className={cn('px-4 py-2 text-sm font-medium transition-colors duration-200 rounded-md', inputType === 'upload' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-600')}>
            <UploadCloud className="inline-block w-4 h-4 mr-2" /> Upload File
          </button>
          <button onClick={() => setInputType('url')} className={cn('px-4 py-2 text-sm font-medium transition-colors duration-200 rounded-md', inputType === 'url' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-600')}>
            <Link2 className="inline-block w-4 h-4 mr-2" /> Paste URL
          </button>
        </div>
      </div>
      
      {/* Conditional Input Area */}
      {inputType === 'upload' ? (
        !selectedFile ? (
          <div {...getRootProps()} className={cn("border-2 border-dashed border-slate-600 rounded-lg p-12 text-center cursor-pointer hover:border-slate-500", isDragActive && "border-emerald-500 bg-slate-700/30")}>
            <input {...getInputProps()} />
            <UploadCloud className="mx-auto h-16 w-16 text-slate-500 mb-4" />
            <p className="text-slate-300">{isDragActive ? "Drop the video here..." : "Drag & drop a video file, or click to select"}</p>
          </div>
        ) : (
          <div className="mb-6 p-6 bg-slate-700/30 rounded-lg relative">
            <button type="button" onClick={handleRemoveFile} className="absolute top-3 right-3 text-slate-400 hover:text-red-400" aria-label="Remove file">
              <XCircle size={24} />
            </button>
            <div className="flex items-center gap-6">
              <FileText className="h-16 w-16 text-emerald-400 flex-shrink-0" />
              <div className="w-full text-slate-300 min-w-0">
                <p className="font-semibold truncate" title={selectedFile.name}>{selectedFile.name}</p>
                <p className="text-sm text-slate-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="mb-6">
          <label htmlFor="videoUrl" className="block text-sm font-medium text-slate-300 mb-2">YouTube Video URL:</label>
          <input
            type="url"
            id="videoUrl"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 text-slate-100 rounded-md p-3 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          />
        </div>
      )}

      <button
        type="button"
        onClick={handleProcessRequest}
        disabled={isProcessButtonDisabled}
        className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-3 px-4 rounded-md transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {isTranscribing ? (
          <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Transcribing... (This may take a while)</>
        ) : ( 'Start Transcription' )}
      </button>

      {transcription && (
        <div className="mt-8 p-6 bg-slate-700/50 rounded-lg">
          <h3 className="text-xl font-semibold text-emerald-300 mb-4">{videoTitle || 'Transcription Result:'}</h3>
          <pre className="bg-slate-800 p-4 rounded-md text-slate-200 whitespace-pre-wrap text-sm leading-relaxed">
            {transcription}
          </pre>
        </div>
      )}
    </div>
  );
}