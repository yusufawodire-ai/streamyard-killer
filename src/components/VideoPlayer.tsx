import { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { ExternalLink, AlertCircle } from "lucide-react";

interface VideoPlayerProps {
  videoUrl: string | null;
  title?: string;
}

export const VideoPlayer = ({ videoUrl, title }: VideoPlayerProps) => {
  const [error, setError] = useState(false);

  if (!videoUrl) {
    return (
      <GlassCard className="p-8 text-center">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No Video Available</h3>
        <p className="text-muted-foreground">
          The recording is still being processed or the video is not yet available.
        </p>
      </GlassCard>
    );
  }

  if (error) {
    return (
      <GlassCard className="p-8 text-center">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-warning" />
        <h3 className="text-lg font-semibold mb-2">Video Not Accessible</h3>
        <p className="text-muted-foreground">
          The video cannot be played. Please try refreshing the page.
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-0 overflow-hidden">
      <video
        controls
        controlsList="nodownload"
        className="w-full aspect-video bg-black"
        onError={() => setError(true)}
        title={title}
        preload="metadata"
      >
        <source src={videoUrl} type="video/mp4" />
        <source src={videoUrl} type="video/webm" />
        Your browser does not support the video tag.
      </video>
    </GlassCard>
  );
};
