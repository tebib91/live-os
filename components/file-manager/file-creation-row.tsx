'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface FileCreationRowProps {
  label: 'Folder' | 'File';
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function FileCreationRow({
  label,
  placeholder,
  value,
  onChange,
  onSubmit,
  onCancel,
}: FileCreationRowProps) {
  return (
    <div className="px-6 py-3 border-b border-white/10 flex items-center gap-2 bg-black/30 backdrop-blur">
      <Input
        placeholder={placeholder}
        aria-label={`${label} name`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onSubmit();
          if (event.key === 'Escape') onCancel();
        }}
        className="bg-white/10 border border-white/15 text-white"
        autoFocus
      />
      <Button
        onClick={onSubmit}
        size="sm"
        className="border border-white/15 bg-white/10 hover:bg-white/20 text-white shadow-sm"
      >
        Create
      </Button>
      <Button
        onClick={onCancel}
        size="sm"
        variant="ghost"
        className="hover:bg-white/10 text-white/80"
      >
        Cancel
      </Button>
    </div>
  );
}
