declare module "qrcode" {
  export interface QRCodeToBufferOptions {
    type?: string;
    width?: number;
  }

  const QRCode: {
    toBuffer(text: string, options?: QRCodeToBufferOptions): Promise<Buffer>;
  };

  export default QRCode;
}
