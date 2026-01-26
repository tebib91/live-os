import type { FirewallRule, FirewallStatus } from "@/app/actions/firewall";

export type { FirewallRule, FirewallStatus };

export type FirewallData = {
  status: FirewallStatus;
  rules: FirewallRule[];
  error?: string;
  loading: boolean;
};

export type AddRuleFormData = {
  port: string;
  protocol: "tcp" | "udp" | "any";
  action: "allow" | "deny" | "reject" | "limit";
  from: string;
  direction: "in" | "out";
};
