import React, { useEffect, useRef, useState } from "react";
import { 
  createInferenceAI, 
  DodgerAI,
  GameState
} from "./ai/DodgerAI";
import { 
  EnemySpawnSystem, 
  createSpawnSystem, 
  GlobalSeedManager, 
  GAME_SEEDS 
} from "./game/EnemySpawnSystem";

interface PvAIGameProps {
  onBack: () => void;
}

export function PvAIGame({ onBack }: PvAIGameProps) {
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAIScore] = useState(0);
  const [winner, setWinner] = useState<'player' | 'ai' | null>(null);
  
  // 最佳分数记录
  const [bestPlayerPvAI, setBestPlayerPvAI] = useState<number>(0);
  const [bestAIPvAI, setBestAIPvAI] = useState<number>(0);

  // AI实例 - 仅推理模式
  const aiRef = useRef<DodgerAI>(createInferenceAI());
  const [hasCustomWeights, setHasCustomWeights] = useState(false);
  const aiDecideCDRef = useRef(0);

  // 敌人生成系统 - 双方共享一个系统
  const spawnSystemRef = useRef<EnemySpawnSystem | null>(null);

  // 画布
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const playerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const aiCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const reqRef = useRef<number | null>(null);
  const lastTsRef = useRef<number>(0);
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  // 文件导入引用 - 移除了导入AI权重功能
  // const fileRef = useRef<HTMLInputElement | null>(null);

  // 双重游戏状态
  const playerStateRef = useRef<GameState>({
    width: 480,
    height: 560,
    player: { x: 240, y: 280, r: 12, speed: 300 },
    playerVel: { x: 0, y: 0 },
    hazards: [],
    pickups: [],
    elapsed: 0,
    lives: 3,
    maxLives: 3,
  });

  const aiStateRef = useRef<GameState>({
    width: 480,
    height: 560,
    player: { x: 240, y: 280, r: 12, speed: 300 },
    playerVel: { x: 0, y: 0 },
    hazards: [],
    pickups: [],
    elapsed: 0,
    lives: 3,
    maxLives: 3,
  });

  // 扩展状态
  const playerGameRef = useRef({
    spawnCooldown: 0,
    pickupSpawnCooldown: 4,
    over: false,
    hitIFrames: 0,
  });

  const aiGameRef = useRef({
    spawnCooldown: 0,
    pickupSpawnCooldown: 4,
    over: false,
    hitIFrames: 0,
  });

  // 键盘控制
  const keysRef = useRef<Record<string, boolean>>({});
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = true; };
    const onUp = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, []);

  // 初始化AI和加载最佳分数
  useEffect(() => {
    async function initializeAI() {
      // 首先尝试从预设文件加载权重
      const presetLoaded = await aiRef.current.loadFromPresetFile();
      if (presetLoaded) {
        setHasCustomWeights(true);
        console.log("✅ PvAI模式已加载预设AI权重");
      } else {
        // 如果预设文件加载失败，尝试从本地存储加载
        const storageLoaded = aiRef.current.loadFromStorage();
        setHasCustomWeights(storageLoaded);
        if (!storageLoaded) {
          console.log("⚠️ 使用默认启发式权重");
        }
      }
    }
    
    initializeAI();
    
    // 加载人机对战模式的最佳分数
    const savedBestPlayerPvAI = localStorage.getItem('dodger_best_player_pvai_v1');
    const savedBestAIPvAI = localStorage.getItem('dodger_best_ai_pvai_v1');
    
    if (savedBestPlayerPvAI) {
      setBestPlayerPvAI(parseFloat(savedBestPlayerPvAI) || 0);
    }
    if (savedBestAIPvAI) {
      setBestAIPvAI(parseFloat(savedBestAIPvAI) || 0);
    }
  }, []);

  // 自适应尺寸
  useEffect(() => {
    const handleResize = () => {
      const wrap = wrapperRef.current;
      if (!wrap || !playerCanvasRef.current || !aiCanvasRef.current) return;
      
      const rect = wrap.getBoundingClientRect();
      const w = Math.max(320, Math.floor(rect.width / 2 - 20));
      const h = Math.max(420, Math.floor(rect.height - 160));
      
      playerStateRef.current.width = w;
      playerStateRef.current.height = h;
      aiStateRef.current.width = w;
      aiStateRef.current.height = h;
      
      [playerCanvasRef.current, aiCanvasRef.current].forEach(cvs => {
        if (cvs) {
          cvs.width = Math.floor(w * dpr);
          cvs.height = Math.floor(h * dpr);
          const ctx = cvs.getContext('2d');
          if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
      });
    };
    
    handleResize();
    const ro = new ResizeObserver(handleResize);
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, [dpr]);

  // 游戏逻辑函数
  function difficulty(elapsed: number) { return elapsed / 12; }

  // 使用新的敌人维持系统
  function maintainEnemies(state: GameState) {
    const spawnSystem = spawnSystemRef.current;
    if (!spawnSystem) {
      console.warn("⚠️ 敌人生成系统未初始化");
      return;
    }

    // 使用新的维持敌人数量方法
    spawnSystem.maintainEnemyCount(state);
  }

  function spawnHeartAt(state: GameState, x?: number, y?: number) {
    const { width: W, height: H } = state;
    const pBias = state.lives < state.maxLives ? 1 : 0.4;
    if (Math.random() > 0.55 * pBias) return;
    const px = x ?? Math.random() * (W - 120) + 60;
    const py = y ?? Math.random() * (H - 120) + 60;
    state.pickups.push({
      x: px, y: py, r: 10, life: 6, maxLife: 6, type: 'heart'
    });
  }

  function playerHit(state: GameState, gameState: any, isAI: boolean = false) {
    if (gameState.hitIFrames > 0 || gameState.over) return;
    
    state.lives = Math.max(0, state.lives - 1); 
    gameState.hitIFrames = 1.2;
    
    if (state.lives <= 0) {
      gameState.over = true;
      
      // 检查游戏结束条件
      const playerGame = playerGameRef.current;
      const aiGame = aiGameRef.current;
      
      if (playerGame.over && aiGame.over) {
        // 双方都死亡，比较分数
        if (playerStateRef.current.elapsed > aiStateRef.current.elapsed) {
          setWinner('player');
        } else if (aiStateRef.current.elapsed > playerStateRef.current.elapsed) {
          setWinner('ai');
        } else {
          setWinner(null); // 平局
        }
        setGameOver(true);
      } else if (playerGame.over && !aiGame.over) {
        setWinner('ai');
        setGameOver(true);
      } else if (aiGame.over && !playerGame.over) {
        setWinner('player');
        setGameOver(true);
      }
    }
  }

  function updateState(state: GameState, gameState: any, dt: number, mvx: number, mvy: number, speedMultiplier: number, isAI: boolean = false) {
    if (gameState.over) return;
    
    state.elapsed += dt; 
    gameState.hitIFrames = Math.max(0, gameState.hitIFrames - dt);

    // 敌人数量维持系统 - 定期检查
    gameState.spawnCooldown -= dt;
    if (gameState.spawnCooldown <= 0) {
      gameState.spawnCooldown = 0.5; // 每0.5秒检查一次敌人数量
      maintainEnemies(state);
    }
    
    gameState.pickupSpawnCooldown -= dt; 
    if (gameState.pickupSpawnCooldown <= 0) { 
      gameState.pickupSpawnCooldown = 3.0 + Math.random() * 2.2; 
      spawnHeartAt(state); 
    }

    // 物理 - 使用动态速度控制
    const P = state.player; 
    const baseDifficultySpeedMultiplier = (1 + Math.min(0.6, difficulty(state.elapsed) * 0.09)); 
    const finalSpeed = P.speed * baseDifficultySpeedMultiplier * speedMultiplier; // 基础速度 * 难度倍率 * 动态速度倍率
    
    const len = Math.hypot(mvx, mvy) || 1; 
    const vx = (mvx / len) * finalSpeed; 
    const vy = (mvy / len) * finalSpeed; 
    state.playerVel.x = vx; 
    state.playerVel.y = vy; 
    P.x = Math.max(P.r, Math.min(state.width - P.r, P.x + vx * dt)); 
    P.y = Math.max(P.r, Math.min(state.height - P.r, P.y + vy * dt));

    // 敌人
    const remainHaz = [];
    for (const h of state.hazards) {
      h.t += dt;
      if (h.kind === 'tracker') {
        const tx = state.player.x - h.x; 
        const ty = state.player.y - h.y; 
        const tlen = Math.hypot(tx, ty) || 1; 
        const dx = tx / tlen, dy = ty / tlen; 
        const dot = h.dirX * dx + h.dirY * dy; 
        const theta = Math.acos(Math.max(-1, Math.min(1, dot)));
        const maxTurn = (h.turnRate ?? Math.PI) * dt; 
        if (theta > 1e-4) { 
          const k = Math.min(1, maxTurn / theta); 
          h.dirX = (1 - k) * h.dirX + k * dx; 
          h.dirY = (1 - k) * h.dirY + k * dy; 
          const n = Math.hypot(h.dirX, h.dirY) || 1; 
          h.dirX /= n; 
          h.dirY /= n; 
        }
      }
      let effVX = h.dirX * h.baseSpeed; 
      let effVY = h.dirY * h.baseSpeed;
      if (h.kind === 'zigzag') { 
        const pxn = -h.dirY, pyn = h.dirX; 
        const osc = Math.sin(h.t * h.zigFreq) * h.zigAmp; 
        effVX += pxn * osc; 
        effVY += pyn * osc; 
      }
      h.x += effVX * dt; 
      h.y += effVY * dt; 
      h.life -= dt;
      if (h.x < -64 || h.x > state.width + 64 || h.y < -64 || h.y > state.height + 64 || h.life <= 0) continue;
      remainHaz.push(h);
    }
    state.hazards = remainHaz;

    // 道具
    const remainPick = [];
    for (const p of state.pickups) { 
      p.life -= dt; 
      if (p.life > 0) remainPick.push(p); 
    }
    state.pickups = remainPick;

    // 碰撞
    if (gameState.hitIFrames <= 0) {
      for (const h of state.hazards) { 
        const d = Math.hypot(h.x - state.player.x, h.y - state.player.y); 
        if (d <= h.r + state.player.r) { 
          playerHit(state, gameState, isAI); 
          break; 
        } 
      }
    }

    // 拾取
    if (!gameState.over) {
      const rest = [];
      for (const p of state.pickups) {
        const d = Math.hypot(p.x - state.player.x, p.y - state.player.y);
        if (d <= p.r + state.player.r) {
          if (p.type === 'heart') {
            state.lives = Math.min(state.maxLives, state.lives + 1);
          }
        } else { 
          rest.push(p); 
        }
      }
      state.pickups = rest;
    }
  }

  function update(dt: number) {
    // 更新敌人生成系统时间（全局）
    if (spawnSystemRef.current) {
      spawnSystemRef.current.updateTime(dt);
    }

    // 玩家控制
    let playerMvx = 0, playerMvy = 0, playerSpeedMultiplier = 1.0;
    const K = keysRef.current; 
    if(K['arrowleft'] || K['a']) playerMvx -= 1; 
    if(K['arrowright'] || K['d']) playerMvx += 1; 
    if(K['arrowup'] || K['w']) playerMvy -= 1; 
    if(K['arrowdown'] || K['s']) playerMvy += 1;
    // 玩家使用固定速度倍率
    playerSpeedMultiplier = (playerMvx !== 0 || playerMvy !== 0) ? 1.0 : 0.0;

    // AI 控制 - 使用封装的AI模块 + 动态速度控制
    let aiMvx = 0, aiMvy = 0, aiSpeedMultiplier = 0.0;
    aiDecideCDRef.current -= dt;
    if (aiDecideCDRef.current <= 0) {
      aiDecideCDRef.current = 0.04; // 25fps决策频率
      
      const diff = difficulty(aiStateRef.current.elapsed);
      // 推理模式：不使用探索
      const decision = aiRef.current.decide(aiStateRef.current, diff, false);
      aiMvx = decision.mvx;
      aiMvy = decision.mvy;
      aiSpeedMultiplier = decision.speed; // 使用AI的动态速度控制
    }

    // 更新双方状态 - 传入各自的速度倍率
    updateState(playerStateRef.current, playerGameRef.current, dt, playerMvx, playerMvy, playerSpeedMultiplier, false);
    updateState(aiStateRef.current, aiGameRef.current, dt, aiMvx, aiMvy, aiSpeedMultiplier, true);

    // 更新分数显示和最佳分数记录
    setPlayerScore(playerStateRef.current.elapsed);
    setAIScore(aiStateRef.current.elapsed);
    
    // 实时更新最佳分数
    if (playerStateRef.current.elapsed > bestPlayerPvAI) {
      setBestPlayerPvAI(playerStateRef.current.elapsed);
      localStorage.setItem('dodger_best_player_pvai_v1', String(playerStateRef.current.elapsed));
    }
    
    if (aiStateRef.current.elapsed > bestAIPvAI) {
      setBestAIPvAI(aiStateRef.current.elapsed);
      localStorage.setItem('dodger_best_ai_pvai_v1', String(aiStateRef.current.elapsed));
    }
  }

  // 绘制函数
  function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, filled: boolean, color: string = '#f43f5e') {
    ctx.save(); 
    ctx.translate(x, y); 
    ctx.beginPath(); 
    ctx.moveTo(0, size * 0.25); 
    ctx.bezierCurveTo(0, 0, -size * 0.5, 0, -size * 0.5, size * 0.25); 
    ctx.bezierCurveTo(-size * 0.5, size * 0.55, 0, size * 0.9, 0, size * 1.1); 
    ctx.bezierCurveTo(0, size * 0.9, size * 0.5, size * 0.55, size * 0.5, size * 0.25); 
    ctx.bezierCurveTo(size * 0.5, 0, 0, 0, 0, size * 0.25); 
    ctx.closePath(); 
    if (filled) { 
      ctx.fillStyle = color; 
      ctx.fill(); 
      ctx.lineWidth = 1; 
      ctx.strokeStyle = '#94a3b8'; 
      ctx.stroke(); 
    } else { 
      ctx.lineWidth = 1.5; 
      ctx.strokeStyle = '#475569'; 
      ctx.stroke(); 
    } 
    ctx.restore();
  }

  function drawGame(canvas: HTMLCanvasElement, state: GameState, gameState: any, title: string, isAI: boolean = false) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { width: W, height: H } = state;

    // 背景
    const g = ctx.createLinearGradient(0, 0, 0, H); 
    g.addColorStop(0, '#0b1220'); 
    g.addColorStop(1, '#0a0f1a'); 
    ctx.fillStyle = g; 
    ctx.fillRect(0, 0, W, H);
    
    // 网格
    ctx.globalAlpha = 0.08 + Math.min(0.12, difficulty(state.elapsed) * 0.02); 
    ctx.strokeStyle = '#64748b'; 
    ctx.lineWidth = 1; 
    ctx.beginPath(); 
    for(let x = 0; x <= W; x += 40){ 
      ctx.moveTo(x + 0.5, 0); 
      ctx.lineTo(x + 0.5, H);
    } 
    for(let y = 0; y <= H; y += 40){ 
      ctx.moveTo(0, y + 0.5); 
      ctx.lineTo(W, y + 0.5);
    } 
    ctx.stroke(); 
    ctx.globalAlpha = 1;

    // 玩家
    const P = state.player; 
    const flicker = gameState.hitIFrames > 0 ? (Math.sin(state.elapsed * 25) > 0 ? 0.4 : 1) : 1; 
    ctx.globalAlpha = flicker; 
    ctx.fillStyle = '#22d3ee'; 
    ctx.beginPath(); 
    ctx.arc(P.x, P.y, P.r, 0, Math.PI * 2); 
    ctx.fill(); 
    ctx.globalAlpha = 1;

    // 道具
    for (const p of state.pickups) { 
      const remaining = p.life; 
      const blink = remaining <= 2; 
      const alpha = !blink ? 1 : (Math.sin((2 - remaining) * 14) > 0 ? 0.35 : 1); 
      ctx.globalAlpha = Math.max(0.25, alpha); 
      drawHeart(ctx, p.x, p.y, 12, true, '#22c55e'); 
      ctx.globalAlpha = 1; 
    }

    // 敌人
    for (const h of state.hazards) { 
      ctx.fillStyle = (h.kind === 'tracker') ? '#8b5cf6' : '#fb7185'; 
      ctx.beginPath(); 
      ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2); 
      ctx.fill(); 
    }

    // 生命值
    const padX = 8, padY = 8, heartSize = 8, gap = 18; 
    for(let i = 0; i < state.maxLives; i++){ 
      const filled = i < state.lives; 
      drawHeart(ctx, padX + i * gap, padY, heartSize, filled, '#f43f5e'); 
    }

    // 标题、分数和敌人数量
    ctx.fillStyle = '#e2e8f0'; 
    ctx.font = '600 14px ui-sans-serif,system-ui,-apple-system'; 
    ctx.textAlign = 'center';
    ctx.fillText(title, W / 2, 25);
    ctx.fillText(`Score: ${state.elapsed.toFixed(2)}s`, W / 2, H - 45);
    ctx.fillText(`Enemies: ${state.hazards.length}`, W / 2, H - 25);
    
    // 显示AI动态速度（仅AI侧）
    if (isAI) {
      const speedRatio = Math.hypot(state.playerVel.x, state.playerVel.y) / state.player.speed;
      ctx.fillText(`Speed: ${speedRatio.toFixed(2)}x`, W / 2, H - 5);
    }
    
    ctx.textAlign = 'left';

    // 游戏结束
    if (gameState.over) { 
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; 
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#e2e8f0'; 
      ctx.font = '700 20px ui-sans-serif,system-ui,-apple-system'; 
      ctx.textAlign = 'center'; 
      ctx.fillText('Game Over', W / 2, H / 2); 
      ctx.textAlign = 'left'; 
    }
  }

  // 渲染循环
  const loop = (ts: number) => { 
    if (!running) { 
      lastTsRef.current = ts; 
      if (playerCanvasRef.current && aiCanvasRef.current) {
        drawGame(playerCanvasRef.current, playerStateRef.current, playerGameRef.current, '玩家', false);
        drawGame(aiCanvasRef.current, aiStateRef.current, aiGameRef.current, 'AI', true);
      }
      reqRef.current = requestAnimationFrame(loop); 
      return; 
    } 
    
    const dt = Math.min(0.05, (ts - lastTsRef.current) / 1000 || 0); 
    lastTsRef.current = ts; 
    update(dt); 
    
    if (playerCanvasRef.current && aiCanvasRef.current) {
      drawGame(playerCanvasRef.current, playerStateRef.current, playerGameRef.current, '玩家', false);
      drawGame(aiCanvasRef.current, aiStateRef.current, aiGameRef.current, 'AI', true);
    }
    
    reqRef.current = requestAnimationFrame(loop); 
  };
  
  useEffect(() => { 
    lastTsRef.current = performance.now(); 
    reqRef.current = requestAnimationFrame(loop); 
    return () => { 
      if (reqRef.current) cancelAnimationFrame(reqRef.current); 
    }; 
  }, [running]);

  function startGame() {
    // 使用预设权重文件，不再检查自定义权重
    if (!hasCustomWeights) {
      alert('AI权重加载失败！请确保预设权重文件存在。');
      return;
    }

    // 初始化敌人数量维持系统 - 人机对战使用独立的种子
    const seed = GlobalSeedManager.getSeed(GAME_SEEDS.PVAI_DUAL);
    spawnSystemRef.current = createSpawnSystem('pvai_dual', seed);
    console.log(`⚔️ 人机对战模式启动 - 敌人数量维持系统 + AI动态速度控制`);
    console.log(`🌟 特性：平衡的细化配置，双方共享同一敌人维持系统，AI具备动态速度优势`);

    // 重置双方状态
    [playerStateRef.current, aiStateRef.current].forEach(state => {
      state.player.x = state.width / 2; 
      state.player.y = state.height / 2; 
      state.playerVel.x = 0; 
      state.playerVel.y = 0; 
      state.hazards = []; 
      state.pickups = []; 
      state.elapsed = 0; 
      state.lives = state.maxLives;
    });

    [playerGameRef.current, aiGameRef.current].forEach(gameState => {
      gameState.spawnCooldown = 0.1; 
      gameState.pickupSpawnCooldown = 4; 
      gameState.over = false; 
      gameState.hitIFrames = 0;
    });

    setGameOver(false); 
    setWinner(null);
    setPlayerScore(0);
    setAIScore(0);
    setRunning(true); 
    lastTsRef.current = performance.now();
  }

  function stopGame() { 
    setRunning(false); 
    setGameOver(false); 
  }

  return (
    <div ref={wrapperRef} className="w-full h-full min-h-[560px] p-4 md:p-6 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto">
        {/* 顶部栏 */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 mb-4">
          <div className="text-2xl md:text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-300 to-pink-300">人机对战</div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="px-3 py-2 rounded-2xl bg-slate-800 text-slate-200 hover:bg-slate-700 text-sm font-semibold shadow"
            >
              返回
            </button>
          </div>
        </div>

        {/* 游戏区域 */}
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          {/* 玩家侧 */}
          <div className="rounded-2xl overflow-hidden ring-1 ring-slate-800 shadow-2xl bg-slate-950/60 backdrop-blur">
            <div className="px-3 py-2 flex items-center gap-2 bg-slate-900/50 border-b border-slate-800">
              <span className="text-sm font-medium text-cyan-300">玩家 (WASD/方向键)</span>
              <div className="ml-auto flex gap-1 opacity-70">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              </div>
            </div>
            <canvas ref={playerCanvasRef} className="w-full h-[50vh] min-h-[400px]" />
          </div>

          {/* AI侧 */}
          <div className="rounded-2xl overflow-hidden ring-1 ring-slate-800 shadow-2xl bg-slate-950/60 backdrop-blur">
            <div className="px-3 py-2 flex items-center gap-2 bg-slate-900/50 border-b border-slate-800">
              <span className="text-sm font-medium text-purple-300">AI对手 (动态速度)</span>
              <div className="ml-auto flex gap-1 opacity-70">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
              </div>
            </div>
            <canvas ref={aiCanvasRef} className="w-full h-[50vh] min-h-[400px]" />
          </div>
        </div>

        {/* 控制区 */}
        <div className="rounded-2xl ring-1 ring-slate-800 bg-slate-950/60 p-4 shadow-xl">
          <div className="flex flex-wrap items-center gap-4">
            {!running ? (
              <button onClick={startGame} className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-400 to-pink-500 text-white font-semibold shadow-lg hover:brightness-110">
                开始对战
              </button>
            ) : (
              gameOver ? (
                <button onClick={startGame} className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-400 to-pink-500 text-white font-semibold shadow-lg hover:brightness-110">
                  重新对战
                </button>
              ) : (
                <button onClick={stopGame} className="px-6 py-3 rounded-2xl bg-rose-400 text-slate-900 font-semibold shadow-lg hover:brightness-110">
                  结束对战
                </button>
              )
            )}
            
            {/* 删除了导入AI权重按钮 - 现在使用预设权重 */}

            {/* 对战状态 */}
            <div className="ml-auto flex items-center gap-6 text-sm">
              <div className="text-cyan-300">
                玩家: {playerScore.toFixed(2)}s (最佳: {bestPlayerPvAI.toFixed(2)}s)
              </div>
              <div className="text-purple-300">
                AI: {aiScore.toFixed(2)}s (最佳: {bestAIPvAI.toFixed(2)}s)
              </div>
              {spawnSystemRef.current && (
                <div className="text-slate-300">
                  目标敌人: {spawnSystemRef.current.getCurrentTargetCount()}
                </div>
              )}
              {gameOver && winner && (
                <div className={`font-bold px-3 py-1 rounded-full ${
                  winner === 'player' ? 'bg-cyan-400 text-slate-900' : 
                  winner === 'ai' ? 'bg-purple-400 text-white' : 
                  'bg-slate-600 text-slate-200'
                }`}>
                  {winner === 'player' ? '玩家胜利!' : winner === 'ai' ? 'AI胜利!' : '平局!'}
                </div>
              )}
            </div>
          </div>

          {/* 敌人数量维持系统 + AI动态速度说明 */}
          <div className="mt-3 p-3 bg-slate-800/30 rounded-xl text-sm text-slate-300">
            <div className="font-medium text-purple-300 mb-2">⚔️ 同步细化敌人维持 + ⚡ AI动态速度优势：</div>
            <div className="space-y-1">
              <div>• <span className="text-blue-300 font-medium">同步敌人系统</span> - 双方面临相同的敌人数量变化时间线</div>
              <div>• <span className="text-green-300 font-medium">细化平衡配置</span> - 专门为公平竞争优化的敌人配置</div>
              <div>• <span className="text-yellow-300 font-medium">0-5秒(4个) → 5-10秒(6个) → 10-15秒(8个) → 15-20秒(10个)</span></div>
              <div>• <span className="text-orange-300 font-medium">20秒后：每10秒+3个 → 60秒后每30秒+4个 → 120秒后速度递增</span></div>
              <div>• <span className="text-purple-300 font-medium">🚀 AI动态速度优势</span> - AI可根据威胁TTC、心形紧急度等自适应调速(0.7x-1.8x)</div>
              <div>• <span className="text-pink-300 font-medium">实时速度显示</span> - AI侧画布底部显示当前速度倍率，观察AI的智能调速决策</div>
              <div>• 画布底部显示当前敌人数量，系统自动维持目标数量</div>
            </div>
          </div>

          {/* 权重状态提示 */}
          <div className="mt-3 text-xs text-slate-400">
            {hasCustomWeights ? (
              <span className="text-green-400">✓ 已加载预设AI权重 | AI具备动态速度控制能力，可在危险时加速逃跑，安全时减速节能</span>
            ) : (
              <span className="text-amber-400">⚠️ 预设权重文件加载失败，请检查文件是否存在于 /src/components/ai/Dodger_AI_weights.json</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}