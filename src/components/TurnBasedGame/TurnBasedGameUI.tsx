import React from "react";
import { TurnRecord, Player, getTotalTime } from "../game/TurnBasedGameLogic";
import { GAME_CONFIG } from "../game/GameConstants";

interface TurnBasedGameUIProps {
  running: boolean;
  gameOver: boolean;
  currentPlayer: Player;
  currentTurnTime: number;
  finalTotalTime: number;
  turnHistory: TurnRecord[];
  hasCustomWeights: boolean;
  onBack: () => void;
  onStartGame: () => void;
  onStopGame: () => void;
  onSwitchPlayer: () => void; // 添加切换玩家函数
  // 移除了导入权重相关props
  canvasRef: React.RefObject<HTMLCanvasElement>;
  fileRef: React.RefObject<HTMLInputElement>; // 保留以保持向后兼容
  wrapperRef: React.RefObject<HTMLDivElement>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void; // 保留以保持向后兼容
}

export function TurnBasedGameUI({
  running,
  gameOver,
  currentPlayer,
  currentTurnTime,
  finalTotalTime,
  turnHistory,
  hasCustomWeights,
  onBack,
  onStartGame,
  onStopGame,
  onSwitchPlayer, // 添加切换玩家函数
  // 移除了onImportWeights
  canvasRef,
  fileRef,
  wrapperRef,
  onFileChange,
}: TurnBasedGameUIProps) {
  return (
    <div
      ref={wrapperRef}
      className="w-full h-full min-h-[560px] p-4 md:p-6 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100"
    >
      <div className="max-w-6xl mx-auto">
        <TopBar onBack={onBack} />
        
        <div className="grid gap-4">
          <GameCanvas canvasRef={canvasRef} />
          <ControlPanel
            running={running}
            gameOver={gameOver}
            currentPlayer={currentPlayer}
            currentTurnTime={currentTurnTime}
            hasCustomWeights={hasCustomWeights}
            onStartGame={onStartGame}
            onStopGame={onStopGame}
            onSwitchPlayer={onSwitchPlayer} // 添加切换函数
            // 移除了onImportWeights
            fileRef={fileRef}
            onFileChange={onFileChange}
          />
          <GameStatus
            running={running}
            gameOver={gameOver}
            currentPlayer={currentPlayer}
            currentTurnTime={currentTurnTime}
            finalTotalTime={finalTotalTime}
            turnHistory={turnHistory}
          />
          <GameDescription />
        </div>
      </div>
    </div>
  );
}

function TopBar({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 mb-4">
      <div className="text-2xl md:text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-orange-300 to-red-300">
        轮换游戏
      </div>
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
  );
}

function GameCanvas({ canvasRef }: { canvasRef: React.RefObject<HTMLCanvasElement> }) {
  return (
    <div className="rounded-2xl overflow-hidden ring-1 ring-slate-800 shadow-2xl bg-slate-950/60 backdrop-blur">
      <div className="px-3 py-2 flex items-center gap-2 bg-slate-900/50 border-b border-slate-800">
        <div className="ml-auto flex gap-1 opacity-70">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
        </div>
      </div>
      <canvas ref={canvasRef} className="w-full h-[60vh] min-h-[500px] block" />
    </div>
  );
}

