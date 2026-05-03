"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

export function MatchOverlay({ onDismiss }: { onDismiss: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      onClick={onDismiss}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-accent-yes/95 to-ink-900/95"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        className="relative flex flex-col items-center gap-4 px-8 text-center"
        initial={{ scale: 0.6, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.7, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 18 }}
      >
        <motion.div
          className="flex h-24 w-24 items-center justify-center rounded-full bg-white/15 ring-4 ring-white/40 backdrop-blur"
          initial={{ rotate: -20 }}
          animate={{ rotate: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 14 }}
        >
          <Check size={56} strokeWidth={3} className="text-white" />
        </motion.div>
        <h2 className="text-5xl font-black tracking-tight text-white">Match!</h2>
        <p className="text-sm text-white/85">
          Beslissing geregistreerd — bron-systeem krijgt bericht.
        </p>
      </motion.div>
    </motion.div>
  );
}
