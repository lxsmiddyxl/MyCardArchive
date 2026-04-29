"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type CardHoverPreviewApi = {
  show: (imageSrc: string, clientX: number, clientY: number) => void;
  move: (clientX: number, clientY: number) => void;
  hide: () => void;
};

const PreviewContext = createContext<CardHoverPreviewApi | null>(null);

export function useCardHoverPreview(): CardHoverPreviewApi {
  const ctx = useContext(PreviewContext);
  if (!ctx) {
    return {
      show: () => {},
      move: () => {},
      hide: () => {},
    };
  }
  return ctx;
}

export function CardHoverPreviewProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const show = useCallback((imageSrc: string, clientX: number, clientY: number) => {
    setSrc(imageSrc);
    setPos({ x: clientX, y: clientY });
  }, []);

  const move = useCallback((clientX: number, clientY: number) => {
    setPos({ x: clientX, y: clientY });
  }, []);

  const hide = useCallback(() => {
    setSrc(null);
  }, []);

  const api = useMemo(() => ({ show, move, hide }), [hide, move, show]);

  return (
    <PreviewContext.Provider value={api}>
      {children}
      <div
        className={`pointer-events-none fixed z-[200] transition-opacity duration-200 ease-mca-standard ${
          src ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{
          left: pos.x,
          top: pos.y,
          transform: "translate(-50%, calc(-100% - 12px))",
        }}
        aria-hidden
      >
        {src ? (
          <div className="overflow-hidden rounded-mca-card border border-mca-border-subtle bg-mca-surface-elevated shadow-mca-card ring-1 ring-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              className="max-h-80 max-w-[min(100vw-2rem,20rem)] object-contain"
              draggable={false}
            />
          </div>
        ) : null}
      </div>
    </PreviewContext.Provider>
  );
}

export function hoverPreviewHandlers(
  api: CardHoverPreviewApi,
  imageSrc: string | null | undefined
) {
  if (!imageSrc) {
    return {
      onMouseEnter: undefined as (() => void) | undefined,
      onMouseMove: undefined as (() => void) | undefined,
      onMouseLeave: undefined as (() => void) | undefined,
    };
  }
  return {
    onMouseEnter: (e: React.MouseEvent) => {
      api.show(imageSrc, e.clientX, e.clientY);
    },
    onMouseMove: (e: React.MouseEvent) => {
      api.move(e.clientX, e.clientY);
    },
    onMouseLeave: () => {
      api.hide();
    },
  };
}
