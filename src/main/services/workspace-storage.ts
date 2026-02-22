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
    const filePath = path.join(dir, file);
    const content = await fs.readFile(filePath, 'utf-8');
    workspaces.push(JSON.parse(content) as Workspace);
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
  data: Partial<Pick<Workspace, 'name' | 'icon'>>,
): Promise<Workspace> {
  await ensureWorkspaceDir();

  const dir = getStorageDir();
  const id = uuidv4();

  // Determine order based on existing workspace count
  const entries = await fs.readdir(dir);
  const jsonFiles = entries.filter((f) => f.endsWith('.json'));
  const order = jsonFiles.length;

  const workspace = createEmptyWorkspace(id, data.name ?? 'Untitled', order);

  if (data.icon !== undefined) {
    workspace.icon = data.icon;
  }

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
 * Delete a workspace by its ID (removes the JSON file).
 */
export async function deleteWorkspace(id: string): Promise<void> {
  await ensureWorkspaceDir();

  const dir = getStorageDir();
  const filePath = path.join(dir, `${id}.json`);
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
    workspace.order = i;
    await fs.writeFile(filePath, JSON.stringify(workspace, null, 2), 'utf-8');
  }
}
