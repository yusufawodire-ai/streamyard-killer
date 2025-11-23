import { motion } from "framer-motion";
import { Circle, Square } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CustomRecordingControlsProps {
  isRecording: boolean;
  duration: number;
  sessionTitle: string;
}

export const CustomRecordingControls = ({ 
  isRecording, 
  duration, 
  sessionTitle 
}: CustomRecordingControlsProps) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isRecording) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between"
    >
      <Badge 
        variant="destructive" 
        className="bg-destructive/90 backdrop-blur-sm px-4 py-2 text-base font-semibold animate-pulse"
      >
        <Circle className="mr-2 h-4 w-4 fill-current" />
        REC {formatDuration(duration)}
      </Badge>
      
      <div className="bg-background/90 backdrop-blur-sm rounded-lg px-4 py-2 border border-border">
        <p className="text-sm font-medium">{sessionTitle}</p>
      </div>
    </motion.div>
  );
};