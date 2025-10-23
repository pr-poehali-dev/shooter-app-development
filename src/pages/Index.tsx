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
    gameTitle: 'METAL SHOOTER',
    score: 'СЧЕТ',
    health: 'HP',
    paused: 'ПАУЗА'
  },
  en: {
    play: 'PLAY',
    settings: 'SETTINGS',
    exit: 'EXIT',
    continue: 'CONTINUE',
    backToMenu: 'BACK TO MENU',
    language: 'LANGUAGE',
    gameTitle: 'METAL SHOOTER',
    score: 'SCORE',
    health: 'HP',
    paused: 'PAUSED'
  }
};

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityY: number;
  velocityX: number;
  isJumping: boolean;
  health: number;
  direction: number;
}

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityX: number;
  health: number;
  type: 'ground' | 'drone';
}

interface Bullet {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityX: number;
  active: boolean;
}

interface Explosion {
  x: number;
  y: number;
  frame: number;
}

const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const PLAYER_SPEED = 4;

const Index = () => {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [language, setLanguage] = useState<Language>('ru');
  const [score, setScore] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const keysPressed = useRef<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const lastShotTime = useRef<number>(0);
  
  const [player, setPlayer] = useState<Player>({
    x: 100,
    y: 300,
    width: 24,
    height: 32,
    velocityY: 0,
    velocityX: 0,
    isJumping: false,
    health: 100,
    direction: 1
  });

  const platformsRef = useRef<Platform[]>([
    { x: 0, y: 550, width: 300, height: 50 },
    { x: 350, y: 450, width: 150, height: 20 },
    { x: 550, y: 350, width: 150, height: 20 },
    { x: 200, y: 250, width: 120, height: 20 },
    { x: 700, y: 550, width: 900, height: 50 }
  ]);

  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [explosions, setExplosions] = useState<Explosion[]>([]);

  const t = translations[language];

  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const spawnEnemies = useCallback(() => {
    const newEnemies: Enemy[] = [
      { x: 600, y: 518, width: 24, height: 32, velocityX: -1, health: 50, type: 'ground' },
      { x: 900, y: 518, width: 24, height: 32, velocityX: -1, health: 50, type: 'ground' },
      { x: 400, y: 200, width: 32, height: 24, velocityX: 2, health: 30, type: 'drone' },
      { x: 700, y: 150, width: 32, height: 24, velocityX: -2, health: 30, type: 'drone' }
    ];
    setEnemies(newEnemies);
  }, []);

  const shoot = useCallback(() => {
    const now = Date.now();
    if (now - lastShotTime.current < 200) return;
    lastShotTime.current = now;

    const newBullet: Bullet = {
      x: player.x + (player.direction > 0 ? player.width : 0),
      y: player.y + player.height / 2,
      width: 8,
      height: 3,
      velocityX: player.direction * 12,
      active: true
    };
    setBullets(prev => [...prev, newBullet]);
  }, [player]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.key.toLowerCase());
      
      if ((e.key === ' ' || e.key.toLowerCase() === 'j') && gameState === 'playing') {
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

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameCount = 0;

    const gameLoop = () => {
      frameCount++;
      
      ctx.fillStyle = '#1a0a0a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#0a0a1a');
      gradient.addColorStop(0.5, '#2a0a0a');
      gradient.addColorStop(1, '#3a1a0a');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#3a2a2a';
      for (let i = 0; i < 20; i++) {
        const x = (i * 60 + frameCount * 0.3) % canvas.width;
        ctx.fillRect(x, canvas.height - 80, 40, 80);
      }

      platformsRef.current.forEach(platform => {
        ctx.fillStyle = '#4a3a2a';
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        ctx.fillStyle = '#6a4a2a';
        ctx.fillRect(platform.x, platform.y, platform.width, 4);
        
        for (let i = 0; i < platform.width; i += 20) {
          ctx.fillStyle = '#3a2a1a';
          ctx.fillRect(platform.x + i, platform.y + 4, 2, platform.height - 4);
        }
      });

      setPlayer(prev => {
        const newPlayer = { ...prev };
        
        if (keysPressed.current.has('a') || keysPressed.current.has('arrowleft')) {
          newPlayer.velocityX = -PLAYER_SPEED;
          newPlayer.direction = -1;
        } else if (keysPressed.current.has('d') || keysPressed.current.has('arrowright')) {
          newPlayer.velocityX = PLAYER_SPEED;
          newPlayer.direction = 1;
        } else {
          newPlayer.velocityX = 0;
        }

        if ((keysPressed.current.has('w') || keysPressed.current.has('arrowup') || keysPressed.current.has(' ')) && !newPlayer.isJumping) {
          newPlayer.velocityY = JUMP_FORCE;
          newPlayer.isJumping = true;
        }

        newPlayer.velocityY += GRAVITY;
        newPlayer.x += newPlayer.velocityX;
        newPlayer.y += newPlayer.velocityY;

        newPlayer.x = Math.max(0, Math.min(canvas.width - newPlayer.width, newPlayer.x));

        let onGround = false;
        platformsRef.current.forEach(platform => {
          if (
            newPlayer.x + newPlayer.width > platform.x &&
            newPlayer.x < platform.x + platform.width &&
            newPlayer.y + newPlayer.height >= platform.y &&
            newPlayer.y + newPlayer.height <= platform.y + platform.height &&
            newPlayer.velocityY >= 0
          ) {
            newPlayer.y = platform.y - newPlayer.height;
            newPlayer.velocityY = 0;
            newPlayer.isJumping = false;
            onGround = true;
          }
        });

        if (newPlayer.y > canvas.height) {
          newPlayer.health = 0;
        }

        return newPlayer;
      });

      ctx.fillStyle = '#00FFFF';
      ctx.fillRect(player.x, player.y, player.width, player.height);
      
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(player.x + (player.direction > 0 ? player.width - 4 : 0), player.y + 12, 8, 4);
      
      ctx.fillStyle = '#FFaa00';
      const legOffset = Math.sin(frameCount * 0.2) * 2;
      ctx.fillRect(player.x + 4, player.y + player.height - 8, 6, 8 + legOffset);
      ctx.fillRect(player.x + 14, player.y + player.height - 8, 6, 8 - legOffset);

      setBullets(prev => {
        const updated = prev
          .map(bullet => ({ ...bullet, x: bullet.x + bullet.velocityX }))
          .filter(bullet => bullet.x > -bullet.width && bullet.x < canvas.width + bullet.width);
        
        updated.forEach(bullet => {
          ctx.fillStyle = '#FFFF00';
          ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
          
          ctx.fillStyle = '#FFaa00';
          ctx.fillRect(bullet.x - 2, bullet.y, 2, bullet.height);
        });
        
        return updated;
      });

      setEnemies(prev => {
        const updated = prev.filter(enemy => {
          if (enemy.type === 'ground') {
            enemy.x += enemy.velocityX;
            
            if (enemy.x < 300 || enemy.x > 1400) {
              enemy.velocityX *= -1;
            }

            let onPlatform = false;
            platformsRef.current.forEach(platform => {
              if (
                enemy.x + enemy.width > platform.x &&
                enemy.x < platform.x + platform.width &&
                enemy.y + enemy.height >= platform.y &&
                enemy.y + enemy.height <= platform.y + 20
              ) {
                enemy.y = platform.y - enemy.height;
                onPlatform = true;
              }
            });
          } else {
            enemy.x += enemy.velocityX;
            enemy.y += Math.sin(frameCount * 0.05 + enemy.x * 0.01) * 1;
            
            if (enemy.x < 200 || enemy.x > 1000) {
              enemy.velocityX *= -1;
            }
          }

          const hitByBullet = bullets.some(bullet => 
            bullet.x < enemy.x + enemy.width &&
            bullet.x + bullet.width > enemy.x &&
            bullet.y < enemy.y + enemy.height &&
            bullet.y + bullet.height > enemy.y
          );

          if (hitByBullet) {
            enemy.health -= 25;
            setBullets(b => b.filter(bullet => 
              !(bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y)
            ));
            
            if (enemy.health <= 0) {
              setScore(s => s + (enemy.type === 'drone' ? 20 : 10));
              setExplosions(exp => [...exp, { x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2, frame: 0 }]);
              return false;
            }
          }

          const hitPlayer = 
            player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y;

          if (hitPlayer && frameCount % 30 === 0) {
            setPlayer(p => ({ ...p, health: p.health - 5 }));
          }

          if (enemy.type === 'ground') {
            ctx.fillStyle = '#FF3300';
            ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(enemy.x + (enemy.velocityX < 0 ? 4 : enemy.width - 8), enemy.y + 8, 6, 3);
            
            ctx.fillStyle = '#aa2200';
            ctx.fillRect(enemy.x + 6, enemy.y + enemy.height - 10, 6, 10);
            ctx.fillRect(enemy.x + 12, enemy.y + enemy.height - 10, 6, 10);
          } else {
            ctx.fillStyle = '#8800FF';
            ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(enemy.x + 12, enemy.y + 10, 8, 4);
            
            ctx.fillStyle = '#6600cc';
            ctx.fillRect(enemy.x + 6, enemy.y - 4, 4, 4);
            ctx.fillRect(enemy.x + 22, enemy.y - 4, 4, 4);
          }

          ctx.fillStyle = '#FF0000';
          ctx.fillRect(enemy.x, enemy.y - 8, enemy.width, 4);
          ctx.fillStyle = '#00FF00';
          ctx.fillRect(enemy.x, enemy.y - 8, enemy.width * (enemy.health / (enemy.type === 'drone' ? 30 : 50)), 4);

          return enemy.health > 0;
        });

        if (updated.length === 0 && frameCount % 300 === 0) {
          spawnEnemies();
        }

        return updated;
      });

      setExplosions(prev => {
        return prev.filter(exp => {
          exp.frame++;
          const size = exp.frame * 4;
          const alpha = 1 - exp.frame / 10;
          
          ctx.fillStyle = `rgba(255, ${150 - exp.frame * 15}, 0, ${alpha})`;
          ctx.fillRect(exp.x - size / 2, exp.y - size / 2, size, size);
          
          ctx.fillStyle = `rgba(255, 255, 0, ${alpha * 0.7})`;
          ctx.fillRect(exp.x - size / 3, exp.y - size / 3, size / 1.5, size / 1.5);
          
          return exp.frame < 10;
        });
      });

      if (player.health <= 0) {
        setGameState('menu');
        setPlayer({ x: 100, y: 300, width: 24, height: 32, velocityY: 0, velocityX: 0, isJumping: false, health: 100, direction: 1 });
        setScore(0);
        setEnemies([]);
        setBullets([]);
        setExplosions([]);
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
  }, [gameState, player, bullets, shoot, spawnEnemies]);

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setPlayer({ x: 100, y: 300, width: 24, height: 32, velocityY: 0, velocityX: 0, isJumping: false, health: 100, direction: 1 });
    setEnemies([]);
    setBullets([]);
    setExplosions([]);
    spawnEnemies();
  };

  const exitGame = () => {
    if (typeof window !== 'undefined') {
      window.close();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a0a1a] via-[#1a0a0a] to-[#0a0a0a] p-4">
      <div className="relative w-full max-w-6xl">
        {gameState === 'menu' && (
          <div className="animate-fade-in">
            <Card className="bg-card/90 backdrop-blur-sm border-4 border-primary p-8 space-y-8">
              <h1 className="text-5xl md:text-7xl text-center text-primary mb-8 drop-shadow-[0_0_20px_rgba(255,50,0,0.9)] font-bold tracking-wider">
                {t.gameTitle}
              </h1>
              
              <div className="space-y-4 max-w-md mx-auto">
                <Button
                  onClick={startGame}
                  className="w-full h-16 text-xl bg-primary hover:bg-primary/80 border-4 border-primary-foreground text-primary-foreground font-bold shadow-[0_0_20px_rgba(255,50,0,0.7)] hover:shadow-[0_0_30px_rgba(255,50,0,1)] transition-all"
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
            <Card className="bg-card/90 backdrop-blur-sm border-4 border-secondary p-8 space-y-6">
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
            <div className="flex justify-between items-center text-foreground text-base md:text-xl px-4 bg-black/50 p-4 rounded-lg border-2 border-primary">
              <div className="flex items-center gap-3">
                <Icon name="Target" size={24} className="text-accent" />
                <span className="font-bold">{t.score}: {score}</span>
              </div>
              <div className="flex items-center gap-3">
                <Icon name="Heart" size={24} className="text-primary" />
                <div className="w-48 h-6 bg-muted rounded-full border-2 border-primary overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-accent via-primary to-destructive transition-all duration-300"
                    style={{ width: `${player.health}%` }}
                  />
                </div>
                <span className="font-bold">{player.health}</span>
              </div>
            </div>
            
            <div className="border-4 border-primary shadow-[0_0_30px_rgba(255,50,0,0.5)] rounded-lg overflow-hidden">
              <canvas
                ref={canvasRef}
                width={1200}
                height={600}
                className="w-full bg-[#0a0a1a]"
              />
            </div>

            <div className="text-center text-muted-foreground text-xs md:text-sm space-y-1 bg-black/50 p-3 rounded-lg">
              {isMobile ? (
                <>
                  <p>УПРАВЛЕНИЕ: КНОПКИ ВНИЗУ ЭКРАНА</p>
                  <p>СТРЕЛКИ - ДВИЖЕНИЕ | ОГОНЬ - ВЫСТРЕЛ | ПРЫЖОК - ↑</p>
                </>
              ) : (
                <>
                  <p>A/D или ← → - ДВИЖЕНИЕ | W/↑/ПРОБЕЛ - ПРЫЖОК</p>
                  <p>J или ПРОБЕЛ (долгое) - ВЫСТРЕЛ | ESC - ПАУЗА</p>
                </>
              )}
            </div>

            {isMobile && (
              <div className="fixed bottom-4 left-0 right-0 flex justify-between items-end px-4 gap-4 z-50">
                <div className="flex gap-2">
                  <div className="flex flex-col gap-2">
                    <Button
                      onTouchStart={() => keysPressed.current.add('w')}
                      onTouchEnd={() => keysPressed.current.delete('w')}
                      className="w-14 h-14 bg-accent hover:bg-accent/80 border-4 border-accent-foreground text-accent-foreground font-bold shadow-[0_0_15px_rgba(0,255,0,0.7)] active:scale-95 transition-all p-0"
                    >
                      <Icon name="ChevronUp" size={28} />
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        onTouchStart={() => keysPressed.current.add('a')}
                        onTouchEnd={() => keysPressed.current.delete('a')}
                        className="w-14 h-14 bg-secondary hover:bg-secondary/80 border-4 border-secondary-foreground text-secondary-foreground font-bold shadow-[0_0_15px_rgba(0,255,255,0.7)] active:scale-95 transition-all p-0"
                      >
                        <Icon name="ChevronLeft" size={28} />
                      </Button>
                      <Button
                        onTouchStart={() => keysPressed.current.add('d')}
                        onTouchEnd={() => keysPressed.current.delete('d')}
                        className="w-14 h-14 bg-secondary hover:bg-secondary/80 border-4 border-secondary-foreground text-secondary-foreground font-bold shadow-[0_0_15px_rgba(0,255,255,0.7)] active:scale-95 transition-all p-0"
                      >
                        <Icon name="ChevronRight" size={28} />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={shoot}
                    className="w-20 h-20 rounded-full bg-primary hover:bg-primary/80 border-4 border-primary-foreground text-primary-foreground font-bold shadow-[0_0_20px_rgba(255,50,0,0.8)] active:scale-95 transition-all"
                  >
                    <Icon name="Crosshair" size={36} />
                  </Button>
                  <Button
                    onClick={() => setGameState('paused')}
                    className="w-16 h-16 rounded-full bg-muted hover:bg-muted/80 border-4 border-foreground text-foreground font-bold active:scale-95 transition-all self-end"
                  >
                    <Icon name="Pause" size={24} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {gameState === 'paused' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in z-50">
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
                    setPlayer({ x: 100, y: 300, width: 24, height: 32, velocityY: 0, velocityX: 0, isJumping: false, health: 100, direction: 1 });
                    setEnemies([]);
                    setBullets([]);
                    setExplosions([]);
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
