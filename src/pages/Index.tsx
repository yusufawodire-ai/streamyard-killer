import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Play, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import BrandSelector from "@/components/BrandSelector";
import RecordingSession from "@/components/RecordingSession";
import WorkflowVisualization from "@/components/WorkflowVisualization";
import { NewRecordingModal } from "@/components/NewRecordingModal";

const Index = () => {
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Video className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">StreamYard Killer</h1>
                <p className="text-xs text-muted-foreground">AI-Powered Content Creation</p>
              </div>
            </div>
            <Button 
              className="bg-primary hover:bg-primary/90"
              onClick={() => setIsModalOpen(true)}
            >
              <Play className="mr-2 h-4 w-4" />
              New Recording
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Brand Selection */}
        <section>
          <h2 className="text-2xl font-bold mb-4 text-foreground">Select Your Brand</h2>
          <BrandSelector selectedBrand={selectedBrand} onSelectBrand={setSelectedBrand} />
        </section>

        {/* Stats Overview */}
        <section className="grid gap-4 md:grid-cols-4">
          <Card className="p-6 border-border hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
                <p className="text-3xl font-bold text-foreground mt-1">24</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Video className="h-6 w-6 text-primary" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-3xl font-bold text-foreground mt-1">3</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-warning" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-3xl font-bold text-foreground mt-1">18</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Issues</p>
                <p className="text-3xl font-bold text-foreground mt-1">2</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </Card>
        </section>

        {/* Workflow Visualization */}
        <section>
          <h2 className="text-2xl font-bold mb-4 text-foreground">Automation Workflow</h2>
          <WorkflowVisualization />
        </section>

        {/* Recent Sessions */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-foreground">Recent Sessions</h2>
            <Badge variant="secondary" className="text-xs">
              {selectedBrand ? `Filtered: ${selectedBrand}` : "All Brands"}
            </Badge>
          </div>
          <RecordingSession selectedBrand={selectedBrand} />
        </section>
      </main>

      <NewRecordingModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  );
};

export default Index;
