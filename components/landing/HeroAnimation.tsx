'use client';

import { useState, useEffect } from 'react';
import { useReducedMotion } from 'framer-motion';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Package, Truck, DollarSign, AlertTriangle } from 'lucide-react';

type Scene = 'boxes' | 'button' | 'dissolve' | 'dashboard' | 'map';

/** Cinematic 2.5D animation: entrepreneur struggle → glowing button → particle dissolve → dashboard → global delivery map */
export function HeroAnimation() {
  const reduceMotion = useReducedMotion();
  const [scene, setScene] = useState<Scene>('boxes');

  const sceneDuration = reduceMotion ? 500 : 4000;

  useEffect(() => {
    if (reduceMotion) {
      setScene('dashboard');
      return;
    }
    const sequence: Scene[] = ['boxes', 'button', 'dissolve', 'dashboard', 'map'];
    let idx = 0;
    const t = setInterval(() => {
      idx = (idx + 1) % sequence.length;
      setScene(sequence[idx]);
    }, sceneDuration);
    return () => clearInterval(t);
  }, [sceneDuration, reduceMotion]);

  if (reduceMotion) {
    return <ReducedScene />;
  }

  return (
    <div
      className="relative order-1 lg:order-2 landing-hero-card-wrapper flex justify-center lg:justify-end items-center min-h-[180px] sm:min-h-[220px] lg:min-h-[240px] w-full px-2 sm:pl-0 sm:pr-4 overflow-hidden sm:-translate-x-8 lg:-translate-x-24 xl:-translate-x-32"
    >
      <div
        className="relative w-full max-w-[100%] min-[360px]:max-w-[340px] sm:max-w-[520px] md:max-w-[640px] lg:max-w-[720px] xl:max-w-[800px] aspect-video rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl shadow-slate-300/30 dark:shadow-2xl dark:shadow-[#FF9800]/10 border border-slate-200 dark:border-slate-600/50 ring-1 ring-slate-200/50 dark:ring-[#FF9800]/20"
        style={{
          perspective: 1200,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Cinematic overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-transparent dark:from-black/30 dark:via-transparent dark:to-black/40 pointer-events-none z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,rgba(255,152,0,0.08)_0%,transparent_50%)] dark:bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.2)_100%)] pointer-events-none z-10" />
        <div className="absolute inset-0 opacity-0 dark:opacity-100 bg-[radial-gradient(ellipse_at_30%_50%,rgba(255,152,0,0.12)_0%,transparent_45%)] pointer-events-none z-10" />

        <AnimatePresence mode="wait">
          {scene === 'boxes' && <SceneBoxes key="boxes" />}
          {scene === 'button' && <SceneButton key="button" />}
          {scene === 'dissolve' && <SceneDissolve key="dissolve" />}
          {scene === 'dashboard' && <SceneDashboard key="dashboard" />}
          {scene === 'map' && <SceneMap key="map" />}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SceneBoxes() {
  const labels = [
    { text: 'مخزون', icon: Package, color: 'from-amber-700 to-amber-900' },
    { text: 'شحن', icon: Truck, color: 'from-slate-600 to-slate-800' },
    { text: 'رأس مال', icon: DollarSign, color: 'from-rose-700 to-rose-900' },
    { text: 'مخاطر', icon: AlertTriangle, color: 'from-red-800 to-red-950' },
  ];

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-amber-50/90 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Silhouette - entrepreneur */}
      <motion.div
        className="absolute bottom-[18%] inset-inline-start-1/2 -translate-x-1/2 w-12 h-16 rounded-full bg-slate-500/60 shadow-lg dark:bg-slate-600/90 dark:ring-1 dark:ring-slate-500/30"
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      {/* Heavy boxes - 3D style */}
      <div className="relative w-full h-full flex items-center justify-center" style={{ perspective: 800 }}>
        {labels.map((item, i) => (
          <motion.div
            key={item.text}
            className={`absolute w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-md sm:rounded-lg bg-gradient-to-br ${item.color} shadow-xl shadow-slate-900/20 dark:shadow-xl dark:shadow-black/50 dark:ring-1 dark:ring-white/20 border border-white/30 dark:border-white/10 flex flex-col items-center justify-center`}
            style={{
              transform: `rotateY(${-15 + i * 8}deg) rotateX(${5 + i * 2}deg) translateZ(${i * 2}px)`,
              left: `${28 + (i % 2) * 44}%`,
              top: `${35 + Math.floor(i / 2) * 25}%`,
            }}
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{
              opacity: 1,
              y: [0, -2, 0],
              scale: 1,
            }}
            transition={{
              duration: 2,
              delay: i * 0.15,
              y: { repeat: Infinity, duration: 2.5, delay: i * 0.2 },
            }}
          >
            <item.icon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white/80 mb-0.5" />
            <span className="text-[8px] sm:text-[9px] md:text-[10px] font-bold text-white/90">{item.text}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function SceneButton() {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-amber-50/90 via-orange-50/70 to-amber-100/80 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,#FF9800_0%,transparent_60%)] opacity-20 dark:opacity-35"
        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      <Link href="/auth/register">
        <motion.div
          className="relative px-5 py-3 sm:px-8 sm:py-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#FF9800] to-[#F57C00] shadow-lg shadow-[#FF9800]/40 dark:shadow-[0_0_40px_rgba(255,152,0,0.6)] ring-2 ring-amber-200/60 dark:ring-transparent cursor-pointer min-h-[44px] flex items-center justify-center"
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: 1,
            opacity: 1,
            boxShadow: [
              '0 0 30px rgba(255,152,0,0.5)',
              '0 0 60px rgba(255,152,0,0.8)',
              '0 0 30px rgba(255,152,0,0.5)',
            ],
          }}
          transition={{
            scale: { duration: 0.6, type: 'spring', bounce: 0.4 },
            boxShadow: { duration: 2, repeat: Infinity },
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="text-white font-bold text-sm sm:text-base md:text-lg">ابدأ الدروب شيبينغ</span>
        </motion.div>
      </Link>
    </motion.div>
  );
}

const PARTICLE_OFFSETS = Array.from({ length: 24 }, (_, i) => ({
  x: ((i * 17) % 100 - 50) * 2,
  y: ((i * 23) % 100 - 50) * 2,
}));

function SceneDissolve() {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-white via-amber-50/90 to-orange-100/80 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Fading boxes */}
      {['مخزون', 'شحن', 'رأس مال', 'مخاطر'].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-12 h-12 rounded-lg bg-amber-600/40 dark:bg-amber-700/50 dark:ring-1 dark:ring-amber-500/30"
          style={{ left: `${30 + (i % 2) * 40}%`, top: `${40 + Math.floor(i / 2) * 20}%` }}
          initial={{ opacity: 1, scale: 1 }}
          animate={{ opacity: 0, scale: 0 }}
          transition={{ duration: 0.8 }}
        />
      ))}

      {/* Light particles */}
      {PARTICLE_OFFSETS.map((p, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-[#FF9800] left-1/2 top-1/2 shadow-sm dark:shadow-[0_0_8px_rgba(255,152,0,0.7)]"
          style={{ x: '-50%', y: '-50%' }}
          initial={{ scale: 0, opacity: 1 }}
          animate={{
            scale: [0, 1, 0],
            opacity: [1, 0.8, 0],
            x: `calc(-50% + ${p.x}px)`,
            y: `calc(-50% + ${p.y}px)`,
          }}
          transition={{
            duration: 1.2,
            delay: i * 0.03,
          }}
        />
      ))}
    </motion.div>
  );
}

function SceneDashboard() {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col p-3 sm:p-4 md:p-5 bg-gradient-to-br from-white via-slate-50/95 to-amber-50/90 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Dashboard header */}
      <motion.div
        className="flex items-center gap-2 mb-2 sm:mb-3"
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="w-2 h-2 rounded-full bg-[#4CAF50] dark:shadow-[0_0_8px_rgba(76,175,80,0.6)]" />
        <span className="text-[10px] sm:text-xs font-medium text-slate-600 dark:text-slate-400">لوحة التحكم</span>
      </motion.div>

      {/* Profit counter */}
      <motion.div
        className="flex items-baseline gap-1 mb-2 sm:mb-4"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <span className="text-xl sm:text-2xl md:text-3xl font-bold text-[#2e7d32] dark:text-[#6EE7B7] dark:drop-shadow-[0_0_8px_rgba(110,231,183,0.5)]">+</span>
        <motion.span
          className="text-xl sm:text-2xl md:text-3xl font-bold text-[#2e7d32] dark:text-[#6EE7B7] dark:drop-shadow-[0_0_8px_rgba(110,231,183,0.5)] tabular-nums"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <CountUp end={1247} duration={2} />
        </motion.span>
        <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400"> ربح</span>
      </motion.div>

      {/* Orders list */}
      <div className="space-y-1.5 sm:space-y-2 flex-1 min-h-0">
        {['طلب #1042', 'طلب #1043', 'طلب #1044'].map((order, i) => (
          <motion.div
            key={order}
            className="flex items-center justify-between py-1.5 px-2.5 sm:py-2 sm:px-3 rounded-md sm:rounded-lg bg-white/90 border border-slate-200 shadow-sm dark:bg-slate-800/50 dark:border-slate-600/50 dark:shadow-none dark:ring-1 dark:ring-slate-500/20 min-h-[36px] sm:min-h-0"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5 + i * 0.15 }}
          >
            <span className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-300 truncate">{order}</span>
            <span className="text-[9px] sm:text-[10px] font-medium text-[#2e7d32] dark:text-[#6EE7B7] shrink-0">✓ مكتمل</span>
          </motion.div>
        ))}
      </div>

      {/* Shipping lines */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <svg className="absolute inset-0 w-full h-full opacity-30 dark:opacity-40">
          <motion.line
            x1="20%"
            y1="60%"
            x2="80%"
            y2="30%"
            stroke="#FF9800"
            strokeWidth="1"
            strokeDasharray="4 4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2 }}
          />
          <motion.line
            x1="25%"
            y1="75%"
            x2="75%"
            y2="45%"
            stroke="#4CAF50"
            strokeWidth="1"
            strokeDasharray="4 4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, delay: 0.3 }}
          />
        </svg>
      </motion.div>
    </motion.div>
  );
}

