import { useState, useEffect } from "react";
import { Video, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import BrandSelector from "@/components/BrandSelector";
import RecordingSession from "@/components/RecordingSession";
import { GlassCard } from "@/components/ui/glass-card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

const Index = () => {
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
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
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor your content automation workflow
          </p>
        </div>

        {/* Brand Selector */}
        <BrandSelector selectedBrand={selectedBrand} onSelectBrand={setSelectedBrand} />

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <GlassCard variant="interactive" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
                <p className="text-3xl font-bold mt-2">{stats?.total ?? 0}</p>
              </div>
              <Video className="h-8 w-8 text-primary" />
            </div>
          </GlassCard>

          <GlassCard variant="interactive" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-3xl font-bold mt-2">{stats?.inProgress ?? 0}</p>
              </div>
              <Clock className="h-8 w-8 text-warning animate-pulse" />
            </div>
          </GlassCard>

          <GlassCard variant="interactive" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-3xl font-bold mt-2">{stats?.completed ?? 0}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
          </GlassCard>

          <GlassCard variant="interactive" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Issues</p>
                <p className="text-3xl font-bold mt-2">{stats?.issues ?? 0}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </GlassCard>
        </div>

        {/* Recent Sessions */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Recent Sessions</h2>
          <RecordingSession selectedBrand={selectedBrand} />
        </div>
      </div>
    </div>
  );
};

export default Index;
