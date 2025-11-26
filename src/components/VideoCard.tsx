import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Video, Star, Edit, Link, FolderInput, CheckSquare, ExternalLink, Trash2, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface Folder {
  id: string;
  name: string;
  color: string | null;
}

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
    is_starred?: boolean;
    folder_id?: string | null;
  };
  onDelete: (id: string) => void;
  onShare: (id: string) => void;
  onToggleStar?: (id: string) => void;
  onRename: (id: string, currentTitle: string) => void;
  onMove: (id: string, folderId: string | null) => void;
  onRestore?: (id: string) => void;
  onOpenInNewTab: (id: string) => void;
  folders: Folder[];
  isInTrash?: boolean;
  showStarButton?: boolean;
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

export const VideoCard = ({
  session,
  onDelete,
  onShare,
  onToggleStar,
  onRename,
  onMove,
  onRestore,
  onOpenInNewTab,
  folders,
  isInTrash = false,
  showStarButton = true,
}: VideoCardProps) => {
  const navigate = useNavigate();

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
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

              {/* Star Badge */}
              {session.is_starred && (
                <div className="absolute top-2 right-2">
                  <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                </div>
              )}
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
      </ContextMenuTrigger>

      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={() => onRename(session.id, session.title)}>
          <Edit className="w-4 h-4 mr-2" />
          Rename
        </ContextMenuItem>
        
        <ContextMenuItem onClick={() => onShare(session.id)}>
          <Link className="w-4 h-4 mr-2" />
          Copy shareable link
        </ContextMenuItem>

        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <FolderInput className="w-4 h-4 mr-2" />
            Move
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onClick={() => onMove(session.id, null)}>
              All Items
            </ContextMenuItem>
            <ContextMenuSeparator />
            {folders.map((folder) => (
              <ContextMenuItem 
                key={folder.id} 
                onClick={() => onMove(session.id, folder.id)}
              >
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: folder.color || '#3b82f6' }}
                />
                {folder.name}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuItem onClick={() => {}}>
          <CheckSquare className="w-4 h-4 mr-2" />
          Select multiple items
        </ContextMenuItem>

        <ContextMenuItem onClick={() => onOpenInNewTab(session.id)}>
          <ExternalLink className="w-4 h-4 mr-2" />
          Open in new tab
        </ContextMenuItem>

        <ContextMenuSeparator />

        {isInTrash ? (
          <>
            {onRestore && (
              <ContextMenuItem onClick={() => onRestore(session.id)}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Restore
              </ContextMenuItem>
            )}
            <ContextMenuItem 
              onClick={() => onDelete(session.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete permanently
            </ContextMenuItem>
          </>
        ) : (
          <ContextMenuItem 
            onClick={() => onDelete(session.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Remove
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};
