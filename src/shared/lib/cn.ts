import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merges conditional classes and lets a caller's utility win over a component default. */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
