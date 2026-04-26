import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MODULES, BADGES } from '@/lib/trainingModules';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Map, BookOpen, Wind, Zap, Layers, ShieldAlert, CircleDot,
  Award, Star, Trophy, CheckCircle2, Lock, ArrowRight, Flame, BarChart2
} from 'lucide-react';

const ICON_MAP = { Map, BookOpen, Wind, Zap, Layers, ShieldAlert, CircleDot, Award, Star, Trophy, BarChart2 };
const COLOR_MAP = {
  blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400',
  cyan: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30 text-cyan-400',
  orange: 'from-orange-500/20 to-orange-600/10 border-orange-500/30 text-orange-400',
  purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400',
  green: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400',
  yellow: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 text-yellow-400',
};

function StatCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
          <p className={cn("text-3xl font-bold", color)}>{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center bg-slate-800", color)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: progressList } = useQuery({
    queryKey: ['userProgress'],
    queryFn: () => base44.entities.UserProgress.list(),
    initialData: [],
  });

  const progress = progressList[0] || {
    xp: 0, level: 1, completed_modules: [], badges: [],
    completed_quizzes: [], quiz_scores: {}, current_module: 'gis_basics'
  };

  const createProgress = useMutation({
    mutationFn: (data) => base44.entities.UserProgress.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userProgress'] }),
  });

  // Auto-create progress record on first visit
  React.useEffect(() => {
    if (progressList.length === 0 && progressList !== undefined) {
      createProgress.mutate({
        xp: 0, level: 1, completed_modules: [], badges: [],
        completed_quizzes: [], quiz_scores: {}, current_module: 'gis_basics'
      });
    }
  }, [progressList]);

  const completedCount = progress.completed_modules?.length || 0;
  const totalModules = MODULES.length;
  const nextModuleId = MODULES.find(m => !progress.completed_modules?.includes(m.id))?.id || MODULES[0].id;
  const nextModule = MODULES.find(m => m.id === nextModuleId);
  const NextIcon = ICON_MAP[nextModule?.icon] || BookOpen;
  const earnedBadges = progress.badges || [];
  const level = progress.level || 1;
  const xpInLevel = (progress.xp || 0) % 200;
  const levelPercent = (xpInLevel / 200) * 100;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-6xl mx-auto">
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">
          Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}!
        </h1>
        <p className="text-slate-400 mt-1">Continue your renewable energy GIS training.</p>
      </motion.div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatCard label="Level" value={level} sub={`${xpInLevel}/200 XP to next`} icon={Star} color="text-emerald-400" />
        <StatCard label="Total XP" value={progress.xp || 0} sub="experience points" icon={Flame} color="text-orange-400" />
        <StatCard label="Modules" value={`${completedCount}/${totalModules}`} sub="completed" icon={CheckCircle2} color="text-cyan-400" />
        <StatCard label="Badges" value={earnedBadges.length} sub="earned" icon={Trophy} color="text-purple-400" />
      </motion.div>

      {/* Level progress bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="bg-slate-900 border border-slate-800 rounded-xl p-4"
      >
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-slate-400">Level {level} Progress</span>
          <span className="text-emerald-400 font-medium">{xpInLevel} / 200 XP</span>
        </div>
        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${levelPercent}%` }}
            transition={{ duration: 1, delay: 0.3 }}
          />
        </div>
      </motion.div>

      {/* Continue & Modules */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Continue card */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-1"
        >
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Continue Learning</h2>
          {nextModule && (
            <Link to="/learn" className="block group">
              <div className={cn(
                "bg-gradient-to-br rounded-xl p-5 border transition-all duration-200 hover:scale-[1.02]",
                COLOR_MAP[nextModule.color]
              )}>
                <NextIcon className="w-8 h-8 mb-3" />
                <p className="font-bold text-white text-lg leading-tight">{nextModule.title}</p>
                <p className="text-xs text-slate-300 mt-1 mb-4">{nextModule.subtitle}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium bg-white/10 px-2 py-1 rounded-full">
                    +{nextModule.xp_reward} XP
                  </span>
                  <span className="text-xs flex items-center gap-1 text-white/80 group-hover:gap-2 transition-all">
                    Start <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </Link>
          )}
          {completedCount === totalModules && (
            <div className="bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 border border-emerald-500/30 rounded-xl p-5 text-center">
              <Trophy className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <p className="font-bold text-white">All modules complete!</p>
              <p className="text-xs text-slate-400 mt-1">You're a renewable energy GIS expert.</p>
            </div>
          )}
        </motion.div>

        {/* All modules grid */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
          className="lg:col-span-2"
        >
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">All Modules</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {MODULES.map((module, i) => {
              const isCompleted = progress.completed_modules?.includes(module.id);
              const Icon = ICON_MAP[module.icon] || BookOpen;
              const isCurrent = module.id === nextModuleId && !isCompleted;

              return (
                <Link key={module.id} to="/learn" state={{ moduleId: module.id }}>
                  <div className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-all hover:bg-slate-800 cursor-pointer",
                    isCompleted ? "bg-slate-900/50 border-slate-800" : "bg-slate-900 border-slate-800",
                    isCurrent && "border-emerald-500/40"
                  )}>
                    <div className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                      isCompleted ? "bg-emerald-500/20 text-emerald-400" :
                        isCurrent ? "bg-slate-700 text-slate-200" : "bg-slate-800 text-slate-500"
                    )}>
                      {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium truncate", isCompleted ? "text-slate-400" : "text-slate-200")}>
                        {module.title}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{module.subtitle}</p>
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0">{module.xp_reward}XP</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Badges */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Badges</h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries(BADGES).map(([id, badge]) => {
            const earned = earnedBadges.includes(id);
            const BadgeIcon = ICON_MAP[badge.icon] || Award;
            return (
              <div
                key={id}
                title={badge.description}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-full border text-xs font-medium transition-all",
                  earned
                    ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                    : "bg-slate-900 border-slate-800 text-slate-600"
                )}
              >
                {earned ? <BadgeIcon className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                {badge.name}
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}