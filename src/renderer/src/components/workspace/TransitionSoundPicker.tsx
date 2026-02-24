import { useState } from 'react';
import { BUILT_IN_SOUNDS } from '../../../../shared/constants';

interface TransitionSoundPickerProps {
  value: string | null;
  onChange: (soundId: string | null) => void;
}

export default function TransitionSoundPicker({
  value,
  onChange,
}: TransitionSoundPickerProps): JSX.Element {
  const [previewing, setPreviewing] = useState(false);

  const isCustom = value !== null && !BUILT_IN_SOUNDS.some((s) => s.id === value);

  const handleSelectChange = async (selected: string): Promise<void> => {
    if (selected === '') {
      onChange(null);
    } else if (selected === 'custom') {
      try {
        const filePath = await window.api.openFileDialog([
          { name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'flac'] },
        ]);
        if (filePath) {
          onChange(filePath);
        }
      } catch (err) {
        console.error('Failed to browse for audio file:', err);
      }
    } else {
      onChange(selected);
    }
  };

  const handlePreview = async (): Promise<void> => {
    if (!value) return;
    setPreviewing(true);
    try {
      await window.api.previewSound(value);
    } catch {
      /* preview may fail silently */
    } finally {
      setPreviewing(false);
    }
  };

  const handleBrowseCustom = async (): Promise<void> => {
    try {
      const filePath = await window.api.openFileDialog([
        { name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'flac'] },
      ]);
      if (filePath) {
        onChange(filePath);
      }
    } catch (err) {
      console.error('Failed to browse for audio file:', err);
    }
  };

  // Determine dropdown value
  let selectValue = '';
  if (value === null) {
    selectValue = '';
  } else if (isCustom) {
    selectValue = 'custom';
  } else {
    selectValue = value;
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm" style={{ color: 'var(--text-muted)' }}>
        Transition Sound
      </label>
      <div className="flex gap-2">
        <select
          value={selectValue}
          onChange={(e) => handleSelectChange(e.target.value)}
          className="flex-1 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-1"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
            // @ts-expect-error CSS custom property for Tailwind ring color
            '--tw-ring-color': 'var(--accent)',
          }}
        >
          <option value="">None</option>
          {BUILT_IN_SOUNDS.map((sound) => (
            <option key={sound.id} value={sound.id}>
              {sound.name}
            </option>
          ))}
          <option value="custom">Custom...</option>
        </select>
        <button
          type="button"
          onClick={handlePreview}
          disabled={!value || previewing}
          className="shrink-0 px-3 py-2 rounded-md text-sm transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--border)',
            color: 'var(--text-secondary)',
          }}
        >
          {previewing ? (
            <div
              className="w-4 h-4 rounded-full animate-spin"
              style={{
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: 'var(--border)',
                borderTopColor: 'var(--text-muted)',
              }}
            />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path d="M3 3.732a1.5 1.5 0 0 1 2.305-1.265l6.706 4.267a1.5 1.5 0 0 1 0 2.531l-6.706 4.268A1.5 1.5 0 0 1 3 12.267V3.732Z" />
            </svg>
          )}
        </button>
      </div>

      {/* Show custom file path and browse button when custom is selected */}
      {isCustom && (
        <div className="flex items-center gap-2">
          <span
            className="flex-1 px-3 py-1.5 rounded-md text-xs truncate"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'var(--border-light)',
              color: 'var(--text-muted)',
            }}
          >
            {value}
          </span>
          <button
            type="button"
            onClick={handleBrowseCustom}
            className="shrink-0 px-2 py-1.5 rounded-md text-xs transition-colors"
            style={{
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'var(--border)',
              color: 'var(--text-muted)',
            }}
          >
            Change
          </button>
        </div>
      )}
    </div>
  );
}
