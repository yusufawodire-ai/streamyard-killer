import RecordingSession from "@/components/RecordingSession";
import { motion } from "framer-motion";

const Sessions = () => {
  return (
    <div className="min-h-screen p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto space-y-6"
      >
        <div>
          <h1 className="text-3xl font-bold">All Sessions</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all your recording sessions
          </p>
        </div>

        <RecordingSession selectedBrand={null} />
      </motion.div>
    </div>
  );
};

export default Sessions;
