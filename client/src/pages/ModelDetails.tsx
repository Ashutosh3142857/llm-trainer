import { useState } from "react";
import { Link, useRoute } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft, Play, Activity, CheckCircle2, Cpu, Settings2, Sparkles, TerminalSquare } from "lucide-react";
import { motion } from "framer-motion";
import { useModel, useTrainModel, useInference } from "@/hooks/use-models";
import { api } from "@shared/routes";
import { Navigation } from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";

export default function ModelDetails() {
  const [, params] = useRoute("/models/:id");
  const id = parseInt(params?.id || "0");
  
  const { data: model, isLoading } = useModel(id);
  const trainModel = useTrainModel();
  const { toast } = useToast();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-zinc-800 border-t-indigo-500" />
        </div>
      </div>
    );
  }

  if (!model) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <h2 className="text-2xl font-bold text-white mb-2">Model not found</h2>
          <p className="text-zinc-400 mb-6">The model you're looking for doesn't exist or was deleted.</p>
          <Link href="/" className="text-indigo-400 hover:text-indigo-300 flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const handleTrain = () => {
    trainModel.mutate(id, {
      onSuccess: () => toast({ title: "Training started!" }),
      onError: (err) => toast({ title: "Failed to start training", description: err.message, variant: "destructive" })
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navigation />
      
      <main className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white mb-8">
          <ChevronLeft className="h-4 w-4" />
          Back to Models
        </Link>

        <div className="mb-12 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white mb-3">{model.name}</h1>
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={model.status} />
              <span className="text-sm text-zinc-500 px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800">
                Target: {model.totalSteps} steps
              </span>
            </div>
          </div>

          {model.status === 'created' && (
            <button
              onClick={handleTrain}
              disabled={trainModel.isPending}
              className="flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-bold text-black shadow-lg shadow-white/10 transition-all hover:bg-zinc-200 hover:shadow-xl hover:shadow-white/20 active:scale-95 disabled:opacity-50"
            >
              <Play className="h-5 w-5 fill-current" />
              {trainModel.isPending ? "Starting..." : "Start Training"}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Data & Stats */}
          <div className="lg:col-span-1 space-y-8">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
                <Settings2 className="h-5 w-5 text-indigo-400" /> Configuration
              </h3>
              <dl className="space-y-4 text-sm">
                <div className="flex justify-between border-b border-zinc-800/50 pb-4">
                  <dt className="text-zinc-400">Total Steps</dt>
                  <dd className="font-mono text-zinc-200">{model.totalSteps}</dd>
                </div>
                <div className="flex justify-between border-b border-zinc-800/50 pb-4">
                  <dt className="text-zinc-400">Created At</dt>
                  <dd className="font-mono text-zinc-200">{new Date(model.createdAt).toLocaleDateString()}</dd>
                </div>
                <div>
                  <dt className="text-zinc-400 mb-2">Dataset Snippet</dt>
                  <dd className="font-mono text-xs text-emerald-400/80 bg-zinc-950 p-3 rounded-lg border border-zinc-800/80 max-h-40 overflow-y-auto terminal-scrollbar whitespace-pre-wrap">
                    {model.dataset}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Right Column: Training Progress & Inference */}
          <div className="lg:col-span-2 space-y-8">
            {model.status === 'training' && (
              <TrainingProgress model={model} />
            )}

            {model.status === 'trained' && (
              <InferencePanel modelId={model.id} />
            )}
            
            {model.status === 'created' && (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/20 text-center p-8">
                <Cpu className="h-16 w-16 text-zinc-700 mb-6" />
                <h3 className="text-xl font-bold text-white mb-2">Model is ready</h3>
                <p className="max-w-md text-zinc-400">
                  The architecture is initialized and the dataset is prepared. Click "Start Training" to begin the optimization process.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'created':
      return (
        <span className="flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-800/80 px-4 py-1.5 text-sm font-medium text-zinc-300">
          <div className="h-2 w-2 rounded-full bg-zinc-500" /> Ready
        </span>
      );
    case 'training':
      return (
        <span className="flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-400 animate-train-pulse shadow-[0_0_15px_rgba(99,102,241,0.2)]">
          <Activity className="h-4 w-4" /> Training Active
        </span>
      );
    case 'trained':
      return (
        <span className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-400">
          <CheckCircle2 className="h-4 w-4" /> Fully Trained
        </span>
      );
    default:
      return null;
  }
}

function TrainingProgress({ model }: { model: any }) {
  const progress = Math.min(100, Math.round((model.currentStep / model.totalSteps) * 100)) || 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-indigo-500/20 bg-zinc-900/60 p-8 shadow-2xl shadow-indigo-500/10 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-zinc-800">
        <motion.div 
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ ease: "easeOut", duration: 0.5 }}
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 mb-8">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">Optimization Loop</h3>
          <p className="text-sm text-zinc-400">Processing batches, calculating gradients...</p>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-zinc-500 mb-1">Current Loss</div>
          <div className="font-mono text-4xl font-bold text-white text-glow">
            {model.currentLoss.toFixed(4)}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="font-medium text-zinc-300">Step {model.currentStep}</span>
          <span className="text-zinc-500">of {model.totalSteps}</span>
        </div>
        <div className="h-4 w-full rounded-full bg-zinc-950 border border-zinc-800 p-0.5">
          <motion.div 
            className="h-full rounded-full bg-indigo-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ ease: "easeOut", duration: 0.5 }}
          />
        </div>
      </div>
    </motion.div>
  );
}

