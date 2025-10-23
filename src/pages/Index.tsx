import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

type Language = 'ru' | 'en';
type GameState = 'menu' | 'playing' | 'paused' | 'settings';

interface Translation {
  play: string;
  settings: string;
  exit: string;
  continue: string;
  backToMenu: string;
  language: string;
  gameTitle: string;
  score: string;
  health: string;
  paused: string;
}

const translations: Record<Language, Translation> = {
  ru: {
    play: 'ИГРАТЬ',
    settings: 'НАСТРОЙКИ',
    exit: 'ВЫХОД',
    continue: 'ПРОДОЛЖИТЬ',
    backToMenu: 'ВЫХОД В МЕНЮ',
    language: 'ЯЗЫК',
    gameTitle: 'PIXEL SHOOTER',
    score: 'СЧЕТ',
    health: 'ЖИЗНИ',
    paused: 'ПАУЗА'
  },
  en: {
    play: 'PLAY',
    settings: 'SETTINGS',
    exit: 'EXIT',
    continue: 'CONTINUE',
    backToMenu: 'BACK TO MENU',
    language: 'LANGUAGE',
    gameTitle: 'PIXEL SHOOTER',
    score: 'SCORE',
    health: 'HEALTH',
    paused: 'PAUSED'
  }
};

interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
}

interface Player extends GameObject {
  health: number;
}

interface Enemy extends GameObject {
  direction: number;
}

interface Bullet extends GameObject {
  active: boolean;
}

