"use client";

import { useState } from "react";
import { Play } from "lucide-react";

/** Nhúng YouTube nhẹ: chỉ tải iframe khi bấm phát. */
export default function YouTubeLite({ id, title }) {
  const [play, setPlay] = useState(false);
  return (
    <div className="relative aspect-video bg-black">
      {play ? (
        <iframe
          className="absolute inset-0 size-full"
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlay(true)}
          className="group absolute inset-0"
          aria-label={`Play: ${title}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
            alt=""
            loading="lazy"
            className="size-full object-cover opacity-90 transition group-hover:opacity-100"
          />
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid size-16 place-items-center rounded-full bg-sun-500 text-white shadow-xl ring-8 ring-white/25 transition group-hover:scale-110">
              <Play className="ml-1 size-7 fill-current" />
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
