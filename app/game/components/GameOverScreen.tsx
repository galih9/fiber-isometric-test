interface GameOverScreenProps {
  onRestart: () => void;
}

export function GameOverScreen({ onRestart }: GameOverScreenProps) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="text-center space-y-8 animate-slideUp">
        <h1 className="text-7xl font-bold text-red-500 tracking-wider animate-pulse">
          GAME OVER
        </h1>
        <p className="text-2xl text-white/80">
          You were destroyed by the enemy!
        </p>
        <button
          onClick={onRestart}
          className="px-8 py-4 text-xl font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
        >
          RESTART GAME
        </button>
      </div>
    </div>
  );
}
