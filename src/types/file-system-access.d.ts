export {};

declare global {
  type FileSystemPermissionMode = "read" | "readwrite";

  interface FileSystemHandlePermissionDescriptor {
    mode?: FileSystemPermissionMode;
  }

  interface FileSystemHandle {
    readonly kind: "file" | "directory";
    readonly name: string;
    queryPermission(
      descriptor?: FileSystemHandlePermissionDescriptor,
    ): Promise<PermissionState>;
    requestPermission(
      descriptor?: FileSystemHandlePermissionDescriptor,
    ): Promise<PermissionState>;
  }

  interface FileSystemFileHandle extends FileSystemHandle {
    createWritable(): Promise<FileSystemWritableFileStream>;
    getFile(): Promise<File>;
  }

  interface FileSystemDirectoryHandle extends FileSystemHandle {
    entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
    getDirectoryHandle(
      name: string,
      options?: { create?: boolean },
    ): Promise<FileSystemDirectoryHandle>;
    getFileHandle(
      name: string,
      options?: { create?: boolean },
    ): Promise<FileSystemFileHandle>;
    values(): AsyncIterableIterator<FileSystemHandle>;
  }

  interface FileSystemWritableFileStream extends WritableStream {
    close(): Promise<void>;
    write(data: BufferSource | Blob | string): Promise<void>;
  }

  interface Window {
    showDirectoryPicker(options?: {
      id?: string;
      mode?: FileSystemPermissionMode;
    }): Promise<FileSystemDirectoryHandle>;
  }
}
