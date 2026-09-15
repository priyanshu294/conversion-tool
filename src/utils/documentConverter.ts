import { jsPDF } from "jspdf";
import mammoth from "mammoth";
import { Document, Packer, Paragraph, TextRun } from "docx";

export const convertWordToPdf = async (file: File): Promise<Blob> => {
  // 1. Extract text from Word document using Mammoth
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const text = result.value;

  // 2. Create PDF and add the extracted text
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const margin = 15;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const maxLineWidth = pageWidth - margin * 2;
  
  // Split text to fit page width
  const lines = pdf.splitTextToSize(text || "No text found in document.", maxLineWidth);
  
  let cursorY = margin;
  for (let i = 0; i < lines.length; i++) {
    // Add new page if we reach the bottom
    if (cursorY > pdf.internal.pageSize.getHeight() - margin) {
      pdf.addPage();
      cursorY = margin;
    }
    pdf.text(lines[i], margin, cursorY);
    cursorY += 7; // line height spacing
  }

  return pdf.output("blob");
};

export const convertPdfToWord = async (file: File): Promise<Blob> => {
  // Dynamically import pdfjs legacy build to prevent Next.js Webpack evaluation crashes
  // @ts-expect-error - TS cannot find declaration file for the minified legacy path
  const pdfjsModule = await import("pdfjs-dist/legacy/build/pdf.min.mjs");
  const pdfjsLib = pdfjsModule.default || pdfjsModule;
  if (typeof window !== "undefined") {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  }

  // 1. Extract text from PDF using PDF.js
  const arrayBuffer = await file.arrayBuffer();
  const typedArray = new Uint8Array(arrayBuffer);
  const loadingTask = pdfjsLib.getDocument({ data: typedArray });
  const pdf = await loadingTask.promise;
  
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // Concatenate all text items on this page
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const strings = content.items.map((item: any) => item.str);
    fullText += strings.join(" ") + "\n\n";
  }

  if (!fullText.trim()) {
    fullText = "No text found in PDF.";
  }

  // 2. Create DOCX using docx library
  // Split by newlines and create a paragraph for each to maintain basic structure
  const paragraphs = fullText.split('\n').map(line => {
    return new Paragraph({
      children: [new TextRun(line)]
    });
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children: paragraphs
    }]
  });

  // Export to Blob
  return await Packer.toBlob(doc);
};
