import {
  BabyIcon,
  BalloonIcon,
  CakeIcon,
  CameraIcon,
  CrownIcon,
  DumbbellIcon,
  GemIcon,
  GhostIcon,
  GiftIcon,
  GlassWaterIcon,
  GraduationCapIcon,
  HeartIcon,
  MicIcon,
  MilkIcon,
  Music2Icon,
  PaletteIcon,
  PartyPopperIcon,
  PlaneIcon,
  RainbowIcon,
  RibbonIcon,
  SparklesIcon,
  StarIcon,
  SunIcon,
  TreePineIcon,
  TrophyIcon,
  type LucideIcon,
} from "lucide-react";

export type EventIconOption = {
  key: string;
  label: string;
  icon: LucideIcon;
};

export const EVENT_ICONS: EventIconOption[] = [
  { key: "party", label: "Festa", icon: PartyPopperIcon },
  { key: "cake", label: "Bolo", icon: CakeIcon },
  { key: "bottle", label: "Mamadeira", icon: MilkIcon },
  { key: "baby", label: "Bebê", icon: BabyIcon },
  { key: "bow", label: "Laço", icon: RibbonIcon },
  { key: "heart", label: "Coração", icon: HeartIcon },
  { key: "grad", label: "Formatura", icon: GraduationCapIcon },
  { key: "star", label: "Estrela", icon: StarIcon },
  { key: "toast", label: "Brinde", icon: GlassWaterIcon },
  { key: "gift", label: "Presente", icon: GiftIcon },
  { key: "balloon", label: "Balão", icon: BalloonIcon },
  { key: "sparkles", label: "Confete", icon: SparklesIcon },
  { key: "camera", label: "Câmera", icon: CameraIcon },
  { key: "mic", label: "Karaokê", icon: MicIcon },
  { key: "music", label: "Música", icon: Music2Icon },
  { key: "sun", label: "Sol", icon: SunIcon },
  { key: "rainbow", label: "Arco-íris", icon: RainbowIcon },
  { key: "tree", label: "Natal", icon: TreePineIcon },
  { key: "ghost", label: "Halloween", icon: GhostIcon },
  { key: "crown", label: "Coroa", icon: CrownIcon },
  { key: "trophy", label: "Troféu", icon: TrophyIcon },
  { key: "dumbbell", label: "Esporte", icon: DumbbellIcon },
  { key: "palette", label: "Arte", icon: PaletteIcon },
  { key: "gem", label: "Jóia", icon: GemIcon },
  { key: "plane", label: "Viagem", icon: PlaneIcon },
];

export function getEventIcon(key: string | null | undefined): LucideIcon {
  return EVENT_ICONS.find((option) => option.key === key)?.icon ??
    PartyPopperIcon;
}

export const DEFAULT_EVENT_ICON = "party";
