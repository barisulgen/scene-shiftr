import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { Workspace } from '../../shared/types';
import { createEmptyWorkspace } from '../../shared/constants';

let storageDir = '';

/**
 * Set the storage directory for workspace files.
 * Call this from main.ts at startup with the resolved appData path.
 */
export function setStorageDir(dir: string): void {
  storageDir = dir;
}

/**
 * Get the current storage directory.
 */
function getStorageDir(): string {
  return storageDir;
}

/**
 * Ensure the workspace directory exists, creating it if necessary.
 */
export async function ensureWorkspaceDir(): Promise<void> {
  const dir = getStorageDir();
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

/**
 * List all workspaces, sorted by their order field.
 */
export async function listWorkspaces(): Promise<Workspace[]> {
  await ensureWorkspaceDir();

  const dir = getStorageDir();
  const entries = await fs.readdir(dir);
  const jsonFiles = entries.filter((f) => f.endsWith('.json'));

  if (jsonFiles.length === 0) {
    return [];
  }

  const workspaces: Workspace[] = [];
  for (const file of jsonFiles) {
    try {
      const filePath = path.join(dir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      workspaces.push(JSON.parse(content) as Workspace);
    } catch (err) {
      console.error(`Failed to read workspace file ${file}, skipping:`, err);
    }
  }

  workspaces.sort((a, b) => a.order - b.order);
  return workspaces;
}

/**
 * Get a single workspace by its ID.
 */
export async function getWorkspace(id: string): Promise<Workspace> {
  await ensureWorkspaceDir();

  const dir = getStorageDir();
  const filePath = path.join(dir, `${id}.json`);
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content) as Workspace;
}

/**
 * Create a new workspace with the given partial data.
 * Generates a UUID, fills in defaults, assigns order, and persists to disk.
 */
export async function createWorkspace(
  data: Partial<Workspace>,
): Promise<Workspace> {
  await ensureWorkspaceDir();

  const dir = getStorageDir();
  const id = uuidv4();

  // Determine order based on existing workspace count
  const entries = await fs.readdir(dir);
  const jsonFiles = entries.filter((f) => f.endsWith('.json'));
  const order = jsonFiles.length;

  // Start from empty defaults, then merge in all provided data
  const workspace: Workspace = {
    ...createEmptyWorkspace(id, data.name ?? 'Untitled', order),
    ...data,
    id, // Always use generated id
    order, // Always use computed order
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const filePath = path.join(dir, `${id}.json`);
  await fs.writeFile(filePath, JSON.stringify(workspace, null, 2), 'utf-8');

  return workspace;
}

/**
 * Update an existing workspace by merging partial data.
 * The id and createdAt fields are preserved; updatedAt is refreshed.
 */
export async function updateWorkspace(
  id: string,
  data: Partial<Workspace>,
): Promise<Workspace> {
  await ensureWorkspaceDir();

  const dir = getStorageDir();
  const filePath = path.join(dir, `${id}.json`);
  const content = await fs.readFile(filePath, 'utf-8');
  const existing = JSON.parse(content) as Workspace;

  const updated: Workspace = {
    ...existing,
    ...data,
    id: existing.id, // Prevent id from being changed
    createdAt: existing.createdAt, // Preserve original createdAt
    updatedAt: new Date().toISOString(),
  };

  await fs.writeFile(filePath, JSON.stringify(updated, null, 2), 'utf-8');

  return updated;
}

/**
 * Create the default workspace with system state from the current environment.
 * The default workspace has isDefault: true, order: -1, no apps/folders/URLs.
 */
export async function createDefaultWorkspace(systemState: {
  audioDevice: string;
  volume: number;
  wallpaper: string;
}): Promise<Workspace> {
  await ensureWorkspaceDir();

  const dir = getStorageDir();
  const id = uuidv4();
  const now = new Date().toISOString();

  const workspace: Workspace = {
    ...createEmptyWorkspace(id, 'Default', -1),
    isDefault: true,
    icon: '\u{1F3E0}',
    order: -1,
    createdAt: now,
    updatedAt: now,
    system: {
      focusAssist: null,
      audioDevice: systemState.audioDevice || null,
      volume: systemState.volume ?? null,
    },
    display: {
      wallpaper: systemState.wallpaper || null,
    },
  };

  const filePath = path.join(dir, `${id}.json`);
  await fs.writeFile(filePath, JSON.stringify(workspace, null, 2), 'utf-8');

  return workspace;
}

/**
 * Find and return the default workspace (isDefault: true).
 * Returns null if no default workspace exists.
 */
export async function getDefaultWorkspace(): Promise<Workspace | null> {
  const workspaces = await listWorkspaces();
  return workspaces.find((w) => w.isDefault) ?? null;
}

/**
 * Delete a workspace by its ID (removes the JSON file).
 * Throws if attempting to delete the default workspace.
 */
export async function deleteWorkspace(id: string): Promise<void> {
  await ensureWorkspaceDir();

  const dir = getStorageDir();
  const filePath = path.join(dir, `${id}.json`);

  // Prevent deletion of default workspace
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const workspace = JSON.parse(content) as Workspace;
    if (workspace.isDefault) {
      throw new Error('Cannot delete the default workspace');
    }
  } catch (err) {
    if (err instanceof Error && err.message === 'Cannot delete the default workspace') {
      throw err;
    }
    // If file doesn't exist, unlink below will throw appropriately
  }

  await fs.unlink(filePath);
}

/**
 * Reorder workspaces by updating each workspace's order field
 * to match its index in the provided array of IDs.
 */
export async function reorderWorkspaces(ids: string[]): Promise<void> {
  if (ids.length === 0) {
    return;
  }

  await ensureWorkspaceDir();

  const dir = getStorageDir();

  for (let i = 0; i < ids.length; i++) {
    const filePath = path.join(dir, `${ids[i]}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    const workspace = JSON.parse(content) as Workspace;
    // Default workspace always stays at order -1
    workspace.order = workspace.isDefault ? -1 : i;
    await fs.writeFile(filePath, JSON.stringify(workspace, null, 2), 'utf-8');
  }
}
