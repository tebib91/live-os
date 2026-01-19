'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FileCreationRow } from '@/components/file-manager/file-creation-row';
import { FileEditorModal } from '@/components/file-manager/file-editor-modal';
import { FilesContent } from '@/components/file-manager/files-content';
import { FilesContextMenu } from '@/components/file-manager/file-context-menu';
import { NetworkStorageDialog } from '@/components/file-manager/network-storage-dialog';
import { FilesSidebar } from '@/components/file-manager/files-sidebar';
import { FilesToolbar } from '@/components/file-manager/files-toolbar';
import { useFilesDialog } from '@/components/file-manager/use-files-dialog';
import { useState } from 'react';

interface FilesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FilesDialog({ open, onOpenChange }: FilesDialogProps) {
  const {
    homePath,
    currentPath,
    viewMode,
    content,
    loading,
    openingNative,
    showHidden,
    creatingFolder,
    newFolderName,
    creatingFile,
    newFileName,
    historyIndex,
    historyLength,
    shortcuts,
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
    openNative,
    openItem,
    openContextMenu,
    share,
    info,
    openFileInEditor,
    saveEditor,
    createFolder,
    createFile,
    deleteItem,
    renameItem,
    startFileCreation,
    toggleFolderCreation,
    toggleFileCreation,
    cancelFolderCreation,
    cancelFileCreation,
    shortcutPath,
    toDirectoryItem,
    closeContextMenu,
    isTextLike,
  } = useFilesDialog(open);
  const [networkDialogOpen, setNetworkDialogOpen] = useState(false);

  const isDirty = editorContent !== editorOriginalContent;

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
              openingNative={openingNative}
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
              onOpenNative={() => openNative(currentPath)}
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
              onOpenItem={openItem}
              onOpenNative={openNative}
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
              isTextLike={isTextLike}
              onOpen={openItem}
              onOpenInEditor={openFileInEditor}
              onRename={renameItem}
              onDelete={deleteItem}
              onShare={share}
              onInfo={info}
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
    </Dialog>
  );
}
