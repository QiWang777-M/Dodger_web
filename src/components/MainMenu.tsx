import React from 'react';

interface MainMenuProps {
  onSelectMode: (mode: 'pvai' | 'turnbased') => void;
}

export function MainMenu({ onSelectMode }: MainMenuProps) {
  return (
    <div className="w-full h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex items-center justify-center">
      <div className="max-w-6xl mx-auto p-8 text-center">
        <div className="mb-12">
          <h1 className="text-6xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400 mb-6">
            Dodger🏃‍
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            体验最先进的AI强化学习躲避游戏，训练你的AI对手或与它对战
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* 人机对战 */}
          <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-purple-400/50">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-400/5 to-pink-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative p-8">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-slate-100">人机对战</h3>
              <p className="text-slate-300 mb-6 leading-relaxed">
                与训练好的AI进行实时对战。左右分屏显示，看看你能否战胜机器学习的力量！
              </p>
              <button
                onClick={() => onSelectMode('pvai')}
                className="w-full px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-400 to-pink-500 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:brightness-110"
              >
                挑战AI
              </button>
            </div>
          </div>

          {/* 轮换模式 */}
          <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-orange-400/50">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-400/5 to-red-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative p-8">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-slate-100">轮换模式</h3>
              <p className="text-slate-300 mb-6 leading-relaxed">
                玩家和AI轮流游玩，存活超过5秒可传递给队友。考验合作与策略的独特游戏模式！
              </p>
              <button
                onClick={() => onSelectMode('turnbased')}
                className="w-full px-6 py-3 rounded-2xl bg-gradient-to-r from-orange-400 to-red-500 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:brightness-110"
              >
                轮换游戏
              </button>
            </div>
          </div>
        </div>

        <div className="mt-12 text-sm text-slate-400">
          <p>使用 WASD 或方向键控制。挑战AI或与AI协作完成游戏！</p>
        </div>
      </div>
    </div>
  );
}