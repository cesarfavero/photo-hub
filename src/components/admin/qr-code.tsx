import QRCode from "qrcode";

export async function QrCode({
  url,
  size = 180,
}: {
  url: string;
  size?: number;
}) {
  const dataUrl = await QRCode.toDataURL(url, {
    width: size,
    margin: 1,
    color: { dark: "#18181b", light: "#ffffff" },
  });

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
