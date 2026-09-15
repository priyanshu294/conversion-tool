import { jsPDF } from "jspdf";

export const generatePDF = async (files: File[]): Promise<Blob> => {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < files.length; i++) {
    if (i > 0) {
      pdf.addPage();
    }

    const file = files[i];
    const dataUrl = await readFileAsDataURL(file);
    const imgProps = await getImageProperties(dataUrl);

    // Calculate dimensions to fit the image on the page while preserving aspect ratio
    const imgWidth = imgProps.width;
    const imgHeight = imgProps.height;
    
    // Check if image is larger than the page, if so we scale down, otherwise we can optionally keep its size
    // For consistency, let's scale it so it fits perfectly on A4 with a small margin, or just fill the page.
    // Let's leave a 10mm margin
    const margin = 10;
    const maxW = pageWidth - margin * 2;
    const maxH = pageHeight - margin * 2;
    
    const ratio = Math.min(maxW / imgWidth, maxH / imgHeight);
    const finalWidth = imgWidth * ratio;
    const finalHeight = imgHeight * ratio;

    // Center the image
    const x = (pageWidth - finalWidth) / 2;
    const y = (pageHeight - finalHeight) / 2;

    pdf.addImage(dataUrl, imgProps.type, x, y, finalWidth, finalHeight);
  }

  return pdf.output("blob");
};

const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
};

const getImageProperties = (dataUrl: string): Promise<{ width: number, height: number, type: string }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Extract type from DataURL
      const match = dataUrl.match(/^data:image\/(jpeg|png);/);
      let type = "JPEG"; // default fallback
      if (match && match[1]) {
        type = match[1].toUpperCase();
      }
      resolve({ width: img.width, height: img.height, type });
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });
};
