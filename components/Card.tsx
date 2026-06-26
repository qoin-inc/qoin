import React, { ReactNode } from 'react';

/**
 * Simple reusable Card component.
 * Applies the .card style defined in design.css.
 */
export default function Card({ children }: { children: ReactNode }) {
  return <div className="card">{children}</div>;
}
