import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { WebcamPosition } from "@/types/recording";
import { MoveUpLeft, MoveUpRight, MoveDownLeft, MoveDownRight } from "lucide-react";

interface WebcamPositionControlProps {
  currentPosition: WebcamPosition;
  onPositionChange: (position: WebcamPosition) => void;
}

const WebcamPositionControl = ({ currentPosition, onPositionChange }: WebcamPositionControlProps) => {
  const positions: { position: WebcamPosition; icon: any; label: string }[] = [
    { position: 'top-left', icon: MoveUpLeft, label: 'Top Left' },
    { position: 'top-right', icon: MoveUpRight, label: 'Top Right' },
    { position: 'bottom-left', icon: MoveDownLeft, label: 'Bottom Left' },
    { position: 'bottom-right', icon: MoveDownRight, label: 'Bottom Right' },
  ];

  return (
    <GlassCard className="p-4">
      <h3 className="text-sm font-semibold mb-3">Webcam Position</h3>
      <div className="grid grid-cols-2 gap-2">
        {positions.map(({ position, icon: Icon, label }) => (
          <Button
            key={position}
            size="sm"
            variant={currentPosition === position ? 'default' : 'outline'}
            onClick={() => onPositionChange(position)}
            className="w-full"
          >
            <Icon className="h-4 w-4 mr-2" />
            {label}
          </Button>
        ))}
      </div>
    </GlassCard>
  );
};

export default WebcamPositionControl;
