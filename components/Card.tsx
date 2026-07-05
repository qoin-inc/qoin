import React, { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export default function Card({ children, className = "" }: CardProps) {
  return <div className={["card", className].filter(Boolean).join(" ")}>{children}</div>;
}
