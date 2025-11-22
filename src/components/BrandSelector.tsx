import { Card } from "@/components/ui/card";
import { Building2, Check } from "lucide-react";

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
  return (
    <div className="grid gap-4 md:grid-cols-5">
      {brands.map((brand) => {
        const isSelected = selectedBrand === brand.id;
        return (
          <Card
            key={brand.id}
            className={`p-4 cursor-pointer transition-all hover:scale-105 hover:shadow-lg border-2 ${
              isSelected ? "border-primary shadow-lg" : "border-border"
            }`}
            onClick={() => onSelectBrand(isSelected ? null : brand.id)}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div
                  className="h-12 w-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${brand.color}15` }}
                >
                  <Building2 className="h-6 w-6" style={{ color: brand.color }} />
                </div>
                {isSelected && (
                  <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-bold text-foreground">{brand.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-1">{brand.fullName}</p>
                <p className="text-xs text-muted-foreground mt-1">{brand.description}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default BrandSelector;
