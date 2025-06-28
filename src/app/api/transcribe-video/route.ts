// app/api/transcribe-video/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fsPromises from 'fs/promises';
import path from 'path';
import os from 'os';
import ffmpeg from 'fluent-ffmpeg';
import { GoogleGenerativeAI } from '@google/generative-ai';
import play from 'play-dl';

// --- SETUP FOR PLAY-DL ---
// This is the critical fix. It authenticates our requests to YouTube.
if (process.env.YOUTUBE_COOKIE) {
  play.setToken({
    youtube: {
      cookie: process.env.YOUTUBE_COOKIE,
    },
  });
  console.log("play-dl configured with YouTube cookie.");
} else {
  console.warn("YOUTUBE_COOKIE is not set. YouTube URL processing may fail.");
}

// --- Google AI Client Initialization ---
if (!process.env.GEMINI_API_KEY) {
  console.error("FATAL ERROR: GEMINI_API_KEY is not set.");
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// This function is correct and does not need changes.
async function extractAudioFromFile(videoPath: string, outputDir: string): Promise<string> {
  const uniqueSuffix = Date.now() + "_" + Math.random().toString(36).substring(2, 8);
  const audioFileName = `${path.parse(videoPath).name}_${uniqueSuffix}_audio.mp3`;
  const audioOutputPath = path.join(outputDir, audioFileName);

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .noVideo()
      .audioCodec('libmp3lame')
      .audioBitrate('128k')
      .on('error', (err) => reject(new Error('FFmpeg failed to extract audio: ' + err.message)))
      .on('end', () => resolve(audioOutputPath))
      .save(audioOutputPath);
  });
}

// This function had the error, which is now corrected.
async function transcribeWithGemini(audioPath: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const audioBuffer = await fsPromises.readFile(audioPath);
    const audioBase64 = audioBuffer.toString('base64');
    const audioPart = { inlineData: { mimeType: 'audio/mp3', data: audioBase64 } };
    const textPart = { text: "Transcribe the audio accurately. Provide only the text of the transcription." };

    const result = await model.generateContent([textPart, audioPart]);
    const transcriptionText = result.response.text();
    if (!transcriptionText) { throw new Error("Could not extract text from Gemini API response."); }
    return transcriptionText;
  } catch (error: unknown) { // Changed 'any' to 'unknown'
    // Safely determine the error message before re-throwing
    let errorMessage = 'An unknown error occurred during transcription.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    throw new Error(`Gemini API transcription failed: ${errorMessage}`);
  }
}

// This function is correct and does not need changes.
async function downloadYouTubeAudio(videoUrl: string, outputDir: string): Promise<{ audioFilePath: string; videoTitle: string }> {
  const videoInfo = await play.video_info(videoUrl);
  const videoTitle = videoInfo.video_details.title || 'YouTube_Video';
  const stream = await play.stream(videoUrl, { quality: 2 });
  const audioFileName = `youtube_${Date.now()}_audio.mp3`;
  const audioOutputPath = path.join(outputDir, audioFileName);

  return new Promise((resolve, reject) => {
    ffmpeg(stream.stream)
      .audioBitrate(128)
      .toFormat('mp3')
      .on('error', (err) => reject(new Error(`FFmpeg failed during URL processing: ${err.message}`)))
      .on('end', () => resolve({ audioFilePath: audioOutputPath, videoTitle }))
      .save(audioOutputPath);
  });
}

// The main POST function logic is correct and does not need changes.
export async function POST(req: NextRequest) {
  const tempSessionDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'transcribe-session-'));
  try {
    const formData = await req.formData();
    const operationType = formData.get('operationType') as string | null;

    let audioToTranscribePath: string | null = null;
    let videoTitleFromUrl: string | undefined = undefined;

    if (operationType === 'file') {
      const videoFile = formData.get('video') as File | null;
      if (!videoFile) return NextResponse.json({ error: 'No video file provided.' }, { status: 400 });
      const tempUploadedVideoPath = path.join(tempSessionDir, videoFile.name);
      await fsPromises.writeFile(tempUploadedVideoPath, Buffer.from(await videoFile.arrayBuffer()));
      audioToTranscribePath = await extractAudioFromFile(tempUploadedVideoPath, tempSessionDir);
    } else if (operationType === 'url') {
      const videoUrl = formData.get('videoUrl') as string | null;
      if (!videoUrl) return NextResponse.json({ error: 'No video URL provided.' }, { status: 400 });
      const downloadResult = await downloadYouTubeAudio(videoUrl, tempSessionDir);
      audioToTranscribePath = downloadResult.audioFilePath;
      videoTitleFromUrl = downloadResult.videoTitle;
    } else {
      return NextResponse.json({ error: 'Invalid operation type.' }, { status: 400 });
    }
    
    if (!audioToTranscribePath) { throw new Error("No audio data could be prepared for transcription."); }
    const transcriptionText = await transcribeWithGemini(audioToTranscribePath);
    return NextResponse.json({ transcription: transcriptionText, videoTitle: videoTitleFromUrl });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error('API Route Error:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  } finally {
    if (tempSessionDir) {
      await fsPromises.rm(tempSessionDir, { recursive: true, force: true }).catch(err => console.error("Cleanup failed:", err));
    }
  }
}