import Link from "next/link";
import { CameraIcon, ImagesIcon, QrCodeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
        <CameraIcon className="size-8" />
      </div>
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Photo Hub
        </h1>
        <p className="mx-auto max-w-md text-muted-foreground sm:text-lg">
          Cabine de fotos digital para eventos. Escaneie o QR code, escolha a
          moldura e registre o momento na galeria.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/admin">
          <Button size="lg">
            <QrCodeIcon /> Painel do evento
          </Button>
        </Link>
      </div>
      <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            icon: <QrCodeIcon className="size-5" />,
            title: "1. QR Code",
            text: "A pessoa chega ao evento pela leitura do QR code.",
          },
          {
            icon: <ImagesIcon className="size-5" />,
            title: "2. Moldura + Foto",
            text: "Escolhe a moldura e tira a foto na hora, no celular.",
          },
          {
            icon: <CameraIcon className="size-5" />,
            title: "3. Galeria",
            text: "Todas as fotos ficam na galeria, para todo mundo ver.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-xl border bg-card p-5 text-left shadow-sm"
          >
            <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              {item.icon}
            </div>
            <h2 className="font-semibold">{item.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
