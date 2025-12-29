declare module 'pdfkit' {
  class PDFDocument {
    constructor(options?: any);
    pipe(destination: any): any;
    fontSize(size: number): this;
    text(text: string, x?: number, y?: number, options?: any): this;
    moveDown(lines?: number): this;
    font(name: string, size?: number): this;
    end(): void;
    on(event: string, callback: (...args: any[]) => void): this;
    addPage(options?: any): this;
    fillColor(color: string): this;
    rect(x: number, y: number, width: number, height: number): this;
    fill(): this;
    stroke(): this;
    fillAndStroke(fillColor?: string, strokeColor?: string): this;
    lineWidth(width: number): this;
    dash(length: number, options?: any): this;
    lineCap(cap: string): this;
    list(items: string[], x?: number, y?: number, options?: any): this;
    image(src: any, x?: number, y?: number, options?: any): this;
    save(): this;
    restore(): this;
    translate(x: number, y: number): this;
    scale(xFactor: number, yFactor?: number, options?: any): this;
    rotate(angle: number, options?: any): this;
  }
  
  export = PDFDocument;
}
