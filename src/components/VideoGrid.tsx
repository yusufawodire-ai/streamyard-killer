import { VideoCard } from "./VideoCard";

interface Session {
  id: string;
  title: string;
  brand_id: string;
  status: string;
  duration_seconds: number | null;
  created_at: string;
  thumbnail_url: string | null;
  final_video_url: string | null;
  raw_video_url: string | null;
}

interface VideoGridProps {
  sessions: Session[];
  onDelete: (id: string) => void;
  onShare: (id: string) => void;
}

export const VideoGrid = ({ sessions, onDelete, onShare }: VideoGridProps) => {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground text-lg">No recordings found</p>
        <p className="text-muted-foreground text-sm mt-2">
          Start recording to see your videos here
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
      {sessions.map((session) => (
        <VideoCard
          key={session.id}
          session={session}
          onDelete={onDelete}
          onShare={onShare}
        />
      ))}
    </div>
  );
};
