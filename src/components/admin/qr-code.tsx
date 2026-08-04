"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrCode({
  url,
  size = 180,
}: {
  url: string;
  size?: number;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(url, {
      width: size,
      margin: 1,
      color: { dark: "#18181b", light: "#ffffff" },
    }).then((result) => {
      if (active) setDataUrl(result);
    });
    return () => {
      active = false;
    };
  }, [url, size]);

  if (!dataUrl) {
    return (
      <div
        aria-hidden
        style={{ width: size, height: size }}
        className="animate-pulse rounded-lg bg-muted"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      alt={`QR code para ${url}`}
      width={size}
      height={size}
      className="rounded-lg border bg-white p-1"
    />
  );
}
