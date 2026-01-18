import { TabsTrigger } from "@/components/ui/tabs";

interface SettingsTabTriggerProps {
  value: string;
  children: React.ReactNode;
}

export function SettingsTabTrigger({ value, children }: SettingsTabTriggerProps) {
  return (
    <TabsTrigger
      value={value}
      className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-white/70"
    >
      {children}
    </TabsTrigger>
  );
}
