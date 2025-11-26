import { useState } from "react";
import { VideoGrid } from "@/components/VideoGrid";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, SortAsc } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const Sessions = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");

  const { data: sessions, isLoading, refetch } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Filter and sort sessions
  const filteredSessions = sessions
    ?.filter((session) =>
      session.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "date-asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "title-asc":
          return a.title.localeCompare(b.title);
        case "title-desc":
          return b.title.localeCompare(a.title);
        case "duration-desc":
          return (b.duration_seconds || 0) - (a.duration_seconds || 0);
        case "duration-asc":
          return (a.duration_seconds || 0) - (b.duration_seconds || 0);
        default:
          return 0;
      }
    });

  const handleDelete = async (sessionId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this recording? This action cannot be undone."
    );
    if (!confirmed) return;

    try {
      const { error } = await supabase.from("sessions").delete().eq("id", sessionId);

      if (error) throw error;

      refetch();
      toast({
        title: "Session Deleted",
        description: "Recording session has been deleted",
      });
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete session",
        variant: "destructive",
      });
    }
  };

  const handleShare = async (sessionId: string) => {
    try {
      const session = sessions?.find((s) => s.id === sessionId);
      if (!session) return;

      // Auto-enable public sharing if not already enabled
      if (!session.is_public) {
        const { error } = await supabase
          .from("sessions")
          .update({ is_public: true })
          .eq("id", sessionId);

        if (error) throw error;

        // Refetch to get updated data
        await refetch();
      }

      // Generate share URL and copy to clipboard
      const shareUrl = `${window.location.origin}/share/${session.share_token}`;
      await navigator.clipboard.writeText(shareUrl);

      toast({
        title: "Link Copied!",
        description: "Share link has been copied to clipboard. Anyone with this link can view the video.",
      });
    } catch (error) {
      console.error("Share error:", error);
      toast({
        title: "Share Failed",
        description: error instanceof Error ? error.message : "Failed to share session",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-[1800px] mx-auto space-y-6"
      >
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">All Sessions</h1>
          <p className="text-muted-foreground mt-1">
            {sessions?.length || 0} recording{sessions?.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Search and Sort Bar */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search recordings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SortAsc className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Date (Newest)</SelectItem>
              <SelectItem value="date-asc">Date (Oldest)</SelectItem>
              <SelectItem value="title-asc">Title (A-Z)</SelectItem>
              <SelectItem value="title-desc">Title (Z-A)</SelectItem>
              <SelectItem value="duration-desc">Duration (Longest)</SelectItem>
              <SelectItem value="duration-asc">Duration (Shortest)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-video w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <VideoGrid
            sessions={filteredSessions || []}
            onDelete={handleDelete}
            onShare={handleShare}
          />
        )}
      </motion.div>

    </div>
  );
};

export default Sessions;
