import { db } from "./db";
import { models, type Model, type InsertModel } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getModels(): Promise<Model[]>;
  getModel(id: number): Promise<Model | undefined>;
  createModel(model: InsertModel): Promise<Model>;
  updateModel(id: number, updates: Partial<Model>): Promise<Model>;
  deleteModel(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getModels(): Promise<Model[]> {
    return await db.select().from(models);
  }

  async getModel(id: number): Promise<Model | undefined> {
    const [model] = await db.select().from(models).where(eq(models.id, id));
    return model;
  }

  async createModel(insertModel: InsertModel): Promise<Model> {
    const [model] = await db.insert(models).values(insertModel).returning();
    return model;
  }

  async updateModel(id: number, updates: Partial<Model>): Promise<Model> {
    const [model] = await db
      .update(models)
      .set(updates)
      .where(eq(models.id, id))
      .returning();
    return model;
  }

  async deleteModel(id: number): Promise<void> {
    await db.delete(models).where(eq(models.id, id));
  }
}

export const storage = new DatabaseStorage();
