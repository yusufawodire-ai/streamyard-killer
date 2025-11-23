import RecordingSession from "@/components/RecordingSession";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Webhook } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const Sessions = () => {
  const { toast } = useToast();
  const [isSettingUpWebhook, setIsSettingUpWebhook] = useState(false);

  const handleSetupWebhook = async () => {
    setIsSettingUpWebhook(true);
    try {
      const { data, error } = await supabase.functions.invoke('setup-daily-webhook');
      
      if (error) throw error;
      
      if (data.success) {
        toast({
          title: "Webhook Setup Complete",
          description: "Daily.co webhooks are now configured. Your recordings will sync automatically.",
        });
      } else {
        throw new Error(data.error || "Failed to setup webhook");
      }
    } catch (error) {
      console.error("Error setting up webhook:", error);
      toast({
        title: "Webhook Setup Failed",
        description: error instanceof Error ? error.message : "Failed to configure webhooks",
        variant: "destructive",
      });
    } finally {
      setIsSettingUpWebhook(false);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto space-y-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">All Sessions</h1>
            <p className="text-muted-foreground mt-1">
              View and manage all your recording sessions
            </p>
          </div>
          <Button
            onClick={handleSetupWebhook}
            disabled={isSettingUpWebhook}
            variant="outline"
            className="gap-2"
          >
            <Webhook className="h-4 w-4" />
            {isSettingUpWebhook ? "Setting up..." : "Setup Daily.co Webhook"}
          </Button>
        </div>

        <RecordingSession selectedBrand={null} />
      </motion.div>
    </div>
  );
};

export default Sessions;