function SceneMap() {
  const routes = [
    { from: { x: 25, y: 45 }, to: { x: 75, y: 35 } },
    { from: { x: 30, y: 60 }, to: { x: 70, y: 50 } },
    { from: { x: 50, y: 70 }, to: { x: 55, y: 30 } },
  ];

  return (
    <motion.div
      className="absolute inset-0 bg-gradient-to-br from-white via-slate-50 to-amber-50/80 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Abstract world map - glowing outline */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full opacity-50 dark:opacity-45">
        <motion.path
          d="M 20 50 Q 35 25, 50 35 T 80 45 Q 85 60, 70 70 T 40 75 Q 25 65, 20 50"
          fill="none"
          stroke="#FF9800"
          strokeWidth="0.8"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.6 }}
          transition={{ duration: 2 }}
        />
      </svg>

      {/* Flying products */}
      {routes.map((route, i) => (
        <motion.div
          key={i}
          className="absolute w-4 h-4 flex items-center justify-center"
          style={{ left: `${route.from.x}%`, top: `${route.from.y}%` }}
          animate={{
            left: [`${route.from.x}%`, `${route.to.x}%`],
            top: [`${route.from.y}%`, `${route.to.y}%`],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            delay: i * 0.5,
          }}
        >
          <Package className="w-3.5 h-3.5 text-[#F57C00] dark:text-[#FFB74D] dark:drop-shadow-[0_0_6px_rgba(255,183,77,0.7)]" />
        </motion.div>
      ))}

      {/* Glow spots */}
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(255,152,0,0.12)_0%,transparent_65%)] dark:bg-[radial-gradient(ellipse_at_50%_50%,rgba(255,152,0,0.2)_0%,transparent_70%)]"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 3, repeat: Infinity }}
      />

      <motion.div
        className="absolute bottom-4 inset-inline-start-1/2 -translate-x-1/2 text-center"
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">توصيل تلقائي لجميع محافظات فلسطين</span>
      </motion.div>
    </motion.div>
  );
}

function CountUp({ end, duration }: { end: number; duration: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = end / (duration * 60);
    const t = setInterval(() => {
      start += step;
      if (start >= end) {
        setN(end);
        clearInterval(t);
      } else setN(Math.floor(start));
    }, 1000 / 60);
    return () => clearInterval(t);
  }, [end, duration]);
  return <>{n}</>;
}

function ReducedScene() {
  return (
    <div className="relative order-1 lg:order-2 landing-hero-card-wrapper flex justify-center lg:justify-end items-center min-h-[200px] sm:min-h-[240px] w-full px-2 sm:-translate-x-8 lg:-translate-x-24 overflow-hidden">
      <div className="relative w-full max-w-[100%] min-[360px]:max-w-[340px] sm:max-w-[560px] lg:max-w-[680px] aspect-video rounded-xl sm:rounded-2xl overflow-hidden bg-gradient-to-br from-white via-slate-50 to-amber-50 dark:from-slate-900 dark:to-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 shadow-2xl shadow-slate-300/25 dark:shadow-2xl dark:shadow-[#FF9800]/10 border border-slate-200 dark:border-slate-600/50 ring-1 ring-slate-200/60 dark:ring-[#FF9800]/15">
        <Package className="w-12 h-12 sm:w-16 sm:h-16 text-[#FF9800] mb-3 sm:mb-4" />
        <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white text-center">منصة ربح</h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 text-center mt-1 sm:mt-2">التجارة الإلكترونية الفلسطينية</p>
        <Link
          href="/auth/register"
          className="mt-4 sm:mt-6 px-5 py-3 sm:px-6 rounded-xl bg-[#FF9800] text-white font-semibold text-xs sm:text-sm min-h-[44px] flex items-center justify-center"
        >
          ابدأ الدروب شيبينغ
        </Link>
      </div>
    </div>
  );
}
