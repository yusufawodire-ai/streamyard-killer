import { Card } from "@/components/ui/card";
import { ArrowRight, Video, FileText, Wand2, Image, Upload } from "lucide-react";

const workflowSteps = [
  {
    icon: Video,
    title: "Record",
    description: "Capture video content",
    color: "hsl(221 83% 53%)"
  },
  {
    icon: FileText,
    title: "Transcribe",
    description: "AI-powered transcription",
    color: "hsl(262 83% 58%)"
  },
  {
    icon: Wand2,
    title: "AI Analysis",
    description: "Content suggestions",
    color: "hsl(142 76% 36%)"
  },
  {
    icon: Image,
    title: "Thumbnail",
    description: "Auto-generate thumbnail",
    color: "hsl(38 92% 50%)"
  },
  {
    icon: Upload,
    title: "Distribute",
    description: "Multi-platform upload",
    color: "hsl(0 84% 60%)"
  }
];

const WorkflowVisualization = () => {
  return (
    <Card className="p-8 border-border bg-gradient-to-br from-card to-secondary/10">
      <div className="flex items-center justify-between gap-4 overflow-x-auto pb-2">
        {workflowSteps.map((step, index) => (
          <div key={step.title} className="flex items-center gap-4 flex-shrink-0">
            <div className="flex flex-col items-center gap-3">
              <div
                className="h-16 w-16 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ backgroundColor: `${step.color}15` }}
              >
                <step.icon className="h-8 w-8" style={{ color: step.color }} />
              </div>
              <div className="text-center">
                <h4 className="font-semibold text-sm text-foreground">{step.title}</h4>
                <p className="text-xs text-muted-foreground whitespace-nowrap">
                  {step.description}
                </p>
              </div>
            </div>
            {index < workflowSteps.length - 1 && (
              <ArrowRight className="h-6 w-6 text-muted-foreground flex-shrink-0 mt-[-40px]" />
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};

export default WorkflowVisualization;
