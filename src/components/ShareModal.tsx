import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  shareToken: string;
  isPublic: boolean;
  onShareToggle: () => void;
}

export const ShareModal = ({ 
  open, 
  onOpenChange, 
  sessionId, 
  shareToken, 
  isPublic,
  onShareToggle 
}: ShareModalProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const shareUrl = `${window.location.origin}/share/${shareToken}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "Share link has been copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  const handleTogglePublic = async () => {
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ is_public: !isPublic })
        .eq('id', sessionId);

      if (error) throw error;

      toast({
        title: isPublic ? "Sharing disabled" : "Sharing enabled",
        description: isPublic 
          ? "This video is now private" 
          : "Anyone with the link can now view this video",
      });

      onShareToggle();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update sharing settings",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Video
          </DialogTitle>
          <DialogDescription>
            {isPublic 
              ? "Anyone with this link can view the video" 
              : "Enable sharing to generate a public link"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Public sharing</Label>
            <Button
              variant={isPublic ? "default" : "outline"}
              onClick={handleTogglePublic}
            >
              {isPublic ? "Enabled" : "Disabled"}
            </Button>
          </div>

          {isPublic && (
            <div className="space-y-2">
              <Label htmlFor="share-link">Share Link</Label>
              <div className="flex gap-2">
                <Input
                  id="share-link"
                  value={shareUrl}
                  readOnly
                  className="flex-1"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleCopyLink}
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
