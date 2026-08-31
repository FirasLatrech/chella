"use client";

import { useId, type SVGProps } from "react";

/*
 * Chelaa mark.
 *
 * The shape is a single swoosh, so a vertical gradient reads naturally along
 * it: solid foreground at the top where the form is dense, easing into the
 * sky brand colour at the tail. The gradient stops use our tokens, so the
 * mark stays correct in both themes.
 *
 * `useId` namespaces the gradient id — without it, two logos on one page
 * would share a DOM id and the second would inherit the first's fill.
 */
export function Logo({
  className,
  title = "Chelaa",
  gradient = true,
  ...props
}: SVGProps<SVGSVGElement> & { title?: string; gradient?: boolean }) {
  const id = useId();
  const gradientId = `chelaa-logo-${id}`;

  return (
    <svg
      viewBox="0 0 210 237"
      fill="none"
      role="img"
      aria-label={title}
      className={className}
      {...props}
    >
      {gradient ? (
        <defs>
          <linearGradient
            id={gradientId}
            x1="105"
            y1="0"
            x2="105"
            y2="237"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="currentColor" />
            {/* Driven by --logo-stop so hover can animate the sweep. CSS
                var() only resolves through the style attribute, not a
                plain SVG attribute value. */}
            <stop
              offset="45%"
              style={{ offset: "var(--logo-stop, 45%)" } as React.CSSProperties}
              stopColor="currentColor"
            />
            <stop offset="100%" style={{ stopColor: "var(--brand)" } as React.CSSProperties} />
          </linearGradient>
        </defs>
      ) : null}
      <path
        d="M210 65.1394L154.075 121.045C172.865 119.435 191.988 120.619 210 126.337V217.218C168.089 185.425 112.257 192.531 68.698 206.392C29.323 218.92 0 237 0 237L51.4448 178.93C69.2348 171.065 92.4118 162.497 117.347 157.741C129.343 155.446 141.728 154.058 154.094 154.058H73.4926L89.5425 135.96L210 0V65.1394Z"
        fill={gradient ? `url(#${gradientId})` : "currentColor"}
      />
    </svg>
  );
}
