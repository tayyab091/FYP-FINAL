export const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
}

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1 },
}

export const slideFromRight = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0 },
}

export const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.06,
    },
  },
}

export const staggerFast = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.03,
    },
  },
}

export const springTransition = {
  type: 'spring' as const,
  stiffness: 320,
  damping: 28,
}

export const easeTransition = {
  duration: 0.45,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
}

export const cardHover = {
  rest: { y: 0, scale: 1 },
  hover: { y: -6, scale: 1.01, transition: springTransition },
}
