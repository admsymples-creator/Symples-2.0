import { Easing, Variants } from "framer-motion";

// Curva de Bezier "Snappy" (Rápida e suave, estilo Apple/Linear)
export const TRANSITION_EASE: Easing = [0.25, 0.1, 0.25, 1.0];

export const FADE_UP_ANIMATION = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
  transition: { duration: 0.3, ease: TRANSITION_EASE },
};

export const STAGGER_CONTAINER: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05, // Atraso entre cada item (efeito cascata)
    },
  },
};

export const STAGGER_ITEM: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: TRANSITION_EASE } },
};
