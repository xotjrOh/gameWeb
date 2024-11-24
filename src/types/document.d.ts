export declare global {
  interface Document {
    webkitExitFullscreen?: () => Promise<void>;
    webkitFullscreenElement?: Element | null;
    mozCancelFullScreen?: () => Promise<void>;
    mozFullScreenElement?: Element | null;
    msExitFullscreen?: () => Promise<void>;
    msFullscreenElement?: Element | null;
  }
}
