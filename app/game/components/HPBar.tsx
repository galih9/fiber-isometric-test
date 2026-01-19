import { GAME_CONFIG } from "../constants/gameConfig";

interface HPBarProps {
  hp: number;
}

export function HPBar({ hp }: HPBarProps) {
  const percentage = (hp / GAME_CONFIG.playerMaxHP) * 100;

  // Color based on HP percentage
  const getColor = () => {
    if (percentage > 60) return "bg-green-500";
    if (percentage > 30) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold">HP</span>
        <span className="text-sm font-mono">
          {hp}/{GAME_CONFIG.playerMaxHP}
        </span>
      </div>
      <div className="w-48 h-6 bg-gray-800 rounded-full overflow-hidden border-2 border-gray-600">
        <div
          className={`h-full ${getColor()} transition-all duration-300 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
