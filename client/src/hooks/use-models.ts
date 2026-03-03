import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type ModelResponse, type InferenceInput, type InferenceResponse } from "@shared/routes";
import { z } from "zod";

function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw new Error(`Invalid response format for ${label}`);
  }
  return result.data;
}

export function useModels() {
  return useQuery({
    queryKey: [api.models.list.path],
    queryFn: async () => {
      const res = await fetch(api.models.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch models");
      const data = await res.json();
      return parseWithLogging(api.models.list.responses[200], data, "models.list");
    },
  });
}

export function useModel(id: number) {
  return useQuery({
    queryKey: [api.models.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.models.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch model");
      const data = await res.json();
      return parseWithLogging(api.models.get.responses[200], data, "models.get");
    },
    // Poll every 1s if the model is currently training
    refetchInterval: (query) => {
      return query.state.data?.status === "training" ? 1000 : false;
    },
  });
}

export function useCreateModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.models.create.input>) => {
      const validated = api.models.create.input.parse(data);
      const res = await fetch(api.models.create.path, {
        method: api.models.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      const resData = await res.json();
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.models.create.responses[400].parse(resData);
          throw new Error(error.message);
        }
        throw new Error("Failed to create model");
      }
      return parseWithLogging(api.models.create.responses[201], resData, "models.create");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.models.list.path] });
    },
  });
}

export function useTrainModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.models.train.path, { id });
      const res = await fetch(url, {
        method: api.models.train.method,
        credentials: "include",
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to start training");
      }
      return parseWithLogging(api.models.train.responses[200], data, "models.train");
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [api.models.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.models.get.path, id] });
    },
  });
}

export function useInference() {
  return useMutation({
    mutationFn: async ({ id, params }: { id: number; params: InferenceInput }) => {
      const validatedParams = api.models.inference.input.parse(params);
      const url = buildUrl(api.models.inference.path, { id });
      
      const res = await fetch(url, {
        method: api.models.inference.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validatedParams),
        credentials: "include",
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Inference failed");
      }
      return parseWithLogging(api.models.inference.responses[200], data, "models.inference");
    },
  });
}

export function useDeleteModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.models.delete.path, { id });
      const res = await fetch(url, {
        method: api.models.delete.method,
        credentials: "include",
      });
      if (!res.ok && res.status !== 404) {
        throw new Error("Failed to delete model");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.models.list.path] });
    },
  });
}
