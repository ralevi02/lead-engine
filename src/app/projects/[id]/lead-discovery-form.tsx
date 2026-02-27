"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { triggerLeadGeneration } from "@/app/actions/leads";

interface LeadDiscoveryFormProps {
  projectId: string;
  disabled?: boolean;
}

export function LeadDiscoveryForm({ projectId, disabled }: LeadDiscoveryFormProps) {
  const [city, setCity] = useState("");
  const [isPending, startTransition] = useTransition();
  const [triggered, setTriggered] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!city.trim()) return;

    startTransition(async () => {
      const result = await triggerLeadGeneration({ projectId, city: city.trim() });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setTriggered(true);
      toast.success(
        "¡Búsqueda iniciada! Los leads aparecerán en la tabla en 1-2 minutos.",
        { duration: 6000 }
      );

      // Poll: refresh every 15s for up to 3 minutes
      let attempts = 0;
      const poll = setInterval(() => {
        attempts++;
        router.refresh();
        if (attempts >= 12) clearInterval(poll);
      }, 15_000);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="city" className="text-sm font-medium">
          Ciudad o región objetivo
        </Label>
        <Input
          id="city"
          placeholder="ej: Santiago, Chile"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          disabled={isPending || disabled}
          className="max-w-xs"
        />
      </div>
      <Button type="submit" disabled={isPending || !city.trim() || disabled}>
        {isPending ? (
          <span className="flex items-center gap-2">
            <SpinnerIcon />
            Iniciando...
          </span>
        ) : triggered ? (
          "Buscar de nuevo"
        ) : (
          "Generar Leads →"
        )}
      </Button>
    </form>
  );
}

function SpinnerIcon() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
