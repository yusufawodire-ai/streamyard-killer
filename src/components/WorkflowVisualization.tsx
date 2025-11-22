import { GlassCard } from "@/components/ui/glass-card";
import { ArrowRight, Video, FileText, Wand2, Image, Upload } from "lucide-react";
import { motion } from "framer-motion";

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
    <GlassCard variant="elevated" className="p-8">
      <div className="flex items-center justify-between gap-4 overflow-x-auto pb-2">
        {workflowSteps.map((step, index) => (
          <div key={step.title} className="flex items-center gap-4 flex-shrink-0">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="flex flex-col items-center gap-3"
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="h-16 w-16 rounded-2xl flex items-center justify-center glass-card shadow-glow"
                style={{ backgroundColor: `${step.color}20` }}
              >
                <step.icon className="h-8 w-8" style={{ color: step.color }} />
              </motion.div>
              <div className="text-center">
                <h4 className="font-semibold text-sm text-foreground">{step.title}</h4>
                <p className="text-xs text-muted-foreground whitespace-nowrap">
                  {step.description}
                </p>
              </div>
            </motion.div>
            {index < workflowSteps.length - 1 && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 + 0.2 }}
              >
                <ArrowRight className="h-6 w-6 text-muted-foreground flex-shrink-0 mt-[-40px]" />
              </motion.div>
            )}
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

export default WorkflowVisualization;
