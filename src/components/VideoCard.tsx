import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Share2, Eye, Trash2, Video } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

interface VideoCardProps {
  session: {
    id: string;
    title: string;
    brand_id: string;
    status: string;
    duration_seconds: number | null;
    created_at: string;
    thumbnail_url: string | null;
    final_video_url: string | null;
    raw_video_url: string | null;
  };
  onDelete: (id: string) => void;
  onShare: (id: string) => void;
}

const formatDuration = (seconds: number | null): string => {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
    case "recorded":
      return "default";
    case "processing":
      return "secondary";
    case "in-progress":
      return "outline";
    default:
      return "outline";
  }
};

export const VideoCard = ({ session, onDelete, onShare }: VideoCardProps) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Card className="overflow-hidden group cursor-pointer transition-all hover:shadow-lg hover:shadow-primary/10 border-border/50">
        {/* Thumbnail */}
        <div
          className="relative aspect-video bg-muted overflow-hidden"
          onClick={() => navigate(`/session/${session.id}`)}
        >
          {session.thumbnail_url ? (
            <img
              src={session.thumbnail_url}
              alt={session.title}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/20">
              <Video className="w-12 h-12 text-primary/40" />
            </div>
          )}

          {/* Duration Badge */}
          {session.duration_seconds && (
            <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDuration(session.duration_seconds)}
            </div>
          )}

          {/* Hover Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center gap-2"
          >
            <Button
              size="sm"
              variant="secondary"
              className="shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/session/${session.id}`);
              }}
            >
              <Eye className="w-4 h-4 mr-1" />
              View
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                onShare(session.id);
              }}
            >
              <Share2 className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(session.id);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>

        {/* Card Content */}
        <div className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm line-clamp-2 flex-1">
              {session.title}
            </h3>
            <Badge variant={getStatusColor(session.status)} className="text-xs shrink-0">
              {session.status}
            </Badge>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{session.brand_id}</span>
            <span>
              {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
