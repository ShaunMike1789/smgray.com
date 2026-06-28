export interface LocalDirectorySnapshot {
  children: LocalDirectorySnapshot[];
  fileNames: string[];
  handle: FileSystemDirectoryHandle;
  name: string;
  relativePath: string;
}

export interface LocalFileToolSession {
  descendantDirectoryCount: number;
  directoryHandle: FileSystemDirectoryHandle | null;
  directoryLabel: string | null;
  permissionState: PermissionState | "unsupported";
}

export interface ContentsTxtJob {
  createdCount: number;
  logEntries: string[];
  rootLabel: string;
  scannedFolderCount: number;
  skippedExistingCount: number;
}

export interface PlaylistJob {
  createdCount: number;
  logEntries: string[];
  rootLabel: string;
  scannedFolderCount: number;
  skippedExistingCount: number;
  skippedWithoutMp3Count: number;
}

export interface ContentsTxtPlanItem {
  relativePath: string;
}

export interface PlaylistPlanItem {
  playlistEntries: string[];
  relativePath: string;
}
