export {};

declare global {
  interface Window {
    electronShell?: {
      isElectron: boolean;
      minimize?: () => void;
      close?: () => void;
      setPinned?: (pinned: boolean) => Promise<boolean>;
    };
  }
}
