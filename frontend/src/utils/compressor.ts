// Audio-Preserving Video Compressor for Cloudinary 100MB Free Account Limit
export const compressVideoIfNeeded = async (
  file: File,
  onProgress?: (text: string) => void
): Promise<File> => {
  // Cloudinary free plan hard limit is 100MB (104857600 bytes).
  // If video is 90MB or smaller, upload original directly without compression!
  if (file.size <= 90 * 1024 * 1024) {
    return file;
  }

  if (onProgress) {
    onProgress(`Optimizing ${Math.round(file.size / (1024 * 1024))}MB video for Cloudinary 100MB limit...`);
  }

  try {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.crossOrigin = 'anonymous';
    video.playsInline = true;

    await new Promise((resolve, reject) => {
      video.onloadedmetadata = () => resolve(true);
      video.onerror = () => reject(new Error('Failed to load video file for optimization'));
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Scale resolution to 1080p max while preserving aspect ratio
    let width = video.videoWidth;
    let height = video.videoHeight;
    const maxDim = 1280;

    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    canvas.width = width % 2 === 0 ? width : width - 1;
    canvas.height = height % 2 === 0 ? height : height - 1;

    // Capture video stream from canvas
    const videoStream = canvas.captureStream(30);

    // WebAudio API to capture video's original audio track silently
    let audioStream: MediaStream | null = null;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        const source = audioCtx.createMediaElementSource(video);
        const dest = audioCtx.createMediaStreamDestination();
        source.connect(dest);
        audioStream = dest.stream;
      }
    } catch (e) {
      console.warn('WebAudio capture warning:', e);
    }

    // Combine video stream with original audio stream
    const combinedStream = new MediaStream();
    videoStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));
    if (audioStream && audioStream.getAudioTracks().length > 0) {
      audioStream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
    }

    // Determine supported mimeType for MediaRecorder
    let mimeType = 'video/mp4';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';

    const mediaRecorder = new MediaRecorder(
      combinedStream,
      MediaRecorder.isTypeSupported(mimeType)
        ? { mimeType, videoBitsPerSecond: 4000000 }
        : { videoBitsPerSecond: 4000000 }
    );

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    const completionPromise = new Promise<Blob>((resolve) => {
      mediaRecorder.onstop = () => {
        resolve(new Blob(chunks, { type: mimeType || 'video/mp4' }));
      };
    });

    mediaRecorder.start(100);
    video.currentTime = 0;
    await video.play();

    let animId: number;
    const renderLoop = () => {
      if (!video.paused && !video.ended) {
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        animId = requestAnimationFrame(renderLoop);
      }
    };
    renderLoop();

    await new Promise((resolve) => {
      video.onended = () => {
        cancelAnimationFrame(animId);
        resolve(true);
      };
    });

    mediaRecorder.stop();
    const compressedBlob = await completionPromise;

    URL.revokeObjectURL(video.src);

    if (compressedBlob.size > 0 && compressedBlob.size < file.size) {
      console.log(`Optimized ${file.name} from ${(file.size / (1024 * 1024)).toFixed(1)}MB to ${(compressedBlob.size / (1024 * 1024)).toFixed(1)}MB with audio!`);
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      return new File([compressedBlob], file.name.replace(/\.[^/.]+$/, `.${ext}`), { type: compressedBlob.type || 'video/mp4' });
    }

    return file;
  } catch (err) {
    console.warn('Video optimization fallback to original file:', err);
    return file;
  }
};
