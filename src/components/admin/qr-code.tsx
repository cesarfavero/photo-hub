"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QrCode({
  url,
  size = 180,
  download = false,
  filename = "qr-code.png",
}: {
  url: string;
  size?: number;
  download?: boolean;
  filename?: string;
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

  const downloadQr = async () => {
    const big = await QRCode.toDataURL(url, {
      width: 1024,
      margin: 2,
      color: { dark: "#18181b", light: "#ffffff" },
    });
    const a = document.createElement("a");
    a.href = big;
    a.download = filename;
    a.click();
  };

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
    <div className="flex flex-col items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dataUrl}
        alt={`QR code para ${url}`}
        width={size}
        height={size}
        className="rounded-lg border bg-white p-1"
      />
      {download ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-muted-foreground"
          onClick={() => void downloadQr()}
        >
          <DownloadIcon className="size-3.5" />
          Baixar QR
        </Button>
      ) : null}
    </div>
  );
}
