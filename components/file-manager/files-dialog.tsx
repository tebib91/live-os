'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FileCreationRow } from '@/components/file-manager/file-creation-row';
import { FileEditorModal } from '@/components/file-manager/file-editor-modal';
import { FilesContent } from '@/components/file-manager/files-content';
import {
  FilesContextMenu,
  FileClipboardProvider,
  useFileClipboard,
} from '@/components/file-manager/context-menu';
import { NetworkStorageDialog } from '@/components/file-manager/network-storage-dialog';
import { SmbShareDialog } from '@/components/file-manager/smb-share-dialog';
import { FilesSidebar } from '@/components/file-manager/files-sidebar';
import { FilesToolbar } from '@/components/file-manager/files-toolbar';
import { useFilesDialog } from '@/components/file-manager/use-files-dialog';
import { FileViewer, isFileViewable } from '@/components/file-manager/file-viewer';
import type { FileSystemItem } from '@/app/actions/filesystem';
import { trashItem } from '@/app/actions/filesystem';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface FilesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function FilesDialogContent({ open, onOpenChange }: FilesDialogProps) {
  const {
    homePath,
    currentPath,
    viewMode,
    content,
    loading,
    showHidden,
    creatingFolder,
    newFolderName,
    creatingFile,
    newFileName,
    historyIndex,
    historyLength,
    shortcuts,
    favorites,
    filteredItems,
    breadcrumbs,
    contextMenu,
    contextMenuRef,
    editorOpen,
    editorPath,
    editorContent,
    editorOriginalContent,
    editorSaving,
    editorLanguage,
    setViewMode,
    setShowHidden,
    setNewFolderName,
    setNewFileName,
    setEditorContent,
    closeEditor,
    navigate,
    goToParent,
    back,
    forward,
    openItem,
    openContextMenu,
    openFileInEditor,
    saveEditor,
    createFolder,
    createFile,
    renameItem,
    startFileCreation,
    toggleFolderCreation,
    toggleFileCreation,
    cancelFolderCreation,
    cancelFileCreation,
    shortcutPath,
    toDirectoryItem,
    closeContextMenu,
    refresh,
  } = useFilesDialog(open);

  const { clipboard, cut, copy, clear: clearClipboard } = useFileClipboard();
  const [networkDialogOpen, setNetworkDialogOpen] = useState(false);
  const [smbShareDialogOpen, setSmbShareDialogOpen] = useState(false);
  const [shareTargetItem, setShareTargetItem] = useState<FileSystemItem | null>(null);
  const [viewerItem, setViewerItem] = useState<FileSystemItem | null>(null);
  const selectedItem = contextMenu.item;

  const isDirty = editorContent !== editorOriginalContent;

  // Handle opening files - check if viewable first
  const handleOpenItem = useCallback((item: FileSystemItem) => {
    if (item.type === 'file' && isFileViewable(item.name)) {
      setViewerItem(item);
    } else {
      openItem(item);
    }
  }, [openItem]);

  // Handle SMB share dialog
  const handleShareNetwork = useCallback((item: FileSystemItem) => {
    setShareTargetItem(item);
    setSmbShareDialogOpen(true);
  }, []);

  // Handle rename with prompt
  const handleRename = useCallback((item: FileSystemItem) => {
    const newName = prompt(`Rename "${item.name}" to:`, item.name);
    if (!newName || newName === item.name) return;
    renameItem(item);
  }, [renameItem]);

  // Keyboard shortcuts for clipboard operations
  useEffect(() => {
    if (!open || editorOpen) return;

    const handleKeyDown = async (event: KeyboardEvent) => {
      const isMeta = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      const target = contextMenu.item || selectedItem;

      // Cut: Cmd+X
      if (isMeta && key === 'x' && target) {
        event.preventDefault();
        cut([target]);
        toast.success('Item ready to move');
        return;
      }

      // Copy: Cmd+C
      if (isMeta && key === 'c' && target) {
        event.preventDefault();
        copy([target]);
        toast.success('Item copied to clipboard');
        return;
      }

      // Paste: Cmd+V
      if (isMeta && key === 'v' && clipboard.items.length > 0) {
        event.preventDefault();
        // Paste handled by context menu actions hook
        return;
      }

      // Trash: Cmd+Backspace
      if (isMeta && event.key === 'Backspace' && target) {
        event.preventDefault();
        if (!confirm(`Move "${target.name}" to trash?`)) return;
        const result = await trashItem(target.path);
        if (result.success) {
          toast.success('Item moved to trash');
          refresh();
        } else {
          toast.error(result.error || 'Failed to move item to trash');
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, editorOpen, contextMenu.item, selectedItem, clipboard, cut, copy, refresh]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[95vw] sm:max-w-[1400px] max-h-[90vh] bg-white/5 border border-white/10 backdrop-blur-3xl shadow-2xl shadow-black/50 p-0 gap-0 overflow-hidden ring-1 ring-white/5"
        aria-describedby="files-description"
      >
        <div className="flex h-[90vh]">
          <FilesSidebar
            homePath={homePath}
            shortcuts={shortcuts}
            favorites={favorites}
            onNavigate={navigate}
            getShortcutPath={shortcutPath}
            onOpenNetwork={() => setNetworkDialogOpen(true)}
          />

          <div className="flex-1 flex flex-col bg-white/5 backdrop-blur-xl">
            <FilesToolbar
              breadcrumbs={breadcrumbs}
              historyIndex={historyIndex}
              historyLength={historyLength}
            loading={loading}
            showHidden={showHidden}
            viewMode={viewMode}
            canGoToParent={Boolean(content?.parent)}
            onNavigate={navigate}
              onBreadcrumbContextMenu={(event, path, label) =>
                openContextMenu(event, toDirectoryItem(path, label))
              }
            onBack={back}
            onForward={forward}
            onGoToParent={goToParent}
            onToggleHidden={setShowHidden}
            onSetViewMode={setViewMode}
            onToggleCreateFolder={toggleFolderCreation}
            onToggleCreateFile={toggleFileCreation}
            onQuickCreateFile={startFileCreation}
              onClose={() => onOpenChange(false)}
            />

            {creatingFolder && (
              <FileCreationRow
                label="Folder"
                placeholder="Folder name"
                value={newFolderName}
                onChange={setNewFolderName}
                onSubmit={createFolder}
                onCancel={cancelFolderCreation}
              />
            )}

            {creatingFile && (
              <FileCreationRow
                label="File"
                placeholder="File name"
                value={newFileName}
                onChange={setNewFileName}
                onSubmit={createFile}
                onCancel={cancelFileCreation}
              />
            )}

            <FilesContent
              loading={loading}
              viewMode={viewMode}
              items={filteredItems}
              onOpenItem={handleOpenItem}
              onContextMenu={openContextMenu}
            />

            <div className="px-6 py-3 border-t border-zinc-800">
              <div className="text-xs text-white/40 text-right -tracking-[0.01em]">
                {filteredItems.length} items {showHidden && `(${content?.items.length} total)`}
              </div>
            </div>

            <FilesContextMenu
              contextMenu={contextMenu}
              menuRef={contextMenuRef}
              currentPath={currentPath}
              clipboard={clipboard}
              favorites={favorites}
              onCut={cut}
              onCopy={copy}
              onClearClipboard={clearClipboard}
              onRefresh={refresh}
              onOpen={handleOpenItem}
              onOpenInEditor={openFileInEditor}
              onPreview={(item) => setViewerItem(item)}
              onRename={handleRename}
              onShareNetwork={handleShareNetwork}
              onClose={closeContextMenu}
            />
          </div>
        </div>
      </DialogContent>

      <FileEditorModal
        open={editorOpen}
        path={editorPath}
        content={editorContent}
        language={editorLanguage}
        saving={editorSaving}
        isDirty={isDirty}
        onClose={closeEditor}
        onChangeContent={setEditorContent}
        onSave={saveEditor}
      />

      <NetworkStorageDialog open={networkDialogOpen} onOpenChange={setNetworkDialogOpen} />

      <SmbShareDialog
        open={smbShareDialogOpen}
        onOpenChange={setSmbShareDialogOpen}
        targetPath={shareTargetItem?.path || ''}
        targetName={shareTargetItem?.name || ''}
      />

      {viewerItem && (
        <FileViewer
          item={viewerItem}
          onClose={() => setViewerItem(null)}
          allItems={filteredItems}
          onNavigate={setViewerItem}
        />
      )}
    </Dialog>
  );
}

export function FilesDialog(props: FilesDialogProps) {
  return (
    <FileClipboardProvider>
      <FilesDialogContent {...props} />
    </FileClipboardProvider>
  );
}
