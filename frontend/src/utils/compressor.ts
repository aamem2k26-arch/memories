// Helper to compress large video files in browser before uploading to Cloudinary
export const compressVideoIfNeeded = async (
  file: File,
  onProgress?: (text: string) => void
): Promise<File> => {
  // If file is 60MB or smaller, upload directly without compression!
  if (file.size <= 60 * 1024 * 1024) {
    return file;
  }

  if (onProgress) {
    onProgress(`Optimizing ${Math.round(file.size / (1024 * 1024))}MB video for fast upload...`);
  }

  try {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;

    await new Promise((resolve, reject) => {
      video.onloadedmetadata = () => resolve(true);
      video.onerror = () => reject(new Error('Failed to load video for compression'));
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

    const stream = canvas.captureStream(30);

    let mimeType = 'video/webm;codecs=vp8';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = '';

    const mediaRecorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType, videoBitsPerSecond: 3000000 } : { videoBitsPerSecond: 3000000 }
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

    const renderLoop = () => {
      if (!video.paused && !video.ended) {
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        requestAnimationFrame(renderLoop);
      }
    };
    renderLoop();

    await new Promise((resolve) => {
      video.onended = () => resolve(true);
    });

    mediaRecorder.stop();
    const compressedBlob = await completionPromise;

    URL.revokeObjectURL(video.src);

    if (compressedBlob.size > 0 && compressedBlob.size < file.size) {
      console.log(`Compressed video from ${(file.size / (1024 * 1024)).toFixed(1)}MB to ${(compressedBlob.size / (1024 * 1024)).toFixed(1)}MB`);
      return new File([compressedBlob], file.name, { type: compressedBlob.type || 'video/mp4' });
    }

    return file;
  } catch (err) {
    console.warn('Video compression fallback to original file:', err);
    return file;
  }
};
