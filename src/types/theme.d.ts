import '@mui/material/styles';

declare module '@mui/material/styles' {
  interface TypeBackground {
    card?: string; // card 속성 추가
    success?: string; // success 속성 추가
    fail?: string; // fail 속성 추가
  }

  interface PaletteOptions {
    border?: {
      success?: string;
      fail?: string;
    };
  }
}
