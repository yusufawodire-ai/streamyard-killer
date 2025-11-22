import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Video, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Daily from "@daily-co/daily-js";

interface NewRecordingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NewRecordingModal = ({ open, onOpenChange }: NewRecordingModalProps) => {
  const [brandId, setBrandId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [callFrame, setCallFrame] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (roomUrl && !callFrame) {
      const frame = Daily.createFrame(document.getElementById('daily-frame')!, {
        showLeaveButton: true,
        showFullscreenButton: true,
      });
      
      frame.join({ url: roomUrl });
      setCallFrame(frame);

      frame.on('left-meeting', handleLeaveCall);
    }

    return () => {
      if (callFrame) {
        callFrame.destroy();
      }
    };
  }, [roomUrl]);

  const handleCreateSession = async () => {
    // Validate inputs
    if (!brandId || !title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please select a brand and enter a title",
        variant: "destructive",
      });
      return;
    }

    if (title.length > 200) {
      toast({
        title: "Validation Error",
        description: "Title must be less than 200 characters",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      // Call edge function to create session and Daily.co room
      const { data, error } = await supabase.functions.invoke('create-recording-session', {
        body: {
          brand_id: brandId,
          title: title.trim(),
          description: description.trim() || null,
        },
      });

      if (error) throw error;

      setRoomUrl(data.room_url);
      setSessionId(data.session_id);

      toast({
        title: "Room Created",
        description: "Your recording room is ready. Join to start recording!",
      });
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create recording session",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (callFrame) {
      callFrame.destroy();
      setCallFrame(null);
    }
    setRoomUrl(null);
    setSessionId(null);
    setBrandId("");
    setTitle("");
    setDescription("");
    onOpenChange(false);
  };

  const handleLeaveCall = () => {
    toast({
      title: "Recording Session Ended",
      description: "Your recording is being processed. Check the dashboard for updates.",
    });
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-modal">
        {!roomUrl ? (
          <>
            <DialogHeader>
              <DialogTitle>Create New Recording Session</DialogTitle>
              <DialogDescription>
                Set up a new recording session. Once created, you'll join a Daily.co room to start recording.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="brand">Brand *</Label>
                <Select value={brandId} onValueChange={setBrandId}>
                  <SelectTrigger id="brand">
                    <SelectValue placeholder="Select a brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ssv">SSV</SelectItem>
                    <SelectItem value="pco">PCO</SelectItem>
                    <SelectItem value="meo">MEO</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter recording title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                />
                <p className="text-sm text-muted-foreground">
                  {title.length}/200 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter recording description (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose} disabled={isCreating}>
                Cancel
              </Button>
              <Button onClick={handleCreateSession} disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Video className="mr-2 h-4 w-4" />
                    Create Room
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>Recording Room - {title}</DialogTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLeaveCall}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <DialogDescription>
                Session ID: {sessionId}
              </DialogDescription>
            </DialogHeader>

            <div 
              id="daily-frame" 
              className="aspect-video bg-black rounded-lg overflow-hidden glass-video-frame"
              style={{ width: '100%', height: '500px' }}
            />

            <div className="flex justify-end">
              <Button variant="destructive" onClick={handleLeaveCall}>
                End Recording
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
