# LLM Trainer

A full-stack web application that lets users train and run inference on miniature GPT models using Andrej Karpathy's pure Python implementation.

## Architecture

- **Frontend**: React + Vite with TailwindCSS, TanStack Query, wouter routing, framer-motion
- **Backend**: Express.js with PostgreSQL (Drizzle ORM)
- **ML Engine**: Pure Python GPT implementation (`custom_llm.py`) based on Karpathy's gist, spawned as child processes

## Key Features

- Create models with text datasets (paste or file upload via multer)
- Train models with live progress tracking (polling every 1s)
- Run inference with temperature control to generate new text
- Dark mode UI with monospace output styling

## Structure

- `shared/schema.ts` - Drizzle database schema (models table)
- `shared/routes.ts` - API contract with Zod validation
- `server/routes.ts` - Express API routes including file upload endpoint
- `server/storage.ts` - DatabaseStorage class for CRUD operations
- `server/db.ts` - PostgreSQL connection via drizzle-orm
- `custom_llm.py` - Pure Python GPT: training + inference (spawned by server)
- `client/src/pages/Dashboard.tsx` - Model list + create modal with file upload
- `client/src/pages/ModelDetails.tsx` - Training progress + inference UI
- `client/src/hooks/use-models.ts` - TanStack Query hooks

## API Endpoints

- `GET /api/models` - List all models
- `GET /api/models/:id` - Get model details
- `POST /api/models` - Create model (JSON body)
- `POST /api/models/upload` - Create model with file upload (multipart/form-data)
- `POST /api/models/:id/train` - Start training
- `POST /api/models/:id/inference` - Run inference
- `DELETE /api/models/:id` - Delete model
