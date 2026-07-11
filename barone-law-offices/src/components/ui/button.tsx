import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold tracking-wide transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-navy text-cream shadow-sm hover:bg-navy-light active:bg-navy-deep",
        gold:
          "bg-gold text-navy-deep shadow-sm hover:bg-gold-light active:bg-gold-dark active:text-white",
        outline:
          "border border-navy bg-transparent text-navy hover:bg-navy hover:text-cream",
        ghost: "bg-transparent text-navy hover:bg-cream hover:text-navy-deep",
        link: "text-gold-dark underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-4 text-xs",
        default: "h-11 px-6",
        lg: "h-12 px-8 text-base",
        xl: "h-14 px-10 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

type ButtonBaseProps = VariantProps<typeof buttonVariants> & {
  className?: string;
};

export type ButtonAsButtonProps = ButtonBaseProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

export type ButtonAsAnchorProps = ButtonBaseProps &
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    /** When provided, the button renders as an anchor element. */
    href: string;
  };

export type ButtonProps = ButtonAsButtonProps | ButtonAsAnchorProps;

/**
 * Polymorphic button: renders an `<a>` when `href` is provided,
 * otherwise a native `<button>`. No radix dependency.
 */
const Button = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  function Button({ className, variant, size, ...props }, ref) {
    const classes = cn(buttonVariants({ variant, size, className }));

    if (props.href !== undefined) {
      const anchorProps = props as ButtonAsAnchorProps;
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          className={classes}
          {...anchorProps}
        />
      );
    }

    const { type = "button", ...buttonProps } = props as ButtonAsButtonProps;
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type={type}
        className={classes}
        {...buttonProps}
      />
    );
  }
);

export { Button, buttonVariants };
