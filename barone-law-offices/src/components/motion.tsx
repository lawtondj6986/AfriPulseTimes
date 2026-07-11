"use client";

import * as React from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

/**
 * Lightweight framer-motion helpers for scroll-triggered reveals.
 * All helpers respect the user's prefers-reduced-motion setting by
 * falling back to a simple opacity fade with no translation.
 */

type MotionTag = "div" | "section" | "span" | "li" | "ul" | "header" | "p" | "h1" | "h2" | "h3";

export interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  /** Delay in seconds before the animation starts. */
  delay?: number;
  /** HTML element to render. Defaults to "div". */
  as?: MotionTag;
}

export function FadeIn({ children, className, delay = 0, as = "div" }: FadeInProps) {
  const shouldReduceMotion = useReducedMotion();
  const Component = motion[as];

  return (
    <Component
      className={className}
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-64px" }}
      transition={{ duration: 0.6, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </Component>
  );
}

const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

export interface StaggerProps {
  children: React.ReactNode;
  className?: string;
  /** HTML element to render. Defaults to "div". */
  as?: MotionTag;
}

/** Container that staggers the reveal of its StaggerItem children. */
export function Stagger({ children, className, as = "div" }: StaggerProps) {
  const Component = motion[as];

  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-64px" }}
      variants={staggerContainer}
    >
      {children}
    </Component>
  );
}

export interface StaggerItemProps {
  children: React.ReactNode;
  className?: string;
  /** HTML element to render. Defaults to "div". */
  as?: MotionTag;
}

/** Child of Stagger — fades and slides up in sequence. */
export function StaggerItem({ children, className, as = "div" }: StaggerItemProps) {
  const shouldReduceMotion = useReducedMotion();
  const Component = motion[as];

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] },
    },
  };

  return (
    <Component className={className} variants={itemVariants}>
      {children}
    </Component>
  );
}
