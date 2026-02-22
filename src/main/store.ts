import Store from 'electron-store';
import { GlobalSettings } from '../shared/types';
import { DEFAULT_SETTINGS } from '../shared/constants';

const store = new Store<GlobalSettings>({
  name: 'settings',
  defaults: DEFAULT_SETTINGS,
});

export function getSettings(): GlobalSettings {
  return store.store;
}

export function updateSettings(partial: Partial<GlobalSettings>): GlobalSettings {
  for (const [key, value] of Object.entries(partial)) {
    store.set(key, value);
  }
  return store.store;
}

export function getActiveWorkspaceId(): string | null {
  return store.get('activeWorkspaceId');
}

export function setActiveWorkspaceId(id: string | null): void {
  store.set('activeWorkspaceId', id);
}

export default store;
