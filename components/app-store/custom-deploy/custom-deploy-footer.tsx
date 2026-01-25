import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type CustomDeployFooterProps = {
  loading: boolean;
  onCancel: () => void;
  onDeploy: () => void;
};

export function CustomDeployFooter({ loading, onCancel, onDeploy }: CustomDeployFooterProps) {
  return (
    <div
      className="flex items-center justify-end gap-3 px-6 py-4 border-t"
      style={{ borderColor: "rgba(255, 255, 255, 0.15)" }}
    >
      <Button
        variant="outline"
        onClick={onCancel}
        disabled={loading}
        className="text-white hover:text-white transition-all"
        style={{
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
        }}
      >
        Cancel
      </Button>
      <Button
        onClick={onDeploy}
        disabled={loading}
        className="text-white hover:text-white transition-all"
        style={{
          background: "rgba(255, 255, 255, 0.15)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.25)";
          }
        }}
        onMouseLeave={(e) => {
          if (!loading) {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
          }
        }}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Deploying...
          </>
        ) : (
          "Deploy Application"
        )}
      </Button>
    </div>
  );
}