const Index = () => {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [language, setLanguage] = useState<Language>('ru');
  const [score, setScore] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const keysPressed = useRef<Set<string>>(new Set());
  
  const [player, setPlayer] = useState<Player>({
    x: 400,
    y: 550,
    width: 20,
    height: 20,
    speed: 5,
    health: 3
  });

  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);

  const t = translations[language];

  const spawnEnemy = useCallback(() => {
    const newEnemy: Enemy = {
      x: Math.random() * 760 + 20,
      y: -30,
      width: 20,
      height: 20,
      speed: 2 + Math.random() * 2,
      direction: Math.random() > 0.5 ? 1 : -1
    };
    setEnemies(prev => [...prev, newEnemy]);
  }, []);

  const shoot = useCallback(() => {
    const newBullet: Bullet = {
      x: player.x + player.width / 2 - 2,
      y: player.y,
      width: 4,
      height: 10,
      speed: 8,
      active: true
    };
    setBullets(prev => [...prev, newBullet]);
  }, [player.x, player.y, player.width]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.key.toLowerCase());
      
      if (e.key === ' ' && gameState === 'playing') {
        e.preventDefault();
        shoot();
      }
      
      if (e.key === 'Escape' && gameState === 'playing') {
        setGameState('paused');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, shoot]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const enemySpawnInterval = setInterval(spawnEnemy, 1500);
    return () => clearInterval(enemySpawnInterval);
  }, [gameState, spawnEnemy]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = () => {
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (keysPressed.current.has('a') || keysPressed.current.has('arrowleft')) {
        setPlayer(prev => ({ ...prev, x: Math.max(0, prev.x - prev.speed) }));
      }
      if (keysPressed.current.has('d') || keysPressed.current.has('arrowright')) {
        setPlayer(prev => ({ ...prev, x: Math.min(canvas.width - prev.width, prev.x + prev.speed) }));
      }
      if (keysPressed.current.has('w') || keysPressed.current.has('arrowup')) {
        setPlayer(prev => ({ ...prev, y: Math.max(0, prev.y - prev.speed) }));
      }
      if (keysPressed.current.has('s') || keysPressed.current.has('arrowdown')) {
        setPlayer(prev => ({ ...prev, y: Math.min(canvas.height - prev.height, prev.y + prev.speed) }));
      }

      ctx.fillStyle = '#00FFFF';
      ctx.fillRect(player.x, player.y, player.width, player.height);

      setBullets(prev => {
        const updated = prev
          .map(bullet => ({ ...bullet, y: bullet.y - bullet.speed }))
          .filter(bullet => bullet.y > -bullet.height);
        
        updated.forEach(bullet => {
          ctx.fillStyle = '#FFFF00';
          ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        });
        
        return updated;
      });

      setEnemies(prev => {
        const updated = prev
          .map(enemy => ({
            ...enemy,
            y: enemy.y + enemy.speed,
            x: enemy.x + enemy.direction * 1
          }))
          .filter(enemy => {
            if (enemy.y > canvas.height) return false;
            
            const hitByBullet = bullets.some(bullet => 
              bullet.x < enemy.x + enemy.width &&
              bullet.x + bullet.width > enemy.x &&
              bullet.y < enemy.y + enemy.height &&
              bullet.y + bullet.height > enemy.y
            );

            if (hitByBullet) {
              setScore(s => s + 10);
              setBullets(b => b.filter(bullet => 
                !(bullet.x < enemy.x + enemy.width &&
                  bullet.x + bullet.width > enemy.x &&
                  bullet.y < enemy.y + enemy.height &&
                  bullet.y + bullet.height > enemy.y)
              ));
              return false;
            }

            const hitPlayer = 
              player.x < enemy.x + enemy.width &&
              player.x + player.width > enemy.x &&
              player.y < enemy.y + enemy.height &&
              player.y + player.height > enemy.y;

            if (hitPlayer) {
              setPlayer(p => ({ ...p, health: p.health - 1 }));
              return false;
            }

            return true;
          });

        updated.forEach(enemy => {
          ctx.fillStyle = '#FF0000';
          ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        });

        return updated;
      });

      if (player.health <= 0) {
        setGameState('menu');
        setPlayer(prev => ({ ...prev, health: 3, x: 400, y: 550 }));
        setScore(0);
        setEnemies([]);
        setBullets([]);
        return;
      }

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, player, bullets, shoot]);

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setPlayer({ x: 400, y: 550, width: 20, height: 20, speed: 5, health: 3 });
    setEnemies([]);
    setBullets([]);
  };

  const exitGame = () => {
    if (typeof window !== 'undefined') {
      window.close();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a0a1a] via-[#1a0a2a] to-[#0a1a2a] p-4">
      <div className="relative w-full max-w-4xl">
        {gameState === 'menu' && (
          <div className="animate-fade-in">
            <Card className="bg-card/80 backdrop-blur-sm border-4 border-primary p-8 space-y-8">
              <h1 className="text-4xl md:text-6xl text-center text-primary mb-8 drop-shadow-[0_0_20px_rgba(255,0,0,0.8)]">
                {t.gameTitle}
              </h1>
              
              <div className="space-y-4 max-w-md mx-auto">
                <Button
                  onClick={startGame}
                  className="w-full h-16 text-xl bg-primary hover:bg-primary/80 border-4 border-primary-foreground text-primary-foreground font-bold shadow-[0_0_20px_rgba(255,0,0,0.6)] hover:shadow-[0_0_30px_rgba(255,0,0,0.9)] transition-all"
                >
                  <Icon name="Gamepad2" className="mr-3" size={24} />
                  {t.play}
                </Button>
                
                <Button
                  onClick={() => setGameState('settings')}
                  className="w-full h-16 text-xl bg-secondary hover:bg-secondary/80 border-4 border-secondary-foreground text-secondary-foreground font-bold shadow-[0_0_20px_rgba(0,255,255,0.6)] hover:shadow-[0_0_30px_rgba(0,255,255,0.9)] transition-all"
                >
                  <Icon name="Settings" className="mr-3" size={24} />
                  {t.settings}
                </Button>
                
                <Button
                  onClick={exitGame}
                  className="w-full h-16 text-xl bg-muted hover:bg-muted/80 border-4 border-foreground text-foreground font-bold"
                >
                  <Icon name="LogOut" className="mr-3" size={24} />
                  {t.exit}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {gameState === 'settings' && (
          <div className="animate-fade-in">
            <Card className="bg-card/80 backdrop-blur-sm border-4 border-secondary p-8 space-y-6">
              <h2 className="text-3xl text-center text-secondary mb-6 drop-shadow-[0_0_20px_rgba(0,255,255,0.8)]">
                {t.settings}
              </h2>
              
              <div className="space-y-4 max-w-md mx-auto">
                <div className="text-xl text-foreground mb-4">{t.language}:</div>
                <div className="flex gap-4">
                  <Button
                    onClick={() => setLanguage('ru')}
                    className={`flex-1 h-14 text-lg border-4 font-bold ${
                      language === 'ru'
                        ? 'bg-accent text-accent-foreground border-accent shadow-[0_0_20px_rgba(0,255,0,0.8)]'
                        : 'bg-muted text-foreground border-foreground'
                    }`}
                  >
                    РУССКИЙ
                  </Button>
                  <Button
                    onClick={() => setLanguage('en')}
                    className={`flex-1 h-14 text-lg border-4 font-bold ${
                      language === 'en'
                        ? 'bg-accent text-accent-foreground border-accent shadow-[0_0_20px_rgba(0,255,0,0.8)]'
                        : 'bg-muted text-foreground border-foreground'
                    }`}
                  >
                    ENGLISH
                  </Button>
                </div>
              </div>

              <Button
                onClick={() => setGameState('menu')}
                className="w-full max-w-md mx-auto block h-14 text-lg bg-secondary hover:bg-secondary/80 border-4 border-secondary-foreground text-secondary-foreground font-bold mt-8"
              >
                <Icon name="ArrowLeft" className="mr-3" size={20} />
                {t.backToMenu}
              </Button>
            </Card>
          </div>
        )}

        {gameState === 'playing' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-foreground text-sm md:text-lg px-4">
              <div className="flex items-center gap-2">
                <Icon name="Target" size={20} className="text-accent" />
                <span>{t.score}: {score}</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="Heart" size={20} className="text-primary" />
                <span>{t.health}: {player.health}</span>
              </div>
            </div>
            
            <div className="border-4 border-primary shadow-[0_0_30px_rgba(255,0,0,0.5)]">
              <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className="w-full bg-[#0a0a1a]"
              />
            </div>

            <div className="text-center text-muted-foreground text-xs md:text-sm space-y-1">
              <p>WASD / ← ↑ → ↓ - ДВИЖЕНИЕ</p>
              <p>ПРОБЕЛ - ВЫСТРЕЛ</p>
              <p>ESC - ПАУЗА</p>
            </div>
          </div>
        )}

        {gameState === 'paused' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
            <Card className="bg-card border-4 border-accent p-8 space-y-6 max-w-md">
              <h2 className="text-4xl text-center text-accent mb-6 drop-shadow-[0_0_20px_rgba(0,255,0,0.8)]">
                <Icon name="Pause" className="inline-block mr-3" size={32} />
                {t.paused}
              </h2>
              
              <div className="space-y-4">
                <Button
                  onClick={() => setGameState('playing')}
                  className="w-full h-14 text-lg bg-accent hover:bg-accent/80 border-4 border-accent-foreground text-accent-foreground font-bold shadow-[0_0_20px_rgba(0,255,0,0.6)]"
                >
                  <Icon name="Play" className="mr-3" size={20} />
                  {t.continue}
                </Button>
                
                <Button
                  onClick={() => setGameState('settings')}
                  className="w-full h-14 text-lg bg-secondary hover:bg-secondary/80 border-4 border-secondary-foreground text-secondary-foreground font-bold"
                >
                  <Icon name="Settings" className="mr-3" size={20} />
                  {t.settings}
                </Button>
                
                <Button
                  onClick={() => {
                    setGameState('menu');
                    setScore(0);
                    setPlayer(prev => ({ ...prev, health: 3, x: 400, y: 550 }));
                    setEnemies([]);
                    setBullets([]);
                  }}
                  className="w-full h-14 text-lg bg-muted hover:bg-muted/80 border-4 border-foreground text-foreground font-bold"
                >
                  <Icon name="Home" className="mr-3" size={20} />
                  {t.backToMenu}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
