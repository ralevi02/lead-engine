"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  analyzeCompanyUrl,
  createProject,
} from "@/app/actions/projects";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const step1Schema = z.object({
  name: z.string().min(1, "El nombre del proyecto es requerido").max(100),
  sourceUrl: z
    .string()
    .min(3, "La URL de la empresa es requerida")
    .regex(
      /^(https?:\/\/)?[\w-]+(\.[\w-]+)+([/\w\-._~:?#[\]@!$&'()*+,;=]*)?$/,
      "Ingresa una URL válida (ej: empresa.cl)"
    ),
});

const step2Schema = z.object({
  icpDescription: z
    .string()
    .min(10, "El ICP no puede estar vacío")
    .max(4000),
});

type Step1Values = z.infer<typeof step1Schema>;
type Step2Values = z.infer<typeof step2Schema>;

// ─── Component ────────────────────────────────────────────────────────────────

type Step = "form" | "review";

interface NewProjectDialogProps {
  children?: React.ReactNode;
}

export function NewProjectDialog({ children }: NewProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [savedName, setSavedName] = useState("");
  const [savedUrl, setSavedUrl] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // ── Step 1 form ──
  const form1 = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    defaultValues: { name: "", sourceUrl: "" },
  });

  // ── Step 2 form ──
  const form2 = useForm<Step2Values>({
    resolver: zodResolver(step2Schema),
    defaultValues: { icpDescription: "" },
  });

  // ── Reset all state when dialog closes ──
  const handleOpenChange = (value: boolean) => {
    if (!isPending) {
      setOpen(value);
      if (!value) {
        form1.reset();
        form2.reset();
        setStep("form");
        setKeywords([]);
      }
    }
  };

  // ── Step 1: Scrape + generate ICP ──
  const onAnalyze = (values: Step1Values) => {
    setSavedName(values.name);
    setSavedUrl(values.sourceUrl);

    startTransition(async () => {
      const result = await analyzeCompanyUrl(values.sourceUrl);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setKeywords(result.searchKeywords);
      form2.setValue("icpDescription", result.icpDescription);
      setStep("review");
    });
  };

  // ── Step 2: Save project ──
  const onConfirm = (values: Step2Values) => {
    startTransition(async () => {
      const result = await createProject({
        name: savedName,
        sourceUrl: savedUrl,
        icpDescription: values.icpDescription,
        searchKeywords: keywords,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(`Proyecto "${savedName}" creado exitosamente.`);
      handleOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children ?? <Button size="sm">+ Nuevo Proyecto</Button>}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[540px]">
        {step === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle>Nuevo Proyecto</DialogTitle>
              <DialogDescription>
                Ingresa el nombre y la URL de tu empresa. La IA analizará el
                sitio y generará automáticamente el Perfil de Cliente Ideal
                (ICP).
              </DialogDescription>
            </DialogHeader>

            <Form {...form1}>
              <form
                onSubmit={form1.handleSubmit(onAnalyze)}
                className="space-y-4"
              >
                <FormField
                  control={form1.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del proyecto</FormLabel>
                      <FormControl>
                        <Input placeholder="ej: Getec Q1 2026" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form1.control}
                  name="sourceUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL de tu empresa</FormLabel>
                      <FormControl>
                        <Input placeholder="ej: getec.cl" {...field} />
                      </FormControl>
                      <FormDescription>
                        La IA leerá tu sitio web para entender a qué te dedicas
                        y quiénes son tus clientes ideales.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOpenChange(false)}
                    disabled={isPending}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? (
                      <span className="flex items-center gap-2">
                        <SpinnerIcon />
                        Analizando...
                      </span>
                    ) : (
                      "Analizar con IA →"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Revisar Perfil de Cliente Ideal (ICP)</DialogTitle>
              <DialogDescription>
                La IA generó este ICP basado en{" "}
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {savedUrl}
                </span>
                . Edítalo si es necesario antes de crear el proyecto.
              </DialogDescription>
            </DialogHeader>

            {keywords.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Palabras clave sugeridas
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {keywords.map((kw) => (
                    <Badge key={kw} variant="secondary" className="text-xs">
                      {kw}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            <Form {...form2}>
              <form
                onSubmit={form2.handleSubmit(onConfirm)}
                className="space-y-4"
              >
                <FormField
                  control={form2.control}
                  name="icpDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción del ICP</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={8}
                          className="resize-none text-sm leading-relaxed"
                          placeholder="Descripción del perfil de cliente ideal..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep("form")}
                    disabled={isPending}
                  >
                    ← Volver
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? (
                      <span className="flex items-center gap-2">
                        <SpinnerIcon />
                        Guardando...
                      </span>
                    ) : (
                      "Confirmar y Crear Proyecto"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function SpinnerIcon() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
