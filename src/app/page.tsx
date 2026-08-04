import Link from "next/link";
import { ArrowRightIcon, CameraIcon, ImagesIcon, QrCodeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    icon: QrCodeIcon,
    title: "1 · Leia o QR code",
    text: "O convidado chega à cabine pela leitura do QR code, sem instalar nada.",
  },
  {
    icon: ImagesIcon,
    title: "2 · Escolha a moldura",
    text: "Seleciona a moldura do evento e tira a foto com a câmera do celular.",
  },
  {
    icon: CameraIcon,
    title: "3 · Publique na galeria",
    text: "A foto entra na galeria ao vivo, para todo mundo ver em tempo real.",
  },
];

export default function Home() {
  return (
    <main className="bg-glow flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center px-4 pb-24 pt-16 sm:px-6 sm:pt-24">
        <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500 flex flex-col items-center text-center">
          <div className="animate-float-slow mb-8 flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-[0_16px_40px_-12px_oklch(0.25_0.03_55/0.45)]">
            <CameraIcon className="size-9" strokeWidth={1.75} />
          </div>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            A cabine de fotos para o seu evento
          </h1>
          <p className="mt-5 max-w-lg text-pretty text-muted-foreground sm:text-lg">
            QR code + moldura + foto + galeria ao vivo. Tudo funciona direto no
            celular dos convidados — sem aplicativo, sem cadastro.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              nativeButton={false}
              className="gap-2 rounded-full px-7"
              render={<Link href="/admin" />}
            >
              Criar meu evento
              <ArrowRightIcon className="size-4" />
            </Button>
          </div>
        </div>

        <div
          className="mt-16 grid w-full max-w-3xl grid-cols-1 gap-4 sm:mt-20 sm:grid-cols-3"
          style={{ animationDelay: "120ms" }}
        >
          {steps.map((step, i) => (
            <div
              key={step.title}
              className="group animate-in fade-in-0 slide-in-from-bottom-4 duration-500 rounded-2xl border bg-card/80 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-foreground/15 hover:shadow-md"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-muted text-foreground/70 transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                <step.icon className="size-5" strokeWidth={1.75} />
              </div>
              <h2 className="text-sm font-semibold">{step.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {step.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
