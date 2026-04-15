import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, RefreshCw, Trophy, Music } from 'lucide-react';

const GRID_SIZE = 20;
const INITIAL_SNAKE = [{ x: 10, y: 10 }];
const INITIAL_DIRECTION = { x: 0, y: -1 };
const GAME_SPEED = 120;

const TRACKS = [
  { id: 1, title: 'Neon Drive (AI Gen)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 2, title: 'Cyber City (AI Gen)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 3, title: 'Digital Dreams (AI Gen)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
];

export default function App() {
  // Game State
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [food, setFood] = useState({ x: 15, y: 5 });
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isGamePaused, setIsGamePaused] = useState(false);

  // Audio State
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Refs for game loop to avoid dependency issues
  const directionRef = useRef(direction);
  const snakeRef = useRef(snake);
  const foodRef = useRef(food);
  const gameOverRef = useRef(gameOver);
  const isGamePausedRef = useRef(isGamePaused);

  useEffect(() => { directionRef.current = direction; }, [direction]);
  useEffect(() => { snakeRef.current = snake; }, [snake]);
  useEffect(() => { foodRef.current = food; }, [food]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);
  useEffect(() => { isGamePausedRef.current = isGamePaused; }, [isGamePaused]);

  // --- Audio Logic ---
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Audio play failed:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrackIndex]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const duration = audioRef.current.duration;
      setProgress((current / duration) * 100 || 0);
    }
  };

  const handleTrackEnd = () => {
    handleNextTrack();
  };

  const handleNextTrack = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
    setIsPlaying(true);
  };

  const handlePrevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
    setIsPlaying(true);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  // --- Game Logic ---
  const generateFood = useCallback(() => {
    let newFood;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      // Ensure food doesn't spawn on snake
      const onSnake = snakeRef.current.some(segment => segment.x === newFood.x && segment.y === newFood.y);
      if (!onSnake) break;
    }
    setFood(newFood);
  }, []);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setScore(0);
    setGameOver(false);
    setIsGamePaused(false);
    generateFood();
  };

  const gameLoop = useCallback(() => {
    if (gameOverRef.current || isGamePausedRef.current) return;

    const currentSnake = [...snakeRef.current];
    const head = { ...currentSnake[0] };
    const currentDir = directionRef.current;

    head.x += currentDir.x;
    head.y += currentDir.y;

    // Check collisions
    if (
      head.x < 0 || head.x >= GRID_SIZE ||
      head.y < 0 || head.y >= GRID_SIZE ||
      currentSnake.some(segment => segment.x === head.x && segment.y === head.y)
    ) {
      setGameOver(true);
      if (score > highScore) {
        setHighScore(score);
      }
      return;
    }

    currentSnake.unshift(head);

    // Check food
    if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
      setScore(s => s + 10);
      generateFood();
    } else {
      currentSnake.pop();
    }

    setSnake(currentSnake);
  }, [score, highScore, generateFood]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling for arrow keys
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === ' ') {
        if (gameOver) {
          resetGame();
        } else {
          setIsGamePaused(p => !p);
        }
        return;
      }

      if (gameOver || isGamePaused) return;

      const currentDir = directionRef.current;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (currentDir.y !== 1) setDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (currentDir.y !== -1) setDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (currentDir.x !== 1) setDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (currentDir.x !== -1) setDirection({ x: 1, y: 0 });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOver, isGamePaused]);

  useEffect(() => {
    const interval = setInterval(gameLoop, GAME_SPEED);
    return () => clearInterval(interval);
  }, [gameLoop]);

  return (
    <div className="min-h-screen bg-dark-bg text-white flex flex-col items-center justify-between p-6 font-mono relative overflow-hidden">
      {/* Background Glow Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-neon-cyan/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-neon-pink/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Header */}
      <header className="w-full max-w-4xl flex justify-between items-center mb-8 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-neon-green/10 rounded-lg border border-neon-green/30 shadow-[0_0_15px_rgba(57,255,20,0.2)]">
            <Trophy className="w-6 h-6 text-neon-green" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-neon-cyan drop-shadow-[0_0_8px_rgba(57,255,20,0.5)]">
              NEON SNAKE
            </h1>
            <p className="text-xs text-gray-400 uppercase tracking-widest">Cybernetic Edition</p>
          </div>
        </div>

        <div className="flex gap-8">
          <div className="flex flex-col items-end">
            <span className="text-xs text-neon-cyan uppercase tracking-widest mb-1">Score</span>
            <span className="text-3xl font-bold text-white drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">{score}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs text-neon-pink uppercase tracking-widest mb-1">High Score</span>
            <span className="text-3xl font-bold text-white drop-shadow-[0_0_10px_rgba(255,0,255,0.5)]">{highScore}</span>
          </div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 flex items-center justify-center w-full z-10 mb-8">
        <div className="relative p-1 rounded-xl bg-gradient-to-br from-neon-green/20 to-neon-cyan/20 shadow-[0_0_30px_rgba(57,255,20,0.15)]">
          <div 
            className="bg-black/80 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden relative"
            style={{ 
              width: `${GRID_SIZE * 20}px`, 
              height: `${GRID_SIZE * 20}px`,
              boxShadow: 'inset 0 0 50px rgba(0,0,0,0.8)'
            }}
          >
            {/* Grid Background */}
            <div 
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: `linear-gradient(rgba(57, 255, 20, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(57, 255, 20, 0.2) 1px, transparent 1px)`,
                backgroundSize: '20px 20px'
              }}
            />

            {/* Snake */}
            {snake.map((segment, index) => {
              const isHead = index === 0;
              return (
                <div
                  key={`${segment.x}-${segment.y}-${index}`}
                  className="absolute rounded-sm transition-all duration-100"
                  style={{
                    left: `${segment.x * 20}px`,
                    top: `${segment.y * 20}px`,
                    width: '20px',
                    height: '20px',
                    backgroundColor: isHead ? 'var(--color-neon-green)' : 'rgba(57, 255, 20, 0.7)',
                    boxShadow: isHead ? '0 0 10px var(--color-neon-green)' : 'none',
                    transform: 'scale(0.9)',
                    zIndex: isHead ? 10 : 5,
                  }}
                />
              );
            })}

            {/* Food */}
            <div
              className="absolute rounded-full animate-pulse"
              style={{
                left: `${food.x * 20}px`,
                top: `${food.y * 20}px`,
                width: '20px',
                height: '20px',
                backgroundColor: 'var(--color-neon-pink)',
                boxShadow: '0 0 15px var(--color-neon-pink)',
                transform: 'scale(0.8)',
              }}
            />

            {/* Overlays */}
            {gameOver && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 backdrop-blur-sm">
                <h2 className="text-4xl font-bold text-neon-pink mb-2 drop-shadow-[0_0_15px_rgba(255,0,255,0.8)]">SYSTEM FAILURE</h2>
                <p className="text-gray-300 mb-6 uppercase tracking-widest text-sm">Final Score: {score}</p>
                <button 
                  onClick={resetGame}
                  className="flex items-center gap-2 px-6 py-3 bg-transparent border border-neon-cyan text-neon-cyan rounded hover:bg-neon-cyan/10 hover:shadow-[0_0_15px_rgba(0,255,255,0.4)] transition-all uppercase tracking-widest text-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reboot Sequence
                </button>
              </div>
            )}

            {isGamePaused && !gameOver && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20 backdrop-blur-sm">
                <h2 className="text-3xl font-bold text-neon-cyan drop-shadow-[0_0_15px_rgba(0,255,255,0.8)] tracking-widest">PAUSED</h2>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Music Player Footer */}
      <footer className="w-full max-w-4xl bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 z-10 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
        <audio 
          ref={audioRef}
          src={TRACKS[currentTrackIndex].url}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleTrackEnd}
        />

        {/* Track Info */}
        <div className="flex items-center gap-4 w-full md:w-1/3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-neon-pink/20 to-neon-cyan/20 border border-white/10 flex items-center justify-center relative overflow-hidden">
            <Music className={`w-6 h-6 text-neon-pink ${isPlaying ? 'animate-pulse' : ''}`} />
            {isPlaying && (
              <div className="absolute inset-0 bg-neon-pink/10 animate-ping rounded-lg"></div>
            )}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-bold text-white truncate drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">
              {TRACKS[currentTrackIndex].title}
            </span>
            <span className="text-xs text-neon-cyan uppercase tracking-widest truncate">
              AI Generated Audio
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center w-full md:w-1/3 gap-2">
          <div className="flex items-center gap-6">
            <button 
              onClick={handlePrevTrack}
              className="text-gray-400 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            <button 
              onClick={togglePlayPause}
              className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 hover:shadow-[0_0_15px_rgba(255,255,255,0.6)] transition-all"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
            </button>
            <button 
              onClick={handleNextTrack}
              className="text-gray-400 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full flex items-center gap-2">
            <div className="h-1 flex-1 bg-gray-800 rounded-full overflow-hidden relative">
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-neon-pink to-neon-cyan transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Volume / Extra */}
        <div className="flex items-center justify-end w-full md:w-1/3 gap-4">
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="text-gray-400 hover:text-neon-green hover:drop-shadow-[0_0_8px_rgba(57,255,20,0.8)] transition-all"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <div className="text-xs text-gray-500 uppercase tracking-widest hidden md:block">
            Space: Pause/Play
          </div>
        </div>
      </footer>
    </div>
  );
}
