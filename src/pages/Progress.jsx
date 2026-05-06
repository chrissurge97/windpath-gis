import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { MODULES, BADGES } from '@/lib/trainingModules';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Map, BookOpen, Wind, Zap, Layers, ShieldAlert, CircleDot,
  Award, Star, Trophy, CheckCircle2, Lock, Target, Flame, BarChart2
} from 'lucide-react';

const ICON_MAP = { Map, BookOpen, Wind, Zap, Layers, ShieldAlert, CircleDot, Award, Star, Trophy, BarChart2 };

function ProgressBar({ value, colorClass = 'bg-emerald-500', className }) {
  return (
    <div className={cn("h-2 bg-slate-800 rounded-full overflow-hidden", className)}>
      <motion.div
        className={cn("h-full rounded-full", colorClass)}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, value)}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  );
}

export default function ProgressPage() {
  const { data: progressList } = useQuery({
    queryKey: ['userProgress'],
    queryFn: () => base44.entities.UserProgress.list(),
    initialData: [],
  });

  const progress = progressList[0] || {
    xp: 0, level: 1, completed_modules: [], badges: [],
    completed_quizzes: [], quiz_scores: {}
  };

  const completedCount = progress.completed_modules?.length || 0;
  const totalModules = MODULES.length;
  const level = progress.level || 1;
  const totalXP = progress.xp || 0;
  const xpInLevel = totalXP % 200;
  const levelPercent = (xpInLevel / 200) * 100;
  const earnedBadges = progress.badges || [];
  const allBadgeIds = Object.keys(BADGES);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white">Your Progress</h1>

      {/* Level & Stats */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center">
              <span className="text-2xl font-black text-white">{level}</span>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Current Level</p>
              <p className="text-white font-bold text-lg">Level {level}</p>
              <p className="text-xs text-slate-500">{totalXP} XP total</p>
            </div>
          </div>
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>{xpInLevel} XP</span>
            <span>200 XP to level {level + 1}</span>
          </div>
          <ProgressBar value={levelPercent} colorClass="bg-gradient-to-r from-emerald-500 to-cyan-500" />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-400" /> Completion Stats
          </h3>
          {[
            { label: 'Modules', value: completedCount, total: totalModules, color: 'bg-cyan-500' },
            { label: 'Badges', value: earnedBadges.length, total: allBadgeIds.length, color: 'bg-purple-500' },
            { label: 'Scenarios Done', value: completedCount, total: totalModules, color: 'bg-orange-500' },
          ].map(({ label, value, total, color }) => (
            <div key={label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">{label}</span>
                <span className="text-slate-300 font-medium">{value}/{total}</span>
              </div>
              <ProgressBar value={(value / total) * 100} colorClass={color} />
            </div>
          ))}
        </div>
      </div>

      {/* Module breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300">Module Progress</h3>
        </div>
        <div className="divide-y divide-slate-800">
          {MODULES.map((module, i) => {
            const isCompleted = progress.completed_modules?.includes(module.id);
            const Icon = ICON_MAP[module.icon] || BookOpen;

            return (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 px-5 py-3"
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                  isCompleted ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-600"
                )}>
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium", isCompleted ? "text-slate-200" : "text-slate-500")}>
                    {module.title}
                  </p>
                  <p className="text-xs text-slate-600 truncate">{module.subtitle}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn(
                    "text-[10px] font-medium px-2 py-0.5 rounded-full",
                    isCompleted
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-slate-800 text-slate-600"
                  )}>
                    {module.xp_reward} XP
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Badges */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300">Badges ({earnedBadges.length}/{allBadgeIds.length})</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
          {allBadgeIds.map((badgeId, i) => {
            const badge = BADGES[badgeId];
            const earned = earnedBadges.includes(badgeId);
            const BadgeIcon = ICON_MAP[badge.icon] || Award;

            return (
              <motion.div
                key={badgeId}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border text-center",
                  earned
                    ? "bg-yellow-500/5 border-yellow-500/20"
                    : "bg-slate-800/30 border-slate-800 opacity-40"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  earned ? "bg-yellow-500/20 text-yellow-400" : "bg-slate-800 text-slate-600"
                )}>
                  {earned ? <BadgeIcon className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-300">{badge.name}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{badge.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}