'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, HelpCircle } from 'lucide-react';

const FAQS = [
  {
    q: 'Can each department customize its own project statuses and checklists?',
    a: 'Yes. Organization admins set default statuses, and Project Managers can customize Kanban columns per project. Checklists support CHECK, TEXT, LINK, FILE, and MEDIA inputs plus custom-named multi-file submission headers.',
  },
  {
    q: 'How does the 50 GB MinIO Media Directory work?',
    a: 'All task evidence, voice notes, and finance receipts are stored in tenant-scoped MinIO buckets with signed URLs. The /evidence directory lets you filter by project or file type, inspect AI voice transcripts, and delete files to reclaim quota.',
  },
  {
    q: 'Does voice-to-text work in Hindi, Hinglish, or regional languages?',
    a: 'Yes. Field technicians can record audio directly in the browser or upload voice notes. Web Speech API provides instant live transcripts in English/Hindi, and Gemini 2.5 Flash transcribes and identifies mixed-language field audio.',
  },
  {
    q: 'Is Nexora usable as an installed mobile or tablet web app?',
    a: 'Yes. Nexora ships as an installable PWA with a 5-button bottom dock (Overview, Tasks, Projects, Media, Finance), safe-area-inset support, and automatic background JWT refresh so field sessions stay active.',
  },
  {
    q: 'How is tenant data isolated across organizations?',
    a: 'Organizations are routed to dedicated PostgreSQL shards (S1, S2, S3) via the shard router, with org-scoped RBAC flags and isolated MinIO object prefixes.',
  },
];

export function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.2 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10"
      >
        <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3.5 py-1 text-xs font-bold text-orange-600">
          <HelpCircle className="w-3.5 h-3.5" />
          Frequently Asked Questions
        </span>
        <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight mt-3 text-[#111318]">
          Everything You Need to Know
        </h2>
      </motion.div>

      <div className="space-y-3">
        {FAQS.map((item, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div key={item.q} className="glass-card rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="w-full flex items-center justify-between gap-4 p-5 text-left cursor-pointer"
              >
                <span className="font-display text-sm sm:text-base font-bold text-[#111318]">
                  {item.q}
                </span>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 text-orange-600 transition-transform duration-300 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-5 text-xs sm:text-sm text-zinc-600 leading-relaxed">
                      {item.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
