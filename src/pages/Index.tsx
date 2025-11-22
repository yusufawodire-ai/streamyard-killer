import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Play, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import BrandSelector from "@/components/BrandSelector";
import RecordingSession from "@/components/RecordingSession";
import WorkflowVisualization from "@/components/WorkflowVisualization";
import { NewRecordingModal } from "@/components/NewRecordingModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GlassCard } from "@/components/ui/glass-card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

const Index = () => {
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ['session-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('status');
      
      if (error) throw error;

      const total = data.length;
      const inProgress = data.filter(s => 
        ['recording', 'transcribing', 'processing'].includes(s.status)
      ).length;
      const completed = data.filter(s => 
        ['completed', 'processed'].includes(s.status)
      ).length;
      const issues = data.filter(s => s.status === 'error').length;

      return { total, inProgress, completed, issues };
    },
  });

  // Set up realtime subscription for sessions table
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions'
        },
        (payload) => {
          console.log('Realtime update received:', payload);
          // Invalidate both queries to trigger refetch
          queryClient.invalidateQueries({ queryKey: ['session-stats'] });
          queryClient.invalidateQueries({ queryKey: ['sessions'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return (
    <div className="min-h-screen bg-gradient-mesh">
      {/* Glass Header - Sticky */}
      <header className="sticky top-0 z-50 glass-header border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
                className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow"
              >
                <Video className="h-6 w-6 text-primary-foreground" />
              </motion.div>
              <div>
                <h1 className="text-xl font-bold text-foreground">StreamYard Killer</h1>
                <p className="text-xs text-muted-foreground">AI-Powered Content Creation</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Button 
                className="glass-button-primary shadow-glow"
                onClick={() => setIsModalOpen(true)}
              >
                <Play className="mr-2 h-4 w-4" />
                New Recording
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Brand Selection - Compact */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <BrandSelector selectedBrand={selectedBrand} onSelectBrand={setSelectedBrand} />
        </motion.section>

        {/* Stats Overview - Glass Cards */}
        <section className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Total Sessions", value: stats?.total ?? 0, icon: Video, color: "primary" },
            { label: "In Progress", value: stats?.inProgress ?? 0, icon: Clock, color: "warning", pulse: true },
            { label: "Completed", value: stats?.completed ?? 0, icon: CheckCircle2, color: "success" },
            { label: "Issues", value: stats?.issues ?? 0, icon: AlertCircle, color: "destructive" },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <GlassCard variant="interactive" className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <motion.p
                      key={stat.value}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-3xl font-bold text-foreground mt-1"
                    >
                      {stat.value}
                    </motion.p>
                  </div>
                  <div className={`h-12 w-12 rounded-full bg-${stat.color}/10 flex items-center justify-center ${stat.pulse ? 'animate-pulse' : ''}`}>
                    <stat.icon className={`h-6 w-6 text-${stat.color}`} />
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </section>

        {/* Workflow Visualization */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <h2 className="text-2xl font-bold mb-4 text-foreground">Automation Workflow</h2>
          <WorkflowVisualization />
        </motion.section>

        {/* Recent Sessions */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-foreground">Recent Sessions</h2>
            <Badge variant="secondary" className="glass-badge">
              {selectedBrand ? `Filtered: ${selectedBrand}` : "All Brands"}
            </Badge>
          </div>
          <RecordingSession selectedBrand={selectedBrand} />
        </motion.section>
      </main>

      <NewRecordingModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  );
};

export default Index;
