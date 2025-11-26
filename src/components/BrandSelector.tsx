import { Building2, Check, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface BrandSelectorProps {
  selectedBrand: string | null;
  onSelectBrand: (brand: string | null) => void;
}

const brands = [
  {
    id: "ssv",
    name: "SSV",
    fullName: "Seward & Seward Visas",
    color: "hsl(221 83% 53%)",
    description: "Immigration Law Firm"
  },
  {
    id: "igta",
    name: "IGTA",
    fullName: "Immigration Global Talent Advisors",
    color: "hsl(262 83% 58%)",
    description: "Talent Advisory"
  },
  {
    id: "camino",
    name: "Camino",
    fullName: "Camino Immigration",
    color: "hsl(142 76% 36%)",
    description: "Immigration Services"
  },
  {
    id: "aventus",
    name: "Aventus",
    fullName: "Aventus Legal",
    color: "hsl(38 92% 50%)",
    description: "Legal Solutions"
  },
  {
    id: "innovative",
    name: "Innovative Automations",
    fullName: "Innovative Automations",
    color: "hsl(0 84% 60%)",
    description: "Tech & Automation"
  }
];

const BrandSelector = ({ selectedBrand, onSelectBrand }: BrandSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedBrandData = brands.find(b => b.id === selectedBrand);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <CollapsibleTrigger className="w-full">
        <div className="glass-card glass-interactive p-4 flex items-center justify-between w-full cursor-pointer group">
          <div className="flex items-center gap-3">
            {selectedBrandData ? (
              <>
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${selectedBrandData.color}20` }}
                >
                  <Building2 className="h-5 w-5" style={{ color: selectedBrandData.color }} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-foreground">{selectedBrandData.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedBrandData.description}</p>
                </div>
              </>
            ) : (
              <>
                <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="font-medium text-muted-foreground">Select a brand</p>
              </>
            )}
          </div>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          >
            <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </motion.div>
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              className="mt-2"
            >
              <motion.div 
                className="bg-[#0d0d0d]/95 backdrop-blur-sm border border-white/5 rounded-xl shadow-2xl overflow-hidden"
                initial="hidden"
                animate="visible"
                variants={{
                  visible: {
                    transition: {
                      staggerChildren: 0.08
                    }
                  }
                }}
              >
                {brands.map((brand, index) => {
                  const isSelected = selectedBrand === brand.id;
                  return (
                    <motion.div
                      key={brand.id}
                      variants={{
                        hidden: { opacity: 0, y: -10 },
                        visible: { opacity: 1, y: 0 }
                      }}
                      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                      whileHover={{ scale: 1.005 }}
                      whileTap={{ scale: 0.998 }}
                      className={cn(
                        "px-4 py-3 cursor-pointer transition-all duration-200",
                        index % 2 === 0 ? "bg-white/[0.02]" : "bg-transparent",
                        isSelected && "bg-white/10",
                        !isSelected && "hover:bg-white/5"
                      )}
                      onClick={() => {
                        onSelectBrand(isSelected ? null : brand.id);
                        setIsOpen(false);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-10 w-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${brand.color}20` }}
                          >
                            <Building2 className="h-5 w-5" style={{ color: brand.color }} />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{brand.name}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{brand.fullName}</p>
                          </div>
                        </div>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="h-6 w-6 rounded-full bg-primary flex items-center justify-center"
                          >
                            <Check className="h-4 w-4 text-primary-foreground" />
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default BrandSelector;
