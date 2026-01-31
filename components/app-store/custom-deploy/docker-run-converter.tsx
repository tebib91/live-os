import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowDownToLine, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";

type DockerRunConverterProps = {
  loading: boolean;
  onConverted: (command: string) => Promise<void>;
};

export function DockerRunConverter({
  loading,
  onConverted,
}: DockerRunConverterProps) {
  const [command, setCommand] = useState("");
  const [converting, setConverting] = useState(false);

  const handleConvert = useCallback(async () => {
    if (!command.trim()) return;
    setConverting(true);
    try {
      await onConverted(command);
      setCommand("");
    } finally {
      setConverting(false);
    }
  }, [command, onConverted]);

  return (
    <div className="space-y-2">
      <Label className="text-zinc-200">
        Convert Docker Run Command (optional)
      </Label>
      <div className="flex gap-2">
        <Input
          placeholder="docker run -d --name myapp -p 8080:80 nginx:latest"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          className="flex-1 text-white placeholder:text-zinc-500 font-mono text-sm"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
          }}
          disabled={loading || converting}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleConvert();
          }}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleConvert}
          disabled={loading || converting || !command.trim()}
          className="h-9 text-white hover:text-white whitespace-nowrap transition-all"
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
          {converting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <ArrowDownToLine className="h-4 w-4 mr-1" />
          )}
          Convert
        </Button>
      </div>
      <p className="text-xs text-zinc-400">
        Paste a docker run command to auto-convert it to Compose format
      </p>
    </div>
  );
}
