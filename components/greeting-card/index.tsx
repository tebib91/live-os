"use client";

import { getSystemUsername } from "@/app/actions/system";
import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { LiveClock } from "./live-clock";
import { WeatherInfo } from "./weather-info";

export function GreetingCard() {
  const [username, setUsername] = useState<string>("User");

  useEffect(() => {
    getSystemUsername().then(setUsername);
  }, []);

  return (
    <Card className="fixed top-8 left-1/2 -translate-x-1/2 z-10 w-[90%] max-w-2xl bg-zinc-950/60 backdrop-blur-xl ">
      <div className="flex items-center justify-between p-5">
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-2xl font-semibold text-white drop-shadow-sm">
              Hi, {username}
            </span>
            <WeatherInfo />
          </div>
        </div>
        <LiveClock />
      </div>
    </Card>
  );
}
