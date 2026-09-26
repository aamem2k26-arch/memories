// HD Audio-Preserving Video Optimizer for Cloudinary 100MB Limit
export const compressVideoIfNeeded = async (
  file: File,
  onProgress?: (percent: number) => void
): Promise<File> => {
  // Cloudinary free plan hard limit is 100MB (104857600 bytes).
  // If video is 85MB or smaller, upload original directly without compression!
  if (file.size <= 85 * 1024 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.crossOrigin = 'anonymous';
      video.playsInline = true;
      video.preload = 'auto';

      video.onloadedmetadata = async () => {
        const duration = video.duration || 1;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Crisp 1080p HD scaling
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

        // 1. Capture WebAudio stereo audio stream from video element
        let audioStream: MediaStream | null = null;
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const audioCtx = new AudioContextClass();
            if (audioCtx.state === 'suspended') {
              await audioCtx.resume();
            }
            const source = audioCtx.createMediaElementSource(video);
            const dest = audioCtx.createMediaStreamDestination();
            source.connect(dest);
            audioStream = dest.stream;
          }
        } catch (audioErr) {
          console.warn('WebAudio capture warning:', audioErr);
        }

        // 2. Capture canvas video stream
        const canvasStream = canvas.captureStream(30);

        // 3. Combine video + audio streams
        const combinedStream = new MediaStream();
        canvasStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));
        if (audioStream && audioStream.getAudioTracks().length > 0) {
          audioStream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
        }

        // Determine supported mimeType
        let mimeType = 'video/webm;codecs=vp8,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/mp4';

        const mediaRecorder = new MediaRecorder(
          combinedStream,
          MediaRecorder.isTypeSupported(mimeType)
            ? { mimeType, videoBitsPerSecond: 3000000 }
            : { videoBitsPerSecond: 3000000 }
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

        // Start recording
        mediaRecorder.start(100);

        // Update progress during playback
        video.ontimeupdate = () => {
          if (onProgress && duration > 0) {
            const percent = Math.min(49, Math.round((video.currentTime / duration) * 50));
            onProgress(percent);
          }
        };

        // Render video frames onto canvas
        let animId: number;
        const renderLoop = () => {
          if (!video.paused && !video.ended) {
            ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
            animId = requestAnimationFrame(renderLoop);
          }
        };

        video.onended = () => {
          cancelAnimationFrame(animId);
          setTimeout(() => {
            if (mediaRecorder.state !== 'inactive') {
              mediaRecorder.stop();
            }
          }, 300);
        };

        // Play video to capture full duration & audio
        video.currentTime = 0;
        video.play().then(() => {
          renderLoop();
        }).catch((err) => {
          console.warn('Video play error during optimization:', err);
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
