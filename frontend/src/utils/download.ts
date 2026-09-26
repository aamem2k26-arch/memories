export const downloadFile = async (file: any) => {
  if (!file || !file.data) return;

  const urlOrData: string = file.data;

  // Helper to guess file extension from MIME or URL or item type
  const getExtension = (urlStr: string, mime: string, itemType?: string): string => {
    if (mime) {
      if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
      if (mime.includes('png')) return 'png';
      if (mime.includes('gif')) return 'gif';
      if (mime.includes('webp')) return 'webp';
      if (mime.includes('mp4')) return 'mp4';
      if (mime.includes('quicktime') || mime.includes('mov')) return 'mov';
      if (mime.includes('webm')) return 'webm';
      if (mime.includes('mp3') || mime.includes('mpeg')) return 'mp3';
      if (mime.includes('wav')) return 'wav';
      if (mime.includes('ogg')) return 'ogg';
      if (mime.includes('m4a')) return 'm4a';
    }

    // Try extracting extension from URL path (e.g. image.jpg?v=123)
    try {
      const cleanUrl = urlStr.split('?')[0].split('#')[0];
      const extMatch = cleanUrl.match(/\.([a-zA-Z0-9]+)$/i);
      if (extMatch && extMatch[1] && extMatch[1].length <= 5) {
        return extMatch[1].toLowerCase();
      }
    } catch {
      // Ignore URL parsing errors
    }

    // Fallback based on item type
    if (itemType === 'video') return 'mp4';
    if (itemType === 'audio') return 'mp3';
    if (itemType === 'image') return 'jpg';

    return 'bin';
  };

  const baseFileName = `memory-${file.id || Date.now()}`;

  // Case 1: Base64 Data URL (e.g. data:image/png;base64,...)
  if (urlOrData.startsWith('data:')) {
    try {
      const parts = urlOrData.split(',');
      if (parts.length < 2) throw new Error('Invalid base64 string');

      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : '';
      const b64Data = parts[1];

      const byteCharacters = atob(b64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mime });

      const ext = getExtension(urlOrData, mime, file.type);
      const fileName = `${baseFileName}.${ext}`;

      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      return;
    } catch (err) {
      console.error('Base64 download error:', err);
    }
  }

  // Case 2: Remote HTTP/HTTPS URL (Cloudinary, Vercel, S3, external servers)
  try {
    const response = await fetch(urlOrData, { mode: 'cors' });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const blob = await response.blob();
    const mime = blob.type || '';
    const ext = getExtension(urlOrData, mime, file.type);
    const fileName = `${baseFileName}.${ext}`;

    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    return;
  } catch (err) {
    console.warn('Fetch blob download failed or CORS restriction encountered, attempting Cloudinary / direct fallback:', err);
  }

  // Case 3: Cloudinary URL attachment transformation fallback
  // If it's a Cloudinary URL, insert fl_attachment before filename to force download
  if (urlOrData.includes('cloudinary.com')) {
    try {
      const attachmentUrl = urlOrData.replace(/\/upload\/(?:v\d+\/)?/, (match) => `${match}fl_attachment/`);
      const link = document.createElement('a');
      link.href = attachmentUrl;
      link.target = '_blank';
      link.download = `${baseFileName}.${getExtension(urlOrData, '', file.type)}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    } catch (e) {
      console.warn('Cloudinary attachment fallback failed:', e);
    }
  }

  // Case 4: Final direct fallback (opens URL in new tab / triggers browser download)
  try {
    const ext = getExtension(urlOrData, '', file.type);
    const link = document.createElement('a');
    link.href = urlOrData;
    link.download = `${baseFileName}.${ext}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('All download methods failed:', err);
    window.open(urlOrData, '_blank');
  }
};