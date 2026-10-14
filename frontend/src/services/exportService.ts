import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { Report } from "../types";

/**
 * Renders the given DOM element to a high-resolution multi-page PDF document.
 */
export async function exportReportToPDF(elementId: string, report: Report): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error("Report element not found for PDF generation.");
  }

  // Temporary styling adjustments for clean print rendering
  const originalBackground = element.style.background;
  element.classList.add("pdf-exporting");

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#f7f9f8",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pdfWidth - 20; // 10mm margins
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 10;

    // First page
    pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight - 20;

    // Multi-page handling if report is tall
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + 10;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight - 20;
    }

    const safeName = report.region.name.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `Climate_Hazard_Report_${safeName}_${report.selection.start_year}-${report.selection.end_year}.pdf`;
    pdf.save(filename);
  } finally {
    element.style.background = originalBackground;
    element.classList.remove("pdf-exporting");
  }
}
