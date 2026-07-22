import { User, Users } from "lucide-react";
import type { Audience } from "@/types";

// The three lists are labels on one account (BUILD.md §0).
export const owners: Record<
  Audience,
  { label: string; short: string; icon: typeof User }
> = {
  me: { label: "Me", short: "Me", icon: User },
  us: { label: "Us Two", short: "Us", icon: Users },
  family: { label: "Family", short: "Family", icon: Users },
};

export const audienceOrder: Audience[] = ["me", "us", "family"];
