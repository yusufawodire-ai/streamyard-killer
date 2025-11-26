/**
 * Generate a thumbnail from a video blob
 * Captures the first frame at 0.5s and compresses to JPEG
 */
export const generateThumbnail = async (videoBlob: Blob): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    
    const videoUrl = URL.createObjectURL(videoBlob);
    video.src = videoUrl;
    
    video.addEventListener('loadedmetadata', async () => {
      // Seek to 0.5s for a better frame (skip potential black screen)
      video.currentTime = Math.min(0.5, video.duration / 2);
    });
    
    video.addEventListener('seeked', () => {
      try {
        // Create canvas with 16:9 aspect ratio
        const canvas = document.createElement('canvas');
        const targetWidth = 320;
        const targetHeight = 180;
        
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Calculate dimensions to maintain aspect ratio
        const videoAspect = video.videoWidth / video.videoHeight;
        const targetAspect = targetWidth / targetHeight;
        
        let drawWidth = targetWidth;
        let drawHeight = targetHeight;
        let offsetX = 0;
        let offsetY = 0;
        
        if (videoAspect > targetAspect) {
          // Video is wider, fit height
          drawHeight = targetHeight;
          drawWidth = drawHeight * videoAspect;
          offsetX = (targetWidth - drawWidth) / 2;
        } else {
          // Video is taller, fit width
          drawWidth = targetWidth;
          drawHeight = drawWidth / videoAspect;
          offsetY = (targetHeight - drawHeight) / 2;
        }
        
        // Fill with black background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        
        // Draw video frame centered
        ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
        
        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(videoUrl);
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create thumbnail blob'));
            }
          },
          'image/jpeg',
          0.8 // 80% quality for good balance
        );
      } catch (error) {
        URL.revokeObjectURL(videoUrl);
        reject(error);
      }
    });
    
    video.addEventListener('error', (e) => {
      URL.revokeObjectURL(videoUrl);
      reject(new Error(`Video load error: ${e}`));
    });
  });
};

/**
 * Upload thumbnail to Supabase storage
 */
export const uploadThumbnail = async (
  supabase: any,
  thumbnailBlob: Blob,
  sessionId: string,
  brandId: string
): Promise<string> => {
  const fileName = `${brandId}/${sessionId}.jpg`;
  
  const { data, error } = await supabase.storage
    .from('thumbnails')
    .upload(fileName, thumbnailBlob, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('thumbnails')
    .getPublicUrl(fileName);

  return publicUrl;
};
