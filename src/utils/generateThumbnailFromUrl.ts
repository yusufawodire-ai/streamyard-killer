import { supabase } from "@/integrations/supabase/client";

/**
 * Generate thumbnail from a video URL (for existing videos)
 */
export const generateThumbnailFromUrl = async (
  videoUrl: string
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.preload = "metadata";
    video.muted = true;

    video.src = videoUrl;

    video.addEventListener("loadedmetadata", () => {
      // Seek to 0.5s or 10% of video duration for better frame
      const seekTime = Math.min(0.5, video.duration * 0.1);
      video.currentTime = seekTime;
    });

    video.addEventListener("seeked", () => {
      try {
        const canvas = document.createElement("canvas");
        const targetWidth = 320;
        const targetHeight = 180;

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
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
          drawHeight = targetHeight;
          drawWidth = drawHeight * videoAspect;
          offsetX = (targetWidth - drawWidth) / 2;
        } else {
          drawWidth = targetWidth;
          drawHeight = drawWidth / videoAspect;
          offsetY = (targetHeight - drawHeight) / 2;
        }

        // Fill with black background
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        // Draw video frame
        ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to create thumbnail blob"));
            }
          },
          "image/jpeg",
          0.8
        );
      } catch (error) {
        reject(error);
      }
    });

    video.addEventListener("error", (e) => {
      reject(new Error(`Video load error: ${video.error?.message || e}`));
    });
  });
};

/**
 * Generate and upload thumbnail for a session with existing video
 */
export const generateThumbnailForSession = async (
  sessionId: string,
  videoUrl: string,
  brandId: string
): Promise<string | null> => {
  try {
    console.log(`Generating thumbnail for session ${sessionId}...`);
    
    // Generate thumbnail from video URL
    const thumbnailBlob = await generateThumbnailFromUrl(videoUrl);
    
    // Upload to storage
    const fileName = `${brandId}/${sessionId}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("thumbnails")
      .upload(fileName, thumbnailBlob, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("thumbnails").getPublicUrl(fileName);

    // Update session with thumbnail URL
    const { error: updateError } = await supabase
      .from("sessions")
      .update({ thumbnail_url: publicUrl })
      .eq("id", sessionId);

    if (updateError) throw updateError;

    console.log(`✅ Thumbnail generated for ${sessionId}:`, publicUrl);
    return publicUrl;
  } catch (error) {
    console.error(`Failed to generate thumbnail for ${sessionId}:`, error);
    return null;
  }
};
