import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Video, Clock, FileText, Image, Play } from "lucide-react";

interface RecordingSessionProps {
  selectedBrand: string | null;
}

const sessions = [
  {
    id: 1,
    brand: "ssv",
    brandName: "SSV",
    title: "H-1B Visa Process Overview",
    duration: "12:34",
    status: "completed",
    date: "2025-11-20",
    thumbnail: true,
    transcript: true
  },
  {
    id: 2,
    brand: "igta",
    brandName: "IGTA",
    title: "Global Talent Advisory Intro",
    duration: "8:15",
    status: "processing",
    date: "2025-11-21",
    thumbnail: false,
    transcript: true
  },
  {
    id: 3,
    brand: "camino",
    brandName: "Camino",
    title: "Immigration Success Stories",
    duration: "15:42",
    status: "in-progress",
    date: "2025-11-22",
    thumbnail: false,
    transcript: false
  },
  {
    id: 4,
    brand: "ssv",
    brandName: "SSV",
    title: "EB-2 NIW Application Tips",
    duration: "10:20",
    status: "completed",
    date: "2025-11-19",
    thumbnail: true,
    transcript: true
  },
  {
    id: 5,
    brand: "aventus",
    brandName: "Aventus",
    title: "Legal Tech Innovation",
    duration: "9:45",
    status: "completed",
    date: "2025-11-18",
    thumbnail: true,
    transcript: true
  }
];

const RecordingSession = ({ selectedBrand }: RecordingSessionProps) => {
  const filteredSessions = selectedBrand
    ? sessions.filter((s) => s.brand === selectedBrand)
    : sessions;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success/10 text-success border-success/20";
      case "processing":
        return "bg-warning/10 text-warning border-warning/20";
      case "in-progress":
        return "bg-primary/10 text-primary border-primary/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-4">
      {filteredSessions.map((session) => (
        <Card key={session.id} className="p-6 border-border hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-4 flex-1">
              <div className="h-20 w-32 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Video className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-foreground">{session.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {session.brandName} • {session.date}
                    </p>
                  </div>
                  <Badge className={getStatusColor(session.status)} variant="outline">
                    {session.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {session.duration}
                  </span>
                  {session.transcript && (
                    <span className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      Transcript
                    </span>
                  )}
                  {session.thumbnail && (
                    <span className="flex items-center gap-1">
                      <Image className="h-4 w-4" />
                      Thumbnail
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {session.status === "in-progress" && (
                <Button size="sm" className="bg-primary hover:bg-primary/90">
                  <Play className="h-4 w-4 mr-1" />
                  Continue
                </Button>
              )}
              {session.status === "completed" && (
                <Button size="sm" variant="outline">
                  View
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default RecordingSession;
