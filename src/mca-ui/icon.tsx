import Image from "next/image";
import { cn } from "@/lib/ui/cn";

const DIM = { sm: 20, md: 24, lg: 32 } as const;

type IconSize = "sm" | "md" | "lg";

export type IconProps = {
  src: string;
  size?: IconSize;
  /**
   * Empty string (default): decorative icon — `aria-hidden` is applied on the image.
   * Non-empty: short accessible name when the icon carries meaning without adjacent text.
   */
  alt?: string;
  className?: string;
};

export function Icon({ src, size = "md", alt = "", className = "" }: IconProps) {
  const px = DIM[size];
  const sizeCls = size === "sm" ? "h-5 w-5" : size === "lg" ? "h-8 w-8" : "h-6 w-6";
  const decorative = alt.trim() === "";
  return (
    <Image
      src={src}
      alt={alt}
      width={px}
      height={px}
      unoptimized
      aria-hidden={decorative ? true : undefined}
      className={cn(
        "shrink-0 object-contain",
        sizeCls,
        "text-mca-ink-muted dark:text-mca-ink-subtle",
        className
      )}
    />
  );
}
