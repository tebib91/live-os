'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog as Modal,
  DialogContent as ModalContent,
  DialogFooter as ModalFooter,
  DialogHeader as ModalHeader,
  DialogTitle as ModalTitle,
} from '@/components/ui/dialog';
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
      <ModalContent className="max-w-6xl w-[96vw] max-h-[90vh] bg-[#05050a]/95 text-white border border-white/10 backdrop-blur-3xl shadow-2xl shadow-black/60 overflow-hidden">
        <ModalHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <ModalTitle className="text-xl font-semibold">Editing {fileName}</ModalTitle>
            <p className="text-xs text-white/50 mt-1 break-all">{path}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="h-9 px-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/80"
              onClick={onClose}
            >
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
        </ModalHeader>
        <div className="px-2 pb-4">
          <div className="text-[11px] text-white/50 mb-2">
            Tip: press <span className="font-semibold text-white/80">Ctrl/⌘ + S</span> to save
          </div>
          <div className="h-[65vh] rounded-lg border border-white/10 overflow-hidden bg-black/60">
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
        <ModalFooter className="px-6 pb-6 pt-0 flex justify-between">
          <div className="text-xs text-white/40">{path}</div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="h-9 px-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/80"
              onClick={onClose}
            >
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
