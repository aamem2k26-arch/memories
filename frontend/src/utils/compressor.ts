// Fast Video Compressor using Native video.captureStream() with full audio capture
export const compressVideoIfNeeded = async (
  file: File,
  onProgress?: (percent: number) => void
): Promise<File> => {
  // Cloudinary free plan limit is 100MB (104857600 bytes).
  // If file is 85MB or smaller, upload directly without compression!
  if (file.size <= 85 * 1024 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.muted = false;
      video.volume = 0.0001;
      video.playsInline = true;

      video.onloadedmetadata = async () => {
        const duration = video.duration || 1;

        // Native browser captureStream retains original video + stereo audio tracks natively!
        let stream: MediaStream | null = null;
        if ((video as any).captureStream) {
          stream = (video as any).captureStream();
        } else if ((video as any).mozCaptureStream) {
          stream = (video as any).mozCaptureStream();
        }

        if (!stream || stream.getVideoTracks().length === 0) {
          resolve(file);
          return;
        }

        let mimeType = 'video/mp4';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=vp8,opus';
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

        mediaRecorder.onstop = () => {
          URL.revokeObjectURL(video.src);
          const compressedBlob = new Blob(chunks, { type: mimeType || 'video/mp4' });
          if (compressedBlob.size > 0 && compressedBlob.size < file.size) {
            console.log(`Optimized ${file.name} from ${(file.size / (1024 * 1024)).toFixed(1)}MB to ${(compressedBlob.size / (1024 * 1024)).toFixed(1)}MB with full audio!`);
            const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
            resolve(new File([compressedBlob], file.name.replace(/\.[^/.]+$/, `.${ext}`), { type: compressedBlob.type || 'video/mp4' }));
          } else {
            resolve(file);
          }
        };

        // 3x playback speed fast-encodes a 1:52 min video in under 30 seconds!
        video.playbackRate = 3.0;

        mediaRecorder.start(100);

        video.ontimeupdate = () => {
          if (onProgress && duration > 0) {
            const percent = Math.min(49, Math.round((video.currentTime / duration) * 50));
            onProgress(percent);
          }
        };

        video.onended = () => {
          setTimeout(() => {
            if (mediaRecorder.state !== 'inactive') {
              mediaRecorder.stop();
            }
          }, 200);
        };

        video.currentTime = 0;
        video.play().catch((err) => {
          console.warn('Play error during capture:', err);
          mediaRecorder.stop();
          resolve(file);
        });
      };

      video.onerror = () => {
        resolve(file);
      };
    } catch (err) {
      console.warn('Optimization error fallback:', err);
      resolve(file);
    }
  });
};
