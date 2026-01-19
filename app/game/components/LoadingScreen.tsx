interface LoadingScreenProps {
  active: boolean;
  progress: number;
}

export function LoadingScreen({ active, progress }: LoadingScreenProps) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black text-white">
      <div className="text-4xl font-bold mb-4 animate-pulse">
        LOADING GAME...
      </div>
      <div className="w-64 h-4 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-2 text-sm text-gray-400">
        {active
          ? `Loading Assets: ${progress.toFixed(0)}%`
          : "Preparing Environment..."}
      </p>
    </div>
  );
}
