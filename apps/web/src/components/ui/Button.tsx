"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { CircleNotch } from "@phosphor-icons/react";

export type ButtonVariant =
  | "default"
  | "secondary"
  | "outline"
  | "destructive"
  | "ghost"
  | "link";

export type ButtonSize = "default" | "sm" | "lg" | "icon";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  default:
    "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] shadow-xs",
  secondary:
    "bg-muted text-foreground hover:bg-muted/80 active:scale-[0.98]",
  outline:
    "border border-border bg-background hover:bg-accent hover:text-accent-foreground active:scale-[0.98]",
  destructive:
    "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.98] shadow-xs",
  ghost:
    "hover:bg-accent hover:text-accent-foreground active:scale-[0.98]",
  link: "text-primary underline-offset-4 hover:underline p-0 h-auto min-h-0 min-w-0 shadow-none",
};

const sizeStyles: Record<ButtonSize, string> = {
  default: "h-11 min-h-[48px] px-6 text-sm font-medium",
  sm: "h-11 min-h-[48px] px-4 text-xs font-semibold",
  lg: "h-12 min-h-[48px] px-8 text-base font-semibold",
  icon: "h-12 w-12 min-h-[48px] min-w-[48px] p-0 justify-center",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-2xl transition-all select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <CircleNotch size={18} className="animate-spin text-current" />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";
