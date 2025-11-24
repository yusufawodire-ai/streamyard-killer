import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Maximize2, Monitor, Square, Smartphone, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { CropSettings } from "@/types/recording";

interface ScreenAreaSelectorProps {
  onContinue: (cropSettings: CropSettings) => void;
  onBack: () => void;
}

type PresetType = 'full' | '1080p' | '720p' | 'square' | 'vertical' | 'custom';

const PRESETS: Record<Exclude<PresetType, 'custom'>, { width: number; height: number; label: string; icon: any }> = {
  full: { width: 1920, height: 1080, label: "Full Screen", icon: Maximize2 },
  '1080p': { width: 1920, height: 1080, label: "1080p (16:9)", icon: Monitor },
  '720p': { width: 1280, height: 720, label: "720p (16:9)", icon: Monitor },
  square: { width: 1080, height: 1080, label: "Square (1:1)", icon: Square },
  vertical: { width: 1080, height: 1920, label: "Vertical (9:16)", icon: Smartphone },
};

const ScreenAreaSelector = ({ onContinue, onBack }: ScreenAreaSelectorProps) => {
  const [selectedPreset, setSelectedPreset] = useState<PresetType>('full');
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [selectionBox, setSelectionBox] = useState({ x: 100, y: 100, width: 800, height: 450 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize with selected preset
    updateSelectionFromPreset(selectedPreset);
  }, []);

  const updateSelectionFromPreset = (preset: PresetType) => {
    if (preset === 'custom') return; // Don't update for custom preset
    
    const presetData = PRESETS[preset as Exclude<PresetType, 'custom'>];
    const containerWidth = containerRef.current?.clientWidth || 1000;
    const containerHeight = containerRef.current?.clientHeight || 600;

    if (preset === 'full') {
      setSelectionBox({ x: 0, y: 0, width: containerWidth, height: containerHeight });
    } else {
      const scale = Math.min(
        (containerWidth * 0.8) / presetData.width,
        (containerHeight * 0.8) / presetData.height
      );
      const scaledWidth = presetData.width * scale;
      const scaledHeight = presetData.height * scale;
      setSelectionBox({
        x: (containerWidth - scaledWidth) / 2,
        y: (containerHeight - scaledHeight) / 2,
        width: scaledWidth,
        height: scaledHeight,
      });
    }
  };

  const handlePresetClick = (preset: PresetType) => {
    setSelectedPreset(preset);
    updateSelectionFromPreset(preset);
  };

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const startX = e.clientX - selectionBox.x;
    const startY = e.clientY - selectionBox.y;

    const handleMove = (moveEvent: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      let newX = moveEvent.clientX - rect.left - startX;
      let newY = moveEvent.clientY - rect.top - startY;

      // Constrain to container
      newX = Math.max(0, Math.min(newX, rect.width - selectionBox.width));
      newY = Math.max(0, Math.min(newY, rect.height - selectionBox.height));

      setSelectionBox(prev => ({ ...prev, x: newX, y: newY }));
      setSelectedPreset('custom');
    };

    const handleEnd = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
  };

  const handleResizeStart = (e: React.MouseEvent, corner: string) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const startBox = { ...selectionBox };

    const handleMove = (moveEvent: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      let newBox = { ...startBox };

      if (corner.includes('e')) {
        newBox.width = Math.max(200, Math.min(startBox.width + deltaX, rect.width - startBox.x));
      }
      if (corner.includes('s')) {
        newBox.height = Math.max(150, Math.min(startBox.height + deltaY, rect.height - startBox.y));
      }
      if (corner.includes('w')) {
        const newWidth = startBox.width - deltaX;
        if (newWidth >= 200 && startBox.x + deltaX >= 0) {
          newBox.x = startBox.x + deltaX;
          newBox.width = newWidth;
        }
      }
      if (corner.includes('n')) {
        const newHeight = startBox.height - deltaY;
        if (newHeight >= 150 && startBox.y + deltaY >= 0) {
          newBox.y = startBox.y + deltaY;
          newBox.height = newHeight;
        }
      }

      setSelectionBox(newBox);
      setSelectedPreset('custom');
    };

    const handleEnd = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
  };

  const handleContinue = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    
    // Convert to actual screen coordinates/percentages
    const cropSettings: CropSettings = {
      x: Math.round((selectionBox.x / rect.width) * 100),
      y: Math.round((selectionBox.y / rect.height) * 100),
      width: Math.round((selectionBox.width / rect.width) * 100),
      height: Math.round((selectionBox.height / rect.height) * 100),
      preset: selectedPreset,
    };

    onContinue(cropSettings);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto space-y-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Select Recording Area</h1>
            <p className="text-muted-foreground">Choose the screen area you want to record</p>
          </div>
          <Badge variant="outline" className="text-sm">
            Step 2 of 3
          </Badge>
        </div>

        {/* Preset Buttons */}
        <GlassCard className="p-6">
          <h3 className="text-sm font-semibold mb-4">Quick Presets</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {(Object.keys(PRESETS) as Exclude<PresetType, 'custom'>[]).map((preset) => {
              const { label, icon: Icon } = PRESETS[preset];
              return (
                <Button
                  key={preset}
                  variant={selectedPreset === preset ? "default" : "outline"}
                  onClick={() => handlePresetClick(preset)}
                  className="h-auto py-4 flex flex-col gap-2"
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs">{label}</span>
                </Button>
              );
            })}
          </div>
        </GlassCard>

        {/* Selection Area */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Recording Area Preview</h3>
            <div className="text-xs text-muted-foreground font-mono">
              {Math.round(selectionBox.width)} × {Math.round(selectionBox.height)}
            </div>
          </div>

          <div
            ref={containerRef}
            className="relative w-full h-[500px] bg-muted/20 rounded-lg overflow-hidden border border-border"
            style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, hsl(var(--muted)/0.1) 10px, hsl(var(--muted)/0.1) 20px)' }}
          >
            {/* Selection Box */}
            <div
              className={`absolute border-2 border-primary bg-primary/10 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              style={{
                left: `${selectionBox.x}px`,
                top: `${selectionBox.y}px`,
                width: `${selectionBox.width}px`,
                height: `${selectionBox.height}px`,
              }}
              onMouseDown={handleDragStart}
            >
              {/* Resize Handles */}
              {['nw', 'ne', 'sw', 'se'].map((corner) => (
                <div
                  key={corner}
                  className="absolute w-4 h-4 bg-primary border-2 border-background rounded-full cursor-move z-10"
                  style={{
                    ...(corner.includes('n') ? { top: -8 } : { bottom: -8 }),
                    ...(corner.includes('w') ? { left: -8 } : { right: -8 }),
                    cursor: `${corner}-resize`,
                  }}
                  onMouseDown={(e) => handleResizeStart(e, corner)}
                />
              ))}

              {/* Center indicator */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-background/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-primary/20">
                  <p className="text-xs font-mono text-foreground">
                    {Math.round(selectionBox.width)} × {Math.round(selectionBox.height)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            Drag the box to move it, or drag the corners to resize. Use presets above for common dimensions.
          </p>
        </GlassCard>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={handleContinue} size="lg">
            Continue to Settings
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default ScreenAreaSelector;
