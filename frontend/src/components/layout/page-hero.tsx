"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
};

export function PageHero({ title, description, children, className }: Props) {
  return (
    <div
      className={cn(
        "relative mb-8 overflow-hidden rounded-2xl",
        className
      )}
    >
      {/* Background image */}
      <div className="absolute inset-0">
        <Image
          src="/admin_header_image.png"
          alt=""
          fill
          className="object-cover object-center opacity-30"
          priority
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 px-8 py-8 flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 text-sm text-zinc-400 max-w-2xl">
              {description}
            </p>
          )}
        </div>
        {children && (
          <div className="shrink-0 ml-8">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
