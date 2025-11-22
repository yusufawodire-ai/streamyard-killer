import * as React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "interactive";
  animated?: boolean;
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = "default", animated = false, children, ...props }, ref) => {
    const baseClasses = "glass-card rounded-xl";
    
    const variantClasses = {
      default: "",
      elevated: "glass-elevated",
      interactive: "glass-interactive",
    };

    const content = (
      <div
        ref={ref}
        className={cn(baseClasses, variantClasses[variant], className)}
        {...props}
      >
        {children}
      </div>
    );

    if (animated) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {content}
        </motion.div>
      );
    }

    return content;
  }
);

GlassCard.displayName = "GlassCard";

export { GlassCard };
