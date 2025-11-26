import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Folder,
  FolderPlus,
  Star,
  Trash2,
  Video,
  Share2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface FolderSidebarProps {
  selectedView: "all" | "starred" | "trash" | string;
  onViewChange: (view: string) => void;
  sessionCount: number;
  starredCount: number;
  trashedCount: number;
}

export const FolderSidebar = ({
  selectedView,
  onViewChange,
  sessionCount,
  starredCount,
  trashedCount,
}: FolderSidebarProps) => {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const { data: folders, refetch: refetchFolders } = useQuery({
    queryKey: ["folders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("folders")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const { data: folderCounts } = useQuery({
    queryKey: ["folder-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("folder_id")
        .eq("is_trashed", false);

      if (error) throw error;

      const counts: Record<string, number> = {};
      data.forEach((session) => {
        if (session.folder_id) {
          counts[session.folder_id] = (counts[session.folder_id] || 0) + 1;
        }
      });

      return counts;
    },
  });

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast({
        title: "Error",
        description: "Folder name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("folders").insert({
        name: newFolderName.trim(),
      });

      if (error) throw error;

      toast({
        title: "Folder Created",
        description: `"${newFolderName}" has been created`,
      });

      setNewFolderName("");
      setIsCreateDialogOpen(false);
      refetchFolders();
    } catch (error) {
      console.error("Create folder error:", error);
      toast({
        title: "Failed to create folder",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const NavItem = ({
    icon: Icon,
    label,
    count,
    value,
    color,
  }: {
    icon: any;
    label: string;
    count?: number;
    value: string;
    color?: string;
  }) => (
    <button
      onClick={() => onViewChange(value)}
      className={cn(
        "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
        selectedView === value
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", color)} />
        <span>{label}</span>
      </div>
      {count !== undefined && count > 0 && (
        <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </button>
  );

  return (
    <div className="w-64 border-r border-border/50 p-4 space-y-6">
      {/* Main Navigation */}
      <div className="space-y-1">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
          Personal
        </h3>
        <NavItem
          icon={Video}
          label="All Items"
          count={sessionCount}
          value="all"
        />
        <NavItem
          icon={Star}
          label="Starred"
          count={starredCount}
          value="starred"
          color="text-yellow-500"
        />
      </div>

      {/* Folders */}
      <div className="space-y-1">
        <div className="flex items-center justify-between px-3 mb-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Folders
          </h3>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {folders && folders.length > 0 ? (
          folders.map((folder) => (
            <NavItem
              key={folder.id}
              icon={Folder}
              label={folder.name}
              count={folderCounts?.[folder.id] || 0}
              value={`folder:${folder.id}`}
            />
          ))
        ) : (
          <p className="text-xs text-muted-foreground px-3 py-2">
            No folders yet
          </p>
        )}
      </div>

      {/* Trash */}
      <div className="space-y-1 pt-4 border-t border-border/50">
        <NavItem
          icon={Trash2}
          label="Trash"
          count={trashedCount}
          value="trash"
          color="text-destructive"
        />
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Organize your recordings into folders
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFolder();
              }}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateFolder}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
