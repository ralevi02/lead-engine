"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { triggerLeadGeneration } from "@/app/actions/leads";

interface LeadDiscoveryFormProps {
  projectId: string;
  currentCount?: number;
  disabled?: boolean;
}

export function LeadDiscoveryForm({ projectId, currentCount = 0, disabled }: LeadDiscoveryFormProps) {
  const [city, setCity] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isPolling, setIsPolling] = useState(false);
  const [triggered, setTriggered] = useState(false);
  const router = useRouter();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countRef = useRef<number>(currentCount);
  const stableRef = useRef<number>(0); // consecutive polls with same count

  // When currentCount updates during polling, check if process is done
  useEffect(() => {
    if (!isPolling) return;
    if (currentCount === countRef.current) {
      stableRef.current++;
    } else {
      // Count grew — reset stability counter
      stableRef.current = 0;
      countRef.current = currentCount;
    }
    // 2 consecutive polls with same count (and count > initial) = done
    if (stableRef.current >= 2 && currentCount > 0) {
      stopPolling();
      toast.success(
        `¡Proceso completado! Se encontraron ${currentCount} leads en total.`,
        { duration: 8000 }
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCount]);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setIsPolling(false);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      if (!city.trim()) {
        toast.error("Por favor ingresa una ciudad o región.");
        return;
      }

      const result = await triggerLeadGeneration({ projectId, city: city.trim() });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setTriggered(true);
      setIsPolling(true);
      countRef.current = currentCount;
      stableRef.current = 0;

      toast.info(
        "Búsqueda iniciada. Los leads aparecerán en la tabla automáticamente.",
        { duration: 5000 }
      );

      // Poll every 15s for up to 5 minutes, stop early when done
      let attempts = 0;
      pollRef.current = setInterval(() => {
        attempts++;
        router.refresh();
        if (attempts >= 20) {
          stopPolling();
          toast.info("La búsqueda finalizó.", { duration: 4000 });
        }
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
      <Button type="submit" disabled={isPending || isPolling || disabled}>
        {isPending ? (
          <span className="flex items-center gap-2">
            <SpinnerIcon />
            Iniciando...
          </span>
        ) : isPolling ? (
          <span className="flex items-center gap-2">
            <SpinnerIcon />
            Buscando...
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
