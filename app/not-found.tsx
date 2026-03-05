import { StatePage } from "@/components/ui/StatePage";
import { MapPinOff } from "lucide-react";

export default function NotFound() {
  return (
    <StatePage
      icon={<MapPinOff className="size-16" />}
      title="Página não encontrada"
      description="A página que você está procurando não existe ou foi movida."
      actionLabel="Voltar para o Início"
      href="/"
      variant="default"
    />
  );
}

