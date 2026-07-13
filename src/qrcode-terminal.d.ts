declare module 'qrcode-terminal/vendor/QRCode' {
  interface QrCodeInstance {
    addData(data: string): void;
    make(): void;
    getModuleCount(): number;
    isDark(row: number, col: number): boolean;
  }

  interface QrCodeConstructor {
    new (typeNumber: number, errorCorrectLevel: number): QrCodeInstance;
  }

  const QRCode: QrCodeConstructor;
  export default QRCode;
}

declare module 'qrcode-terminal/vendor/QRCode/QRErrorCorrectLevel' {
  const QRErrorCorrectLevel: {
    L: number;
    M: number;
    Q: number;
    H: number;
  };

  export default QRErrorCorrectLevel;
}
