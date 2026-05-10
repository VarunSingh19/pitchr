"use client";

import { motion } from "framer-motion";
import { FileJson, Sparkles, Send } from "lucide-react";

const STEPS = [
  {
    number: "01",
    icon: FileJson,
    title: "Generate Your Leads",
    description:
      "Use AI to generate a structured JSON file of target companies with verified email addresses and tech stacks.",
  },
  {
    number: "02",
    icon: Sparkles,
    title: "Upload & Personalize",
    description:
      "Upload JSON + resume, set Gmail credentials, and watch AI craft uniquely personalized emails for each company.",
  },
  {
    number: "03",
    icon: Send,
    title: "Review & Launch",
    description:
      "Preview every email, make edits, then send them all with your resume attached—with full tracking.",
  },
];

export function HowItWorks() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  };

  return (
    <section
      id="how-it-works"
      className="relative py-32 px-6 bg-bg-surface border-y border-border-default overflow-hidden"
    >
      {/* Background elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent-primary rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-sm font-semibold text-accent-primary mb-4 uppercase tracking-wider">
            Three-Step Workflow
          </p>
          <h2 className="text-5xl md:text-6xl font-bold text-text-primary text-balance leading-tight mb-6">
            From leads to sent emails
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            A complete workflow designed to get your personalized outreach to hundreds of companies
            without the manual work.
          </p>
        </motion.div>

        {/* Steps grid */}
        <motion.div
          className="grid md:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.number}
                variants={itemVariants}
                whileHover={{ y: -8 }}
                className="group relative"
              >
                {/* Step number badge */}
                <div className="absolute -top-4 -left-4 w-16 h-16 rounded-2xl bg-accent-primary/10 border border-accent-primary/30 flex items-center justify-center font-bold text-2xl text-accent-primary group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-accent-primary/20 transition-all duration-300" >
                  {step.number}
                </div>

                {/* Card */}
                <div className="pt-16 p-8 rounded-2xl bg-bg-base border border-border-default group-hover:border-border-accent transition-all duration-300 h-full group-hover:shadow-lg group-hover:shadow-accent-primary/10">
                  {/* Icon */}
                  <div className="w-14 h-14 rounded-xl bg-accent-primary/10 flex items-center justify-center mb-6 group-hover:bg-accent-primary/20 group-hover:scale-110 transition-all duration-300">
                    <Icon className="w-7 h-7 text-accent-primary" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold text-text-primary mb-3">
                    {step.title}
                  </h3>
                  <p className="text-text-secondary text-sm leading-relaxed">
                    {step.description}
                  </p>

                  {/* Accent line on hover */}
                  <motion.div
                    className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-accent-primary to-transparent rounded-full"
                    initial={{ width: 0 }}
                    whileHover={{ width: "100%" }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
