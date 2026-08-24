"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

type ReviewPhotoVariant = "detail" | "discovery" | "compact";

const maxHeightByVariant: Record<ReviewPhotoVariant, string> = {
  detail: "max-h-[32rem]",
  discovery: "max-h-80",
  compact: "max-h-64",
};

type PhotoShape = "standard" | "wide" | "square" | "portrait";

const frameByShape: Record<PhotoShape, string> = {
  standard: "aspect-[4/3]",
  wide: "aspect-[4/3]",
  square: "aspect-square",
  portrait: "aspect-[3/4]",
};

export function ReviewPhoto({
  src,
  alt,
  variant = "detail",
  priority = false,
  className,
}: {
  src: string;
  alt: string;
  variant?: ReviewPhotoVariant;
  priority?: boolean;
  className?: string;
}) {
  const [shape, setShape] = useState<PhotoShape>("standard");
  const shouldContain = shape === "wide" || shape === "portrait";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-stone-100",
        frameByShape[shape],
        maxHeightByVariant[variant],
        className,
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={variant === "detail" ? "(min-width: 640px) 576px, 100vw" : "(min-width: 768px) 360px, 100vw"}
        className={shouldContain ? "object-contain" : "object-cover"}
        onLoad={(event) => {
          const { naturalHeight, naturalWidth } = event.currentTarget;
          if (!naturalWidth || !naturalHeight) return;
          const ratio = naturalWidth / naturalHeight;
          setShape(ratio >= 1.48 ? "wide" : ratio <= 0.82 ? "portrait" : ratio <= 1.12 ? "square" : "standard");
        }}
      />
    </div>
  );
}
