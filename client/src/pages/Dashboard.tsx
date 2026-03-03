import { useState, useRef } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatDistanceToNow } from "date-fns";
import { Brain, Plus, Sparkles, Activity, CheckCircle2, Terminal, Trash2, X, Upload, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useModels, useCreateModel, useDeleteModel } from "@/hooks/use-models";
import { insertModelSchema } from "@shared/routes";
import type { InsertModel } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

export default function Dashboard() {
  const { data: models, isLoading } = useModels();
  const deleteModel = useDeleteModel();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Your Models
            </h1>
            <p className="text-lg text-muted-foreground">
              Train custom language models on your own datasets.
            </p>
          </div>
          
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="group flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-black transition-all hover:bg-zinc-200 active:scale-95"
            data-testid="button-create-model-open"
          >
            <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
            Create Model
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-zinc-900/50 border border-zinc-800/50" />
            ))}
          </div>
        ) : !models || models.length === 0 ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/20 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-900 shadow-xl border border-zinc-800">
              <Sparkles className="h-10 w-10 text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-white">No models yet</h3>
            <p className="mt-2 max-w-md text-zinc-400">
              Get started by creating your first custom language model. Upload a text dataset and watch it learn.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {models.map((model) => (
                <motion.div
                  key={model.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="group relative"
                >
                  <Link href={`/models/${model.id}`} className="block h-full" data-testid={`link-model-${model.id}`}>
                    <div className="flex h-full flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900 hover:shadow-xl hover:shadow-indigo-500/5">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800 text-indigo-400">
                            <Brain className="h-6 w-6" />
                          </div>
                          <StatusBadge status={model.status} />
                        </div>
                        
                        <div>
                          <h3 className="text-xl font-bold text-white">{model.name}</h3>
                          <p className="mt-1 text-sm text-zinc-500 line-clamp-2">
                            {model.dataset.substring(0, 100)}...
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-8 flex items-center justify-between border-t border-zinc-800/80 pt-4">
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <Terminal className="h-4 w-4" />
                          {model.totalSteps} steps
                        </div>
                        <div className="text-xs text-zinc-600">
                          {formatDistanceToNow(new Date(model.createdAt), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  </Link>

                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      if (confirm('Are you sure you want to delete this model?')) {
                        deleteModel.mutate(model.id);
                      }
                    }}
                    className="absolute right-4 top-4 z-10 rounded-lg p-2 text-zinc-500 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                    data-testid={`button-delete-model-${model.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      <CreateModelModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'created':
      return (
        <span className="flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800/50 px-3 py-1 text-xs font-medium text-zinc-300">
          <div className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
          Ready to train
        </span>
      );
    case 'training':
      return (
        <span className="flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400 animate-pulse">
          <Activity className="h-3 w-3" />
          Training
        </span>
      );
    case 'trained':
      return (
        <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
          <CheckCircle2 className="h-3 w-3" />
          Trained
        </span>
      );
    default:
      return null;
  }
}

function CreateModelModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const createModel = useCreateModel();
  const { toast } = useToast();
  const [inputMode, setInputMode] = useState<"paste" | "upload">("paste");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/models/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/models"] });
      toast({ title: "Model created successfully" });
      resetAndClose();
    },
    onError: (error: Error) => {
      toast({ title: "Error creating model", description: error.message, variant: "destructive" });
    }
  });
  
  const form = useForm<InsertModel>({
    resolver: zodResolver(insertModelSchema),
    defaultValues: {
      name: "",
      dataset: "",
      totalSteps: 1000,
    }
  });

  const resetAndClose = () => {
    form.reset();
    setUploadedFile(null);
    setInputMode("paste");
    onClose();
  };

  if (!isOpen) return null;

  const onSubmit = (data: InsertModel) => {
    createModel.mutate(data, {
      onSuccess: () => {
        toast({ title: "Model created successfully" });
        resetAndClose();
      },
      onError: (error) => {
        toast({ title: "Error creating model", description: error.message, variant: "destructive" });
      }
    });
  };

  const onUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedFile) {
      toast({ title: "Please select a file", variant: "destructive" });
      return;
    }
    const name = form.getValues("name");
    if (!name) {
      toast({ title: "Please enter a model name", variant: "destructive" });
      return;
    }
    const formData = new FormData();
    formData.append("file", uploadedFile);
    formData.append("name", name);
    formData.append("totalSteps", String(form.getValues("totalSteps") || 1000));
    uploadMutation.mutate(formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.name.endsWith('.txt') || file.name.endsWith('.csv') || file.type === 'text/plain') {
        setUploadedFile(file);
      } else {
        toast({ title: "Only .txt and .csv files are supported", variant: "destructive" });
      }
    }
  };

  const isPending = createModel.isPending || uploadMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={resetAndClose}
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl sm:p-8"
      >
        <button onClick={resetAndClose} className="absolute right-6 top-6 rounded-full p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors" data-testid="button-close-modal">
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-2xl font-bold text-white">Create New Model</h2>
        <p className="mt-2 text-zinc-400">Provide your text dataset to train a custom mini GPT.</p>

        <form onSubmit={inputMode === "paste" ? form.handleSubmit(onSubmit) : onUploadSubmit} className="mt-8 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Model Name</label>
            <input
              {...form.register("name")}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              placeholder="e.g., Shakespeare Bot"
              data-testid="input-model-name"
            />
            {form.formState.errors.name && <p className="text-sm text-red-400">{form.formState.errors.name.message}</p>}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-300">Training Dataset</label>
              <div className="flex rounded-lg border border-zinc-800 bg-zinc-900/50 p-0.5">
                <button
                  type="button"
                  onClick={() => setInputMode("paste")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${inputMode === "paste" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
                  data-testid="button-mode-paste"
                >
                  <Terminal className="h-3 w-3" />
                  Paste
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode("upload")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${inputMode === "upload" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
                  data-testid="button-mode-upload"
                >
                  <Upload className="h-3 w-3" />
                  Upload File
                </button>
              </div>
            </div>

            {inputMode === "paste" ? (
              <div className="space-y-2">
                <textarea
                  {...form.register("dataset")}
                  rows={8}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 font-mono text-sm text-emerald-400 placeholder:font-sans placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                  placeholder="Paste your text dataset here..."
                  data-testid="input-dataset"
                />
                {form.formState.errors.dataset && <p className="text-sm text-red-400">{form.formState.errors.dataset.message}</p>}
              </div>
            ) : (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all ${
                  uploadedFile
                    ? "border-emerald-500/50 bg-emerald-500/5"
                    : "border-zinc-700 bg-zinc-900/30 hover:border-zinc-600 hover:bg-zinc-900/50"
                }`}
                data-testid="dropzone-upload"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.csv,text/plain"
                  onChange={handleFileChange}
                  className="hidden"
                  data-testid="input-file"
                />
                {uploadedFile ? (
                  <div className="flex flex-col items-center gap-3 p-6 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                      <FileText className="h-7 w-7 text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white" data-testid="text-filename">{uploadedFile.name}</p>
                      <p className="mt-1 text-sm text-zinc-500">
                        {(uploadedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="mt-1 text-xs text-zinc-400 underline hover:text-red-400 transition-colors"
                      data-testid="button-remove-file"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 p-6 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800">
                      <Upload className="h-7 w-7 text-zinc-400" />
                    </div>
                    <div>
                      <p className="font-medium text-zinc-300">Drop your file here or click to browse</p>
                      <p className="mt-1 text-sm text-zinc-500">Supports .txt and .csv files up to 5MB</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Total Training Steps</label>
            <input
              type="number"
              {...form.register("totalSteps", { valueAsNumber: true })}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              data-testid="input-total-steps"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={resetAndClose}
              className="rounded-xl px-5 py-3 font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
              data-testid="button-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500 hover:shadow-indigo-500/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-create-model"
            >
              {isPending ? "Creating..." : "Create Model"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
