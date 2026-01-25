import { Button } from "@/components/ui/button";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";
import Image from "next/image";

type CustomDeployHeaderData = {
  appIcon?: string;
  appTitle?: string;
};

type CustomDeployHeaderProps = {
  data?: CustomDeployHeaderData;
  descriptionId: string;
  onClose: () => void;
};

export function CustomDeployHeader({ data, descriptionId, onClose }: CustomDeployHeaderProps) {
  return (
    <div
      className="relative px-6 py-5 border-b"
      style={{ borderColor: "rgba(255, 255, 255, 0.15)" }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {data?.appIcon && (
            <div className="relative w-12 h-12 flex-shrink-0">
              <Image
                src={data.appIcon}
                alt={data.appTitle || "App"}
                fill
                className="object-contain rounded-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/icons/default-app-icon.png";
                }}
              />
            </div>
          )}
          <div>
            <DialogTitle className="text-2xl font-semibold text-white">
              {data?.appTitle ? `Customize ${data.appTitle}` : "Custom Docker Deploy"}
            </DialogTitle>
            <DialogDescription id={descriptionId} className="text-sm text-zinc-300 mt-1">
              {data?.appTitle
                ? "Modify the configuration before deploying"
                : "Deploy your own Docker container or compose file"}
            </DialogDescription>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-9 w-9 rounded-full text-white transition-all"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
          }}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
