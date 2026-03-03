import { pgTable, text, serial, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const models = pgTable("models", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  dataset: text("dataset").notNull(),
  status: text("status").notNull().default("created"), // created, training, trained
  currentStep: integer("current_step").default(0),
  totalSteps: integer("total_steps").default(1000),
  currentLoss: real("current_loss").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertModelSchema = createInsertSchema(models).pick({
  name: true,
  dataset: true,
  totalSteps: true,
});

export type Model = typeof models.$inferSelect;
export type InsertModel = z.infer<typeof insertModelSchema>;