interface ControlPanelProps {
  running: boolean;
  gameOver: boolean;
  currentPlayer: Player; // 添加当前玩家
  currentTurnTime: number; // 添加当前回合时间
  hasCustomWeights: boolean;
  onStartGame: () => void;
  onStopGame: () => void;
  onSwitchPlayer: () => void; // 添加切换函数
  fileRef: React.RefObject<HTMLInputElement>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function ControlPanel({
  running,
  gameOver,
  currentPlayer,
  currentTurnTime,
  hasCustomWeights,
  onStartGame,
  onStopGame,
  onSwitchPlayer,
  fileRef,
  onFileChange,
}: ControlPanelProps) {
  const canSwitch = running && !gameOver && currentTurnTime >= GAME_CONFIG.TURNBASED_SWITCH_THRESHOLD;
  
  return (
    <div className="rounded-2xl ring-1 ring-slate-800 bg-slate-950/60 p-4 flex flex-wrap gap-2 shadow-xl">
      {!running ? (
        <button
          onClick={onStartGame}
          className="px-4 py-2 rounded-2xl bg-gradient-to-r from-orange-400 to-red-500 text-white font-semibold shadow hover:brightness-110"
        >
          开始轮换游戏
        </button>
      ) : gameOver ? (
        <button
          onClick={onStartGame}
          className="px-4 py-2 rounded-2xl bg-gradient-to-r from-orange-400 to-red-500 text-white font-semibold shadow hover:brightness-110"
        >
          重新开始
        </button>
      ) : (
        <>
          <button
            onClick={onStopGame}
            className="px-4 py-2 rounded-2xl bg-rose-400 text-slate-900 font-semibold shadow hover:brightness-110"
          >
            结束游戏
          </button>
          
          {/* 添加切换按钮 */}
          {canSwitch && (
            <button
              onClick={onSwitchPlayer}
              className="px-4 py-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-purple-500 text-white font-semibold shadow hover:brightness-110"
            >
              切换到{currentPlayer === "human" ? "AI" : "玩家"}
            </button>
          )}
        </>
      )}
      
      {/* 删除了导入AI权重按钮 - 现在使用预设权重 */}
      
      {/* 保留隐藏的文件输入以维持向后兼容 */}
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={onFileChange}
      />
      
      <div className="ml-auto text-xs text-slate-400">
        {hasCustomWeights ? (
          <span className="text-green-400">✓ 已加载预设AI权重 | 与基础游玩模式敌人配置相同，无回复道具</span>
        ) : (
          <span className="text-amber-400">⚠️ 预设权重加载失败，使用默认启发式权重 | 与基础游玩模式敌人配置相同，无回复道具</span>
        )}
      </div>
    </div>
  );
}

interface GameStatusProps {
  running: boolean;
  gameOver: boolean;
  currentPlayer: Player;
  currentTurnTime: number;
  finalTotalTime: number;
  turnHistory: TurnRecord[];
}

function GameStatus({
  running,
  gameOver,
  currentPlayer,
  currentTurnTime,
  finalTotalTime,
  turnHistory,
}: GameStatusProps) {
  // 如果游戏结束且有最终时间，使用finalTotalTime；否则动态计算
  const totalTime = (gameOver && finalTotalTime > 0) 
    ? finalTotalTime 
    : getTotalTime(turnHistory, currentTurnTime);
  
  // 调试信息：打印总时间计算过程
  const historyTotal = turnHistory.reduce((sum, turn) => sum + turn.duration, 0);
  console.log(`🔢 总时间计算调试: 历史轮次数=${turnHistory.length}, 历史总时间=${historyTotal.toFixed(2)}s, 当前轮次=${currentTurnTime.toFixed(2)}s, 计算总时间=${totalTime.toFixed(2)}s`);
  
  return (
    <div className="rounded-2xl ring-1 ring-slate-800 bg-slate-950/60 p-4 shadow-xl">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-semibold mb-3 text-orange-300">当前状态</h3>
          <div className="space-y-2 text-sm">
            <div>
              当前玩家: 
              <span className={`ml-2 font-semibold ${
                currentPlayer === "human" ? "text-cyan-300" : "text-purple-300"
              }`}>
                {currentPlayer === "human" ? "玩家" : "AI"}
              </span>
            </div>
            <div>本轮时间: <span className="text-slate-300">{currentTurnTime.toFixed(2)}s</span></div>
            <div>总时间: <span className="text-slate-300">{totalTime.toFixed(2)}s</span></div>
            <div>轮次数: <span className="text-slate-300">{turnHistory.length + 1}</span></div>
            <div className="text-xs text-slate-500">
              调试: 运行={running ? "是" : "否"}, 结束={gameOver ? "是" : "否"}
            </div>
            <div className="text-xs text-slate-500">
              时间戳: {Date.now()} (用于验证更新)
            </div>
            {running && !gameOver && currentTurnTime >= GAME_CONFIG.TURNBASED_SWITCH_THRESHOLD && (
              <div className="text-green-400 font-semibold">✅ 可以轮换 (按空格键)</div>
            )}
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-3 text-orange-300">游戏记录</h3>
          <div className="h-48 overflow-y-auto space-y-1 text-sm border border-slate-700 rounded p-2 bg-slate-900/50">
            {turnHistory.length === 0 ? (
              <div className="text-slate-400 italic">暂无记录</div>
            ) : (
              <>
                {/* 显示历史轮次 */}
                {turnHistory.map((turn, index) => {
                  const cumulativeTime = turnHistory.slice(0, index + 1).reduce((sum, t) => sum + t.duration, 0);
                  return (
                    <div key={index} className="bg-slate-800/50 rounded p-2 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">第 {index + 1} 轮</span>
                        <span className={turn.qualified ? "text-green-400" : "text-red-400"}>
                          {turn.qualified ? "✓ 成功" : "✗ 失败"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className={turn.player === "human" ? "text-cyan-300" : "text-purple-300"}>
                          {turn.player === "human" ? "玩家" : "AI"}
                        </span>
                        <span className="text-slate-300">{turn.duration.toFixed(2)}s</span>
                      </div>
                      <div className="text-xs text-slate-400">
                        累计时间: {cumulativeTime.toFixed(2)}s
                      </div>
                    </div>
                  );
                })}
                
                {/* 显示当前轮次（如果游戏正在进行） */}
                {running && !gameOver && (
                  <div className="bg-blue-900/30 rounded p-2 space-y-1 border border-blue-500/30">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-300">第 {turnHistory.length + 1} 轮 (进行中)</span>
                      <span className="text-yellow-400">⏳ 进行中</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={currentPlayer === "human" ? "text-cyan-300" : "text-purple-300"}>
                        {currentPlayer === "human" ? "玩家" : "AI"}
                      </span>
                      <span className="text-slate-300">{currentTurnTime.toFixed(2)}s</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      当前总时间: {totalTime.toFixed(2)}s
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GameDescription() {
  return (
    <div className="rounded-2xl ring-1 ring-slate-800 bg-slate-950/60 p-3 shadow-xl">
      <div className="text-sm text-slate-300">
        <div className="font-medium text-orange-300 mb-2">🔄 轮换游戏规则（标准敌人配置 + 无回复道具）：</div>
        <div className="space-y-1">
          <div>• <span className="text-green-300 font-medium">敌人配置一致性</span> - 与基础游玩模式（页面1）使用完全相同的敌人配置</div>
          <div>• <span className="text-blue-300 font-medium">敌人数量时间线</span> - 0-5s(6个) → 5-10s(10个) → 10-15s(15个) → 15-20s(20个) → 后续递增</div>
          <div>• <span className="text-red-300 font-medium">❌ 无回复道具</span> - 轮换游戏中没有心形回复道具，增加挑战难度</div>
          <div>• <span className="text-purple-300 font-medium">轮换机制</span> - 存活超过5秒可传递给队友继续游戏</div>
          <div>• <span className="text-yellow-300 font-medium">失败条件</span> - 在5秒内死亡则游戏结束</div>
          <div>• <span className="text-cyan-300 font-medium">操作方式</span> - 玩家使用WASD/方向键，AI自动决策</div>
          <div>• <span className="text-orange-300 font-medium">切换操作</span> - 达到5秒后按空格键进行轮换</div>
          <div>• <span className="text-pink-300 font-medium">重置机制</span> - 每次轮换完全重置游戏状态和时间</div>
          <div>• <span className="text-indigo-300 font-medium">AI动态速度</span> - AI具备根据威胁情况自适应调速能力(0.7x-1.8x)</div>
        </div>
      </div>
    </div>
  );
}