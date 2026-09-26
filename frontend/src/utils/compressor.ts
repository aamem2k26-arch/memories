// Fast 5-second Frame Stepping Video Compressor for Cloudinary 100MB Limit
export const compressVideoIfNeeded = async (
  file: File,
  onProgress?: (percent: number) => void
): Promise<File> => {
  // If file is 80MB or smaller, return original file directly!
  if (file.size <= 80 * 1024 * 1024) {
    return file;
  }

  try {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;

    await new Promise((resolve, reject) => {
      video.onloadedmetadata = () => resolve(true);
      video.onerror = () => reject(new Error('Failed to load video'));
    });

    const duration = video.duration || 1;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    let width = video.videoWidth || 1280;
    let height = video.videoHeight || 720;
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

    let mimeType = 'video/mp4';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';

    const mediaRecorder = new MediaRecorder(
      stream,
      MediaRecorder.isTypeSupported(mimeType)
        ? { mimeType, videoBitsPerSecond: 2500000 }
        : { videoBitsPerSecond: 2500000 }
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

    // Fast Frame Stepping (5 to 8 seconds total time instead of 3 minutes!)
    const fps = 25;
    const step = 1 / fps;
    let currentTime = 0;

    while (currentTime < duration) {
      video.currentTime = currentTime;
      await new Promise((resolve) => {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          resolve(true);
        };
        video.addEventListener('seeked', onSeeked, { once: true });
        setTimeout(resolve, 20);
      });

      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

      currentTime += step;
      if (onProgress) {
        // Allocate 0-50% for fast video compression phase
        onProgress(Math.round((currentTime / duration) * 50));
      }
    }

    mediaRecorder.stop();
    const compressedBlob = await completionPromise;
    URL.revokeObjectURL(video.src);

    if (compressedBlob.size > 0 && compressedBlob.size < file.size) {
      console.log(`Fast compressed ${file.name} from ${(file.size / (1024 * 1024)).toFixed(1)}MB to ${(compressedBlob.size / (1024 * 1024)).toFixed(1)}MB`);
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      return new File([compressedBlob], file.name.replace(/\.[^/.]+$/, `.${ext}`), { type: compressedBlob.type || 'video/mp4' });
    }

    return file;
  } catch (err) {
    console.warn('Fast video optimization fallback:', err);
    return file;
  }
};