function InferencePanel({ modelId }: { modelId: number }) {
  const [samples, setSamples] = useState<string[]>([]);
  const inference = useInference();
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(api.models.inference.input),
    defaultValues: {
      temperature: 0.8,
      numSamples: 5,
    }
  });

  const onSubmit = (data: z.infer<typeof api.models.inference.input>) => {
    inference.mutate(
      { id: modelId, params: data },
      {
        onSuccess: (res) => {
          setSamples(res.samples);
          toast({ title: "Generated successfully!" });
        },
        onError: (err) => toast({ title: "Inference failed", description: err.message, variant: "destructive" })
      }
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-zinc-800 bg-zinc-900/40 shadow-xl overflow-hidden"
    >
      <div className="border-b border-zinc-800 bg-zinc-900/80 px-6 py-4 flex items-center gap-3">
        <TerminalSquare className="h-5 w-5 text-indigo-400" />
        <h3 className="text-lg font-bold text-white">Model Interface</h3>
      </div>
      
      <div className="p-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-6 items-end bg-zinc-950 p-5 rounded-2xl border border-zinc-800/80">
          <div className="space-y-3">
            <label className="flex items-center justify-between text-sm font-medium text-zinc-300">
              Temperature
              <span className="font-mono text-xs text-indigo-400">{form.watch("temperature")}</span>
            </label>
            <input
              type="range"
              min="0.1" max="2.0" step="0.1"
              {...form.register("temperature", { valueAsNumber: true })}
              className="w-full accent-indigo-500"
            />
          </div>
          
          <div className="space-y-3">
            <label className="text-sm font-medium text-zinc-300 block">Samples to generate</label>
            <input
              type="number" min="1" max="50"
              {...form.register("numSamples", { valueAsNumber: true })}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={inference.isPending}
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500 active:scale-95 disabled:opacity-50"
          >
            {inference.isPending ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <>
                <Sparkles className="h-4 w-4 transition-transform group-hover:scale-110 group-hover:text-indigo-200" />
                Generate
              </>
            )}
          </button>
        </form>

        <div className="space-y-4">
          <h4 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Output Generation</h4>
          
          {samples.length > 0 ? (
            <div className="grid gap-3">
              {samples.map((sample, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-emerald-500/20 bg-zinc-950 p-4 font-mono text-emerald-400 text-sm leading-relaxed whitespace-pre-wrap break-words"
                >
                  {sample || " "}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 p-12 text-center text-zinc-500 flex flex-col items-center">
              <TerminalSquare className="h-10 w-10 mb-3 opacity-20" />
              Adjust parameters and click Generate to see what the model learned.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
