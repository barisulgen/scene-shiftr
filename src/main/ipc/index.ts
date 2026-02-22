import { registerWorkspaceHandlers } from './workspace';
import { registerProcessHandlers } from './process';
import { registerSystemHandlers } from './system';
import { registerAudioHandlers } from './audio';
import { registerDisplayHandlers } from './display';
import { registerShellHandlers } from './shell';
import { registerSettingsHandlers } from './settings';

export function registerAllHandlers(): void {
  registerWorkspaceHandlers();
  registerProcessHandlers();
  registerSystemHandlers();
  registerAudioHandlers();
  registerDisplayHandlers();
  registerShellHandlers();
  registerSettingsHandlers();
}
