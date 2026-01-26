import { RunnerApp } from "../game/RunnerApp";

export function meta() {
  return [
    { title: "Infinite Log Runner" },
    { name: "description", content: "Can you survive the log?" },
  ];
}

export default function Runner() {
  return <RunnerApp />;
}
