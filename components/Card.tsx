import React, { ReactNode } from 'react';

/**
 * Simple reusable Card component.
 * Applies the .card style defined in design.css.
 */
export default function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={"card" + (className ? " " + className : "")}>{children}</div>;
}
