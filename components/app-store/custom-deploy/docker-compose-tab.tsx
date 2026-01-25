import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Upload } from "lucide-react";
import type { ChangeEvent } from "react";

type DockerComposeTabProps = {
  loading: boolean;
  dockerCompose: string;
  onDockerComposeChange: (value: string) => void;
  onFileUpload: (e: ChangeEvent<HTMLInputElement>) => void;
};

export function DockerComposeTab({
  loading,
  dockerCompose,
  onDockerComposeChange,
  onFileUpload,
}: DockerComposeTabProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="compose-file" className="text-zinc-200">
            Docker Compose Configuration *
          </Label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => document.getElementById("file-upload")?.click()}
            disabled={loading}
            className="h-8 text-white hover:text-white transition-all"
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
            }}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload File
          </Button>
          <input
            id="file-upload"
            type="file"
            accept=".yml,.yaml"
            onChange={onFileUpload}
            className="hidden"
          />
        </div>
        <Textarea
          id="compose-file"
          placeholder="version: '3.8'\nservices:\n  myapp:\n    image: nginx:latest\n    ports:\n      - '8080:80'\n    volumes:\n      - ./data:/data"
          value={dockerCompose}
          onChange={(e) => onDockerComposeChange(e.target.value)}
          className="min-h-[300px] font-mono text-sm text-white placeholder:text-zinc-500 whitespace-pre-wrap break-words break-all w-full max-w-full"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
          }}
          disabled={loading}
        />
        <p className="text-xs text-zinc-400">
          Paste your docker-compose.yml content or upload a file
        </p>
      </div>

      <div
        className="rounded-xl p-4"
        style={{
          background: "rgba(59, 130, 246, 0.1)",
          border: "1px solid rgba(96, 165, 250, 0.3)",
        }}
      >
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-300 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-100/90">
            <p className="font-medium mb-1 text-white">Important Notes:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Ensure ports don&apos;t conflict with existing apps</li>
              <li>Use absolute paths for volume mounts</li>
              <li>Container will restart automatically unless specified</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
