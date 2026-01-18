'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog as Modal,
  DialogContent as ModalContent,
  DialogFooter as ModalFooter,
} from '@/components/ui/dialog';
import { badge, card, dialog, text } from '@/components/ui/design-tokens';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface FileEditorModalProps {
  open: boolean;
  path: string;
  content: string;
  language: string;
  saving: boolean;
  onClose: () => void;
  onChangeContent: (value: string) => void;
  onSave: () => void;
}

export function FileEditorModal({
  open,
  path,
  content,
  language,
  saving,
  onClose,
  onChangeContent,
  onSave,
}: FileEditorModalProps) {
  const fileName = path.split('/').filter(Boolean).pop();

  return (
    <Modal open={open} onOpenChange={(isOpen) => (!isOpen ? onClose() : undefined)}>
      <ModalContent
        className={`max-w-6xl w-[96vw] max-h-[90vh] ${dialog.content} p-0 text-white overflow-hidden`}
      >
        <div className={`${dialog.header} flex flex-row items-center justify-between px-6 py-4`}>
          <div className="flex items-center gap-3">
            <span className={badge.base}>Editor</span>
            <div>
              <p className={text.muted}>LiveOS File Manager</p>
              <h2 className={text.headingLarge}>Editing {fileName}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="h-9 px-3 rounded-lg" onClick={onClose}>
              Close
            </Button>
            <Button
              className="h-9 px-4 rounded-lg bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30"
              onClick={onSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-3 bg-white/5">
          <div className={`${text.muted} text-[11px]`}>
            Tip: press <span className="font-semibold text-white/80">Ctrl/⌘ + S</span> to save
          </div>
          <div className={`${card.base} h-[65vh] overflow-hidden border-white/10`}>
            <MonacoEditor
              height="100%"
              language={language}
              theme="vs-dark"
              value={content}
              onChange={(value) => onChangeContent(value ?? '')}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                smoothScrolling: true,
                scrollBeyondLastLine: false,
                wordWrap: 'on',
              }}
            />
          </div>
        </div>

        <ModalFooter className="px-6 py-4 flex items-center justify-between border-t border-white/10 bg-black/20 backdrop-blur">
          <div className={`${text.muted} text-[11px] break-all`}>{path}</div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="h-9 px-3 rounded-lg" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="h-9 px-4 rounded-lg bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30"
              onClick={onSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
