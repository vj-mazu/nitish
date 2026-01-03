/**
 * Professional PDF Generator for Records Section
 * Enhanced for exact frontend design matching with anti-overlap optimization
 * Handles large datasets (10 lakh+ records) with high performance
 * Uses jsPDF with autoTable for perfect A4 landscape layout
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// A4 dimensions in mm (landscape for more columns)
const PAGE_WIDTH_LANDSCAPE = 297;
const PAGE_HEIGHT_LANDSCAPE = 210;
const PAGE_WIDTH_PORTRAIT = 210;
const PAGE_HEIGHT_PORTRAIT = 297;
const MARGIN = 8;

// Font sizes - smaller for dense data to prevent overlap
const HEADING_SIZE = 12;
const SUBHEADING_SIZE = 10;
const CONTENT_SIZE = 6.5; // Reduced from 7 to prevent overlap
const SMALL_SIZE = 5.5;   // Reduced from 6 for 15-column support

// Colors - typed as RGB tuples
const HEADER_BG: [number, number, number] = [68, 114, 196]; // #4472C4
const HEADER_TEXT: [number, number, number] = [255, 255, 255];
const ALTERNATE_ROW: [number, number, number] = [248, 249, 250];
const GREEN_BG: [number, number, number] = [209, 250, 229]; // #d1fae5 - Purchase
const RED_BG: [number, number, number] = [254, 226, 226];   // #fee2e2 - Sale
const YELLOW_BG: [number, number, number] = [254, 243, 199]; // #fef3c7 - Palti
const PURPLE_BG: [number, number, number] = [235, 225, 255]; // Shifting row (lighter)
const BLUE_BG: [number, number, number] = [219, 234, 254];   // Production

// Chunk size for large dataset processing
const CHUNK_SIZE = 5000;

/**
 * Cross-browser PDF download helper with fallback mechanisms
 * Handles various browser environments and provides fallback for production
 */
function savePDFWithFallback(doc: jsPDF, filename: string): void {
    console.log(`📥 Attempting to download PDF: ${filename}`);

    try {
        // Method 1: Try native jsPDF save (works in most browsers)
        doc.save(filename);
        console.log(`✅ PDF saved successfully via native method`);
    } catch (saveError) {
        console.warn('⚠️ Native PDF save failed, trying fallback methods...', saveError);

        try {
            // Method 2: Create blob and download via link element
            const blob = doc.output('blob');
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            document.body.appendChild(link);

            // Trigger click
            link.click();

            // Cleanup after short delay
            setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            }, 100);

            console.log(`✅ PDF saved successfully via blob download`);
        } catch (blobError) {
            console.warn('⚠️ Blob download failed, trying data URL fallback...', blobError);

            try {
                // Method 3: Open PDF in new tab using data URL (last resort)
                const pdfDataUrl = doc.output('dataurlstring');
                const newWindow = window.open(pdfDataUrl, '_blank');

                if (newWindow) {
                    console.log(`✅ PDF opened in new tab (please save manually)`);
                } else {
                    // Pop-up was blocked, provide direct download link
                    console.error('❌ Pop-up blocked. Creating download link...');
                    const downloadLink = document.createElement('a');
                    downloadLink.href = pdfDataUrl;
                    downloadLink.download = filename;
                    downloadLink.click();
                }
            } catch (fallbackError) {
                console.error('❌ All PDF download methods failed:', fallbackError);
                throw new Error('PDF download failed. Please try again or use a different browser.');
            }
        }
    }
}

interface PDFOptions {
    title: string;
    subtitle?: string;
    dateRange?: string;
    filterType?: 'all' | 'day' | 'week' | 'month';
}

interface ColumnDef {
    header: string;
    dataKey: string;
    width?: number;
    minWidth?: number;
    maxWidth?: number;
    halign?: 'left' | 'center' | 'right';
}

// Common table styles to prevent overlap
const getBaseTableStyles = () => ({
    fontSize: CONTENT_SIZE,
    cellPadding: 1.5,
    overflow: 'linebreak' as const,
    cellWidth: 'wrap' as const,
    minCellHeight: 5,
    valign: 'middle' as const,
    halign: 'left' as const
});

// Enhanced header styles
const getHeaderStyles = () => ({
    fillColor: HEADER_BG,
    textColor: HEADER_TEXT,
    fontStyle: 'bold' as const,
    fontSize: CONTENT_SIZE,
    cellPadding: 1.5,
    halign: 'center' as const,
    valign: 'middle' as const,
    lineWidth: 0.1,
    lineColor: [200, 200, 200] as [number, number, number]
});

/**
 * Process large dataset in chunks to prevent memory issues
 */
function processInChunks<T, R>(data: T[], processor: (item: T, index: number) => R): R[] {
    const results: R[] = [];
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE);
        chunk.forEach((item, idx) => {
            results.push(processor(item, i + idx));
        });
        if (i > 0 && i % 10000 === 0) {
            console.log(`📊 PDF: Processed ${i} of ${data.length} records`);
        }
    }
    return results;
}

/**
 * Generate PDF for All Arrivals tab - PORTRAIT MODE - Exact frontend column match
 */
export const generateArrivalsPDF = (
    records: any[],
    options: PDFOptions
): void => {
    console.log(`📊 PDF Export: Processing ${records.length} Arrivals records (PORTRAIT)`);

    // PORTRAIT orientation
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    addHeader(doc, options, records.length, 'portrait');

    // Columns optimized for portrait mode
    const columns: ColumnDef[] = [
        { header: 'Sl', dataKey: 'slNo', width: 7 },
        { header: 'Date', dataKey: 'date', width: 12 },
        { header: 'Type', dataKey: 'movementType', width: 14 },
        { header: 'Broker', dataKey: 'broker', width: 14 },
        { header: 'From', dataKey: 'from', width: 16 },
        { header: 'ToKN', dataKey: 'toKn', width: 12 },
        { header: 'ToWH', dataKey: 'toWh', width: 12 },
        { header: 'OUT', dataKey: 'outturn', width: 10 },
        { header: 'Variety', dataKey: 'variety', width: 18 },
        { header: 'Bags', dataKey: 'bags', width: 10 },
        { header: 'M%', dataKey: 'moisture', width: 8 },
        { header: 'Cut', dataKey: 'cutting', width: 8 },
        { header: 'WB', dataKey: 'wbNo', width: 10 },
        { header: 'Gross', dataKey: 'grossWeight', width: 12 },
        { header: 'Tare', dataKey: 'tareWeight', width: 10 },
        { header: 'Net', dataKey: 'netWeight', width: 12 },
        { header: 'Lorry', dataKey: 'lorryNumber', width: 12 }
    ];

    const tableData = processInChunks(records, (record, index) => ({
        slNo: index + 1,
        date: formatDate(record.date),
        movementType: formatMovementType(record.movementType),
        broker: truncateText(record.broker || '-', 12),
        from: truncateText(getFromLocation(record), 14),
        toKn: record.toKunchinittu?.code || '-',
        toWh: record.toWarehouse?.code || record.toWarehouseShift?.code || '-',
        outturn: record.outturn?.code || '-',
        variety: truncateText(record.variety || '-', 16),
        bags: record.bags || 0,
        moisture: record.moisture ? `${record.moisture}%` : '-',
        cutting: record.cutting || '-',
        wbNo: record.wbNo || '-',
        grossWeight: formatNumber(record.grossWeight),
        tareWeight: formatNumber(record.tareWeight),
        netWeight: formatNumber(record.netWeight),
        lorryNumber: record.lorryNumber || '-'
    }));

    generateOptimizedTable(doc, columns, tableData, 35, records, 'portrait');

    // Add totals summary
    const totalBags = records.reduce((sum, r) => sum + (r.bags || 0), 0);
    const totalWeight = records.reduce((sum, r) => sum + (parseFloat(r.netWeight) || 0), 0);

    addSummary(doc, [
        { label: 'Total Records', value: records.length.toString() },
        { label: 'Total Bags', value: totalBags.toLocaleString() },
        { label: 'Total Weight', value: `${formatNumber(totalWeight)} kg` }
    ], 'portrait');

    addFooter(doc, options, 'portrait');

    const filename = `Arrivals_${options.filterType || 'all'}_${formatFilename()}.pdf`;
    savePDFWithFallback(doc, filename);
    console.log(`✅ PDF Generated: ${filename} with ${records.length} records across ${doc.getNumberOfPages()} pages`);
};

/**
 * Generate PDF for Purchase tab - PORTRAIT MODE - Pixel perfect match
 * Reorders columns and reduces font to 15-column capacity (5.5pt)
 */
export const generatePurchasePDF = (
    records: any[],
    options: PDFOptions
): void => {
    console.log(`📊 PDF Export: Processing ${records.length} Purchase records (PORTRAIT-OPTIMIZED)`);

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    addHeader(doc, { ...options, title: options.title || 'Purchase Records' }, records.length, 'portrait');

    // Exactly match frontend columns (15 columns for portrait A4)
    const columns: ColumnDef[] = [
        { header: 'Sl', dataKey: 'slNo', width: 7, halign: 'center' },
        { header: 'Date', dataKey: 'date', width: 14, halign: 'center' },
        { header: 'Type', dataKey: 'type', width: 12, halign: 'center' },
        { header: 'Broker', dataKey: 'broker', width: 15 },
        { header: 'From', dataKey: 'from', width: 15 },
        { header: 'To', dataKey: 'to', width: 15 },
        { header: 'Variety', dataKey: 'variety', width: 16 },
        { header: 'Bags', dataKey: 'bags', width: 9, halign: 'center' },
        { header: 'M%', dataKey: 'moisture', width: 8, halign: 'center' },
        { header: 'Cut', dataKey: 'cutting', width: 8, halign: 'center' },
        { header: 'WB', dataKey: 'wbNo', width: 10, halign: 'center' },
        { header: 'Net', dataKey: 'netWeight', width: 12, halign: 'center' },
        { header: 'Lorry', dataKey: 'lorryNumber', width: 14, halign: 'center' },
        { header: 'Rate/Q', dataKey: 'avgRate', width: 12, halign: 'center' },
        { header: 'Amount', dataKey: 'totalAmount', width: 18, halign: 'right' }
    ];

    const tableData = processInChunks(records, (record, index) => {
        const purchaseRate = record.purchaseRate || {};
        const totalAmount = purchaseRate.totalAmount || record.totalAmount || 0;
        const avgRate = purchaseRate.averageRate || record.averageRate || 0;

        const destination = record.outturnId
            ? `P(${record.outturn?.code || 'OUT'})`
            : record.toKunchinittu?.code && record.toWarehouse?.code
                ? `${record.toKunchinittu.code}-${record.toWarehouse.code}`
                : record.toKunchinittu?.code || record.toWarehouse?.code || '-';

        return {
            slNo: index + 1,
            date: formatDate(record.date),
            type: record.movementType === 'purchase' ? 'Purch' : 'Other',
            broker: truncateText(record.broker || '-', 12),
            from: truncateText(record.fromLocation || '-', 12),
            to: truncateText(destination, 12),
            variety: truncateText(record.variety || '-', 14),
            bags: record.bags || 0,
            moisture: record.moisture ? `${record.moisture}%` : '-',
            cutting: record.cutting || '-',
            wbNo: record.wbNo || '-',
            netWeight: formatNumber(record.netWeight),
            lorryNumber: truncateText(record.lorryNumber || '-', 10),
            avgRate: avgRate > 0 ? `₹${Number(avgRate).toFixed(0)}` : '-',
            totalAmount: totalAmount > 0 ? `₹${Number(totalAmount).toLocaleString()}` : '-'
        };
    });

    // Generate table with smaller font for 15-column support
    generateOptimizedTable(doc, columns, tableData, 35, records, 'portrait');

    // Add totals
    const totalBags = records.reduce((sum, r) => sum + (r.bags || 0), 0);
    const totalWeight = records.reduce((sum, r) => sum + (parseFloat(r.netWeight) || 0), 0);
    const totalAmount = records.reduce((sum, r) => {
        const rate = r.purchaseRate || {};
        return sum + (parseFloat(rate.totalAmount || r.totalAmount) || 0);
    }, 0);

    const summaryY = (doc as any).lastAutoTable.finalY + 8;
    addSummary(doc, [
        { label: 'Total Records', value: records.length.toString() },
        { label: 'Total Bags', value: totalBags.toLocaleString() },
        { label: 'Total Weight', value: `${formatNumber(totalWeight)} kg` },
        { label: 'Total Amount', value: `₹${Number(totalAmount).toLocaleString()}` }
    ], 'portrait');

    addFooter(doc, options, 'portrait');

    const filename = `Purchase_${options.filterType || 'all'}_${formatFilename()}.pdf`;
    savePDFWithFallback(doc, filename);
    console.log(`✅ PDF Generated: ${filename} with ${records.length} records across ${doc.getNumberOfPages()} pages`);
};

/**
 * Generate PDF for Shifting tab - PORTRAIT MODE - Pixel perfect match
 * Includes: Sl No, Date, Type, From KN, From WH, To KN/Outturn, To WH, Variety, Bags, M%, Cut, WB, Net, Lorry
 */
export const generateShiftingPDF = (
    records: any[],
    options: PDFOptions
): void => {
    console.log(`📊 PDF Export: Processing ${records.length} Shifting records (PORTRAIT-OPTIMIZED)`);

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    addHeader(doc, { ...options, title: options.title || 'Shifting Records' }, records.length, 'portrait');

    // Exactly match frontend columns (14 columns for portrait A4)
    const columns: ColumnDef[] = [
        { header: 'Sl', dataKey: 'slNo', width: 7, halign: 'center' },
        { header: 'Date', dataKey: 'date', width: 14, halign: 'center' },
        { header: 'Type', dataKey: 'type', width: 12, halign: 'center' },
        { header: 'From KN', dataKey: 'fromKn', width: 14 },
        { header: 'From WH', dataKey: 'fromWh', width: 14 },
        { header: 'To/Outturn', dataKey: 'toKn', width: 16 },
        { header: 'To WH', dataKey: 'toWh', width: 14 },
        { header: 'Variety', dataKey: 'variety', width: 18 },
        { header: 'Bags', dataKey: 'bags', width: 10, halign: 'center' },
        { header: 'M%', dataKey: 'moisture', width: 8, halign: 'center' },
        { header: 'Cut', dataKey: 'cutting', width: 8, halign: 'center' },
        { header: 'WB', dataKey: 'wbNo', width: 10, halign: 'center' },
        { header: 'Net Wt', dataKey: 'netWeight', width: 14, halign: 'center' },
        { header: 'Lorry No', dataKey: 'lorryNumber', width: 16 }
    ];

    const tableData = processInChunks(records, (record, index) => {
        const isProductionShifting = record.movementType === 'production-shifting';
        const isForProduction = record.movementType === 'for-production';

        return {
            slNo: index + 1,
            date: formatDate(record.date),
            type: isProductionShifting ? 'Prod-Shift' : isForProduction ? 'For-Prod' : 'Shifting',
            fromKn: truncateText(record.fromKunchinittu?.code || '-', 12),
            fromWh: truncateText(record.fromWarehouse?.code || record.fromWarehouse?.name || '-', 12),
            toKn: isProductionShifting
                ? `OUT: ${record.outturn?.code || '-'}`
                : truncateText(record.toKunchinittu?.code || '-', 14),
            toWh: isProductionShifting
                ? truncateText(record.toWarehouse?.code || '-', 12)
                : truncateText(record.toWarehouseShift?.code || record.toWarehouseShift?.name || '-', 12),
            variety: truncateText(record.variety || '-', 16),
            bags: record.bags || 0,
            moisture: record.moisture ? `${record.moisture}%` : '-',
            cutting: record.cutting || '-',
            wbNo: record.wbNo || '-',
            netWeight: formatNumber(record.netWeight),
            lorryNumber: truncateText(record.lorryNumber || '-', 12)
        };
    });

    generateOptimizedTable(doc, columns, tableData, 35, records, 'portrait');

    // Add totals
    const totalBags = records.reduce((sum, r) => sum + (r.bags || 0), 0);
    const totalWeight = records.reduce((sum, r) => sum + (parseFloat(r.netWeight) || 0), 0);

    addSummary(doc, [
        { label: 'Total Records', value: records.length.toString() },
        { label: 'Total Bags', value: totalBags.toLocaleString() },
        { label: 'Total Weight', value: `${formatNumber(totalWeight)} kg` }
    ], 'portrait');

    addFooter(doc, options, 'portrait');

    const filename = `Shifting_${options.filterType || 'all'}_${formatFilename()}.pdf`;
    savePDFWithFallback(doc, filename);
    console.log(`✅ PDF Generated: ${filename} with ${records.length} records across ${doc.getNumberOfPages()} pages`);
};

/**
 * Generate PDF for Paddy Stock tab - PORTRAIT MODE - Exact frontend design match
 * Layout: Date header -> Stock table with Opening/Transactions/Closing
 * Colors: #4472C4 blue for date headers, color-coded movements
 */
export const generatePaddyStockPDF = (
    stockData: any[],
    options: PDFOptions
): void => {
    console.log(`📊 PDF Export: Processing ${stockData.length} Paddy Stock records (PORTRAIT)`);

    // PORTRAIT orientation for exact frontend match
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = PAGE_WIDTH_PORTRAIT;
    const pageHeight = PAGE_HEIGHT_PORTRAIT;
    const contentWidth = pageWidth - (MARGIN * 2);

    // Add header
    addHeader(doc, { ...options, title: options.title || 'Paddy Stock Report' }, stockData.length, 'portrait');

    // Group by date
    const groupedByDate: { [date: string]: any[] } = {};
    stockData.forEach(item => {
        const date = item.date ? formatDate(item.date) : 'Unknown';
        if (!groupedByDate[date]) groupedByDate[date] = [];
        groupedByDate[date].push(item);
    });

    const dates = Object.keys(groupedByDate).sort((a, b) => {
        const dateA = a.split('/').reverse().join('');
        const dateB = b.split('/').reverse().join('');
        return dateB.localeCompare(dateA);
    });

    let yPos = 35;
    let totalRecordsProcessed = 0;

    // Column widths for portrait mode (total = contentWidth = 194mm)
    const colWidths = {
        bags: 22,
        variety: 50,
        location: 45,
        outturn: 35,
        type: 42
    };

    dates.forEach((date) => {
        const dayRecords = groupedByDate[date];
        totalRecordsProcessed += dayRecords.length;

        // Check for page break - need at least 50mm for a date section
        if (yPos > pageHeight - 60) {
            doc.addPage();
            yPos = MARGIN + 8;
        }

        // Date header - Blue #4472C4 like frontend
        doc.setFillColor(68, 114, 196); // #4472C4
        doc.rect(MARGIN, yPos - 5, contentWidth, 8, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(formatDateDisplay(date), MARGIN + 3, yPos);
        yPos += 6;

        // Table header row
        doc.setFillColor(248, 249, 250); // Light gray header
        doc.rect(MARGIN, yPos - 3, contentWidth, 6, 'F');
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80, 80, 80);

        let xPos = MARGIN + 2;
        doc.text('Bags', xPos, yPos);
        xPos += colWidths.bags;
        doc.text('Variety', xPos, yPos);
        xPos += colWidths.variety;
        doc.text('Location (KN-WH)', xPos, yPos);
        xPos += colWidths.location;
        doc.text('Outturn', xPos, yPos);
        xPos += colWidths.outturn;
        doc.text('Type', xPos, yPos);
        yPos += 5;

        // Group records by variety and location for opening stock
        const stockByKey: { [key: string]: { bags: number; variety: string; location: string; outturn: string } } = {};

        dayRecords.forEach((item: any) => {
            const variety = item.variety || 'Unknown';
            const kn = item.toKunchinittu?.code || item.fromKunchinittu?.code || '';
            const wh = item.toWarehouse?.code || item.fromWarehouse?.code || item.toWarehouseShift?.code || '';
            const location = kn && wh ? `${kn}-${wh}` : (kn || wh || '-');
            const outturn = item.outturn?.code || '-';
            const key = `${variety}-${location}-${outturn}`;

            if (!stockByKey[key]) {
                stockByKey[key] = { bags: 0, variety, location, outturn };
            }

            // Add bags based on movement type
            if (item.movementType === 'purchase') {
                stockByKey[key].bags += (item.bags || 0);
            } else if (item.movementType === 'shifting' && item.toKunchinittu) {
                stockByKey[key].bags += (item.bags || 0);
            }
        });

        // Draw stock entries
        const entries = Object.values(stockByKey).filter(e => e.bags !== 0);
        let totalBags = 0;

        entries.forEach((entry, idx) => {
            // Alternate row colors
            if (idx % 2 === 0) {
                doc.setFillColor(255, 255, 255);
            } else {
                doc.setFillColor(248, 249, 250);
            }
            doc.rect(MARGIN, yPos - 3, contentWidth, 5, 'F');

            doc.setFontSize(6);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 0);

            xPos = MARGIN + 2;
            doc.text(entry.bags.toString(), xPos, yPos);
            xPos += colWidths.bags;
            doc.text(truncateText(entry.variety, 25), xPos, yPos);
            xPos += colWidths.variety;
            doc.text(truncateText(entry.location, 22), xPos, yPos);
            xPos += colWidths.location;

            // Outturn link color (purple)
            if (entry.outturn !== '-') {
                doc.setTextColor(124, 58, 237);
            }
            doc.text(truncateText(entry.outturn, 18), xPos, yPos);
            doc.setTextColor(0, 0, 0);
            xPos += colWidths.outturn;
            doc.text('Stock', xPos, yPos);

            totalBags += entry.bags;
            yPos += 4;
        });

        // Opening Stock total row
        if (entries.length > 0) {
            doc.setFillColor(220, 252, 231); // Light green
            doc.rect(MARGIN, yPos - 3, contentWidth, 5, 'F');
            doc.setFontSize(6);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(22, 163, 74); // Green text
            doc.text(totalBags.toString(), MARGIN + 2, yPos);
            doc.text('Opening Stock', MARGIN + 2 + colWidths.bags, yPos);
            doc.setTextColor(0, 0, 0);
            yPos += 5;
        }

        // Horizontal separator
        doc.setDrawColor(200, 200, 200);
        doc.line(MARGIN, yPos, MARGIN + contentWidth, yPos);
        yPos += 3;

        // Daily Transactions (color coded by type)
        const transactions = dayRecords.filter((r: any) =>
            r.movementType === 'production-shifting' ||
            r.movementType === 'for-production' ||
            r.movementType === 'shifting'
        );

        let deductedBags = 0;

        transactions.forEach((record: any, idx: number) => {
            const isProduction = record.movementType === 'production-shifting' || record.movementType === 'for-production';
            const bags = record.bags || 0;
            const variety = record.variety || 'Unknown';
            const outturn = record.outturn?.code || '-';

            // Row background based on type
            if (isProduction) {
                doc.setFillColor(254, 226, 226); // Light red for production
                deductedBags += bags;
            } else {
                doc.setFillColor(226, 232, 240); // Light purple for shifting
            }
            doc.rect(MARGIN, yPos - 3, contentWidth, 5, 'F');

            doc.setFontSize(6);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 0);

            xPos = MARGIN + 2;
            const bagsDisplay = isProduction ? `(-) ${bags}` : bags.toString();
            doc.text(bagsDisplay, xPos, yPos);
            xPos += colWidths.bags;
            doc.text(truncateText(variety, 25), xPos, yPos);
            xPos += colWidths.variety;

            const kn = record.fromKunchinittu?.code || record.toKunchinittu?.code || '';
            const wh = record.fromWarehouse?.code || record.toWarehouseShift?.code || '';
            const location = kn && wh ? `${kn}-${wh}` : (kn || wh || '-');
            doc.text(truncateText(location, 22), xPos, yPos);
            xPos += colWidths.location;

            // Outturn in purple
            if (outturn !== '-') {
                doc.setTextColor(124, 58, 237);
            }
            doc.text(truncateText(outturn, 18), xPos, yPos);
            doc.setTextColor(0, 0, 0);
            xPos += colWidths.outturn;

            const typeDisplay = isProduction ? '→ Production' : 'Shifting';
            doc.text(typeDisplay, xPos, yPos);

            yPos += 4;
        });

        // Horizontal separator
        doc.setDrawColor(200, 200, 200);
        doc.line(MARGIN, yPos, MARGIN + contentWidth, yPos);
        yPos += 3;

        // Closing Stock row
        const closingTotal = totalBags - deductedBags;
        doc.setFillColor(254, 243, 199); // Light amber
        doc.rect(MARGIN, yPos - 3, contentWidth, 5, 'F');
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(146, 64, 14); // Amber text
        doc.text(closingTotal.toString(), MARGIN + 2, yPos);
        doc.text('Closing Stock', MARGIN + 2 + colWidths.bags, yPos);
        doc.setTextColor(0, 0, 0);

        yPos += 12; // Gap before next date
    });

    console.log(`📊 Paddy Stock: Processed ${totalRecordsProcessed} of ${stockData.length} records`);

    addFooter(doc, options, 'portrait');

    const filename = `PaddyStock_${options.filterType || 'all'}_${formatFilename()}.pdf`;
    savePDFWithFallback(doc, filename);
    console.log(`✅ PDF Generated: ${filename} with ${stockData.length} records across ${doc.getNumberOfPages()} pages`);
};

/**
 * Generate PDF for Rice Stock tab - PORTRAIT MODE - Exact frontend grid layout
 * Shows product type cards with Qtls, Bags, Product, Variety, Packaging, Location columns
 * Color-coded by movement type: Green=Purchase, Red=Sale, Yellow=Palti
 */
export const generateRiceStockPDF = (
    stockData: any[],
    options: PDFOptions
): void => {
    console.log(`📊 PDF Export: Processing ${stockData.length} Rice Stock records (PORTRAIT)`);

    // PORTRAIT orientation
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = PAGE_WIDTH_PORTRAIT;
    const pageHeight = PAGE_HEIGHT_PORTRAIT;
    const contentWidth = pageWidth - (MARGIN * 2);

    addHeader(doc, { ...options, title: options.title || 'Rice Stock Report' }, stockData.length, 'portrait');

    // Product types in order (matching frontend)
    const productTypes = ['Rice', 'Broken', 'RJ Rice 1', '0 Broken', 'Unpolish', 'Faram', 'Bran', 'RJ Rice (2)', 'Sizer Broken'];

    // Group by date first
    const groupedByDate: { [date: string]: any[] } = {};
    stockData.forEach(item => {
        const date = item.date ? formatDate(item.date) : 'Unknown';
        if (!groupedByDate[date]) groupedByDate[date] = [];
        groupedByDate[date].push(item);
    });

    const dates = Object.keys(groupedByDate).sort((a, b) => {
        const dateA = a.split('/').reverse().join('');
        const dateB = b.split('/').reverse().join('');
        return dateB.localeCompare(dateA);
    });

    let yPos = 35;
    let totalRecordsProcessed = 0;

    // Column widths for portrait mode (total = contentWidth = 194mm)
    const colWidths = {
        qtls: 22,
        bags: 28,
        product: 40,
        variety: 45,
        packaging: 35,
        location: 24
    };

    dates.forEach(date => {
        const dayMovements = groupedByDate[date];
        totalRecordsProcessed += dayMovements.length;

        // Check for page break
        if (yPos > pageHeight - 60) {
            doc.addPage();
            yPos = MARGIN + 8;
        }

        // Date header (blue #3b82f6 like frontend)
        doc.setFillColor(59, 130, 246); // #3b82f6
        doc.rect(MARGIN, yPos - 5, contentWidth, 8, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(formatDateDisplay(date), MARGIN + 3, yPos);
        yPos += 6;

        // Group movements by product type
        const groupedByProduct: { [product: string]: any[] } = {};
        productTypes.forEach(pt => { groupedByProduct[pt] = []; });

        dayMovements.forEach(m => {
            let product = m.productType || m.product_type || m.product || m.category || 'Rice';
            // Normalize product names
            if (product.toLowerCase().includes('rj rice 1')) product = 'RJ Rice 1';
            else if (product.toLowerCase().includes('rj rice (2)') || product.toLowerCase().includes('rj rice 2')) product = 'RJ Rice (2)';
            else if (product.toLowerCase().includes('0 broken') || product.toLowerCase().includes('zero broken')) product = '0 Broken';
            else if (product.toLowerCase().includes('sizer broken')) product = 'Sizer Broken';
            else if (product.toLowerCase().includes('broken')) product = 'Broken';
            else if (product.toLowerCase().includes('bran')) product = 'Bran';
            else if (product.toLowerCase().includes('faram')) product = 'Faram';
            else if (product.toLowerCase().includes('unpolish')) product = 'Unpolish';
            else if (product.toLowerCase().includes('rice')) product = 'Rice';

            if (!groupedByProduct[product]) groupedByProduct[product] = [];
            groupedByProduct[product].push(m);
        });

        // Draw each product type section (single column for portrait)
        productTypes.forEach((productType) => {
            const movements = groupedByProduct[productType];
            if (movements.length === 0) return; // Skip empty product types

            // Check for page break before product section
            if (yPos > pageHeight - 40) {
                doc.addPage();
                yPos = MARGIN + 8;
            }

            // Product type header
            const headerColor = getProductTypeColor(productType);
            doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
            doc.rect(MARGIN, yPos - 4, contentWidth, 7, 'F');
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text(productType, MARGIN + 3, yPos);
            yPos += 5;

            // Table header row
            doc.setFillColor(241, 243, 244); // #f1f3f4
            doc.rect(MARGIN, yPos - 3, contentWidth, 5, 'F');
            doc.setFontSize(5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(80, 80, 80);

            let xPos = MARGIN + 1;
            doc.text('Qtls', xPos, yPos);
            xPos += colWidths.qtls;
            doc.text('Bags/Size', xPos, yPos);
            xPos += colWidths.bags;
            doc.text('Product', xPos, yPos);
            xPos += colWidths.product;
            doc.text('Variety', xPos, yPos);
            xPos += colWidths.variety;
            doc.text('Packaging', xPos, yPos);
            xPos += colWidths.packaging;
            doc.text('Loc', xPos, yPos);
            yPos += 4;

            // Stock calculations
            let closingQtls = 0;
            let closingBags = 0;

            // Movement rows
            movements.forEach((m: any, idx: number) => {
                const mvmtType = (m.movementType || m.movement_type || 'production').toLowerCase();
                const qtls = parseFloat(m.quantityQuintals || m.quantity_quintals || m.qtls || 0) || 0;
                const bags = m.bags || 0;
                const bagSize = m.bagSizeKg || m.bag_size_kg || 26;

                // Row background based on movement type
                if (mvmtType === 'sale') {
                    doc.setFillColor(254, 226, 226); // #fee2e2 Light red
                } else if (mvmtType === 'purchase') {
                    doc.setFillColor(209, 250, 229); // #d1fae5 Light green
                } else if (mvmtType === 'palti' || mvmtType === 'palti-shortage') {
                    doc.setFillColor(254, 243, 199); // #fef3c7 Light yellow
                } else {
                    // Production or other - alternate white/gray
                    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 249, idx % 2 === 0 ? 255 : 250);
                }
                doc.rect(MARGIN, yPos - 3, contentWidth, 4, 'F');

                doc.setFontSize(5);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(0, 0, 0);

                xPos = MARGIN + 1;

                // Format qtls and bags (negative for sale)
                const qtlsDisplay = mvmtType === 'sale' ? `-${qtls.toFixed(2)}` : qtls.toFixed(2);
                const bagsDisplay = mvmtType === 'sale' ? `-${bags}/${bagSize}kg` : `${bags}/${bagSize}kg`;

                doc.text(qtlsDisplay, xPos, yPos);
                xPos += colWidths.qtls;
                doc.text(bagsDisplay, xPos, yPos);
                xPos += colWidths.bags;

                // Product display with movement type
                let productDisplay = productType;
                if (mvmtType === 'sale') productDisplay = `${productType}(Sale)`;
                else if (mvmtType === 'purchase') productDisplay = `${productType}(Purch)`;
                else if (mvmtType === 'palti' || mvmtType === 'palti-shortage') productDisplay = 'Palti';
                doc.text(truncateText(productDisplay, 20), xPos, yPos);
                xPos += colWidths.product;

                // Variety
                const variety = m.variety || 'Sum25 RNR';
                doc.text(truncateText(variety, 22), xPos, yPos);
                xPos += colWidths.variety;

                // Packaging
                let packagingDisplay = m.packaging?.brandName || m.packaging_brand || 'bullet';
                if (mvmtType === 'palti' || mvmtType === 'palti-shortage') {
                    const source = m.sourcePackaging?.brandName || 'bullet';
                    const target = m.targetPackaging?.brandName || 'premium';
                    packagingDisplay = `${source}→${target}`;
                }
                doc.text(truncateText(packagingDisplay, 18), xPos, yPos);
                xPos += colWidths.packaging;

                // Location
                const location = m.locationCode || m.location_code || 'A1';
                doc.text(truncateText(location, 8), xPos, yPos);

                // Calculate stock changes
                if (mvmtType === 'sale') {
                    closingQtls -= Math.abs(qtls);
                    closingBags -= Math.abs(bags);
                } else {
                    closingQtls += qtls;
                    closingBags += bags;
                }

                yPos += 3.5;
            });

            // Closing Stock row
            doc.setFillColor(229, 231, 235); // #e5e7eb
            doc.rect(MARGIN, yPos - 3, contentWidth, 4, 'F');
            doc.setFontSize(5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            xPos = MARGIN + 1;
            doc.text(closingQtls.toFixed(2), xPos, yPos);
            xPos += colWidths.qtls;
            doc.text(closingBags.toString(), xPos, yPos);
            xPos += colWidths.bags;
            doc.text('Closing Stock', xPos, yPos);

            yPos += 8; // Gap before next product type
        });

        yPos += 5; // Gap before next date
    });

    console.log(`📊 Rice Stock: Processed ${totalRecordsProcessed} of ${stockData.length} records`);

    addFooter(doc, options, 'portrait');

    const filename = `RiceStock_${options.filterType || 'all'}_${formatFilename()}.pdf`;
    savePDFWithFallback(doc, filename);
    console.log(`✅ PDF Generated: ${filename} with ${stockData.length} records across ${doc.getNumberOfPages()} pages`);
};

// Helper function for product type colors
function getProductTypeColor(productType: string): [number, number, number] {
    const colors: { [key: string]: [number, number, number] } = {
        'Rice': [59, 130, 246],      // Blue
        'Broken': [107, 114, 128],   // Gray
        'RJ Rice 1': [16, 185, 129], // Green
        '0 Broken': [156, 163, 175], // Light gray
        'Unpolish': [245, 158, 11],  // Amber
        'Faram': [139, 92, 246],     // Purple
        'Bran': [236, 72, 153],      // Pink
        'RJ Rice (2)': [20, 184, 166], // Teal
        'Sizer Broken': [99, 102, 241] // Indigo
    };
    return colors[productType] || [68, 114, 196];
}

/**
 * Generate PDF for Rice Stock Movement report - PORTRAIT MODE - Exact frontend match
 */
export const generateRiceMovementsPDF = (
    movements: any[],
    options: PDFOptions
): void => {
    console.log(`📊 PDF Export: Processing ${movements.length} Rice Movement records (PORTRAIT)`);

    // PORTRAIT orientation
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    addHeader(doc, { ...options, title: options.title || 'Rice Stock Movement Report' }, movements.length, 'portrait');

    // Columns optimized for portrait mode with alignment
    const columns: ColumnDef[] = [
        { header: 'Sl', dataKey: 'slNo', width: 8, halign: 'center' },
        { header: 'Date', dataKey: 'date', width: 14, halign: 'center' },
        { header: 'Type', dataKey: 'mvmtType', width: 16 },
        { header: 'Bill', dataKey: 'billNumber', width: 14, halign: 'center' },
        { header: 'Variety', dataKey: 'variety', width: 20 },
        { header: 'Product', dataKey: 'productType', width: 16 },
        { header: 'Bags', dataKey: 'bags', width: 10, halign: 'center' },
        { header: 'Kg', dataKey: 'bagSize', width: 10, halign: 'center' },
        { header: 'Qtls', dataKey: 'qtls', width: 12, halign: 'center' },
        { header: 'Packaging', dataKey: 'packaging', width: 20 },
        { header: 'From', dataKey: 'from', width: 16 },
        { header: 'To', dataKey: 'to', width: 16 },
        { header: 'Lorry', dataKey: 'lorryNumber', width: 14 },
        { header: 'Status', dataKey: 'status', width: 12, halign: 'center' }
    ];

    const tableData = processInChunks(movements, (item, index) => {
        const mvmtType = item.movementType || item.movement_type || 'production';
        let packagingDisplay = item.packaging_brand || item.packaging?.brandName || 'A1';

        if (mvmtType === 'palti') {
            const sourcePkg = item.source_packaging_brand || item.sourcePackaging?.brandName || 'A1';
            const targetPkg = item.target_packaging_brand || item.targetPackaging?.brandName || 'A1';
            packagingDisplay = `${sourcePkg}→${targetPkg}`;
        }

        // Add shortage info for palti
        let typeDisplay = formatMovementType(mvmtType);
        if (mvmtType === 'palti' && (Number(item.shortageKg) > 0 || Number(item.conversion_shortage_kg) > 0)) {
            typeDisplay += `(-${Number(item.shortageKg || item.conversion_shortage_kg || 0).toFixed(0)}kg)`;
        }

        return {
            slNo: index + 1,
            date: formatDate(item.date),
            mvmtType: typeDisplay,
            billNumber: item.billNumber || item.bill_number || '-',
            variety: truncateText(item.variety || 'Sum25 RNR', 18),
            productType: truncateText(item.product_type || item.productType || item.product || 'Rice', 14),
            bags: item.bags || 0,
            bagSize: item.bagSizeKg || item.bag_size_kg || item.packaging?.allottedKg || 26,
            qtls: formatNumber(item.quantityQuintals || item.quantity_quintals || item.qtls || 0),
            packaging: truncateText(packagingDisplay, 18),
            from: truncateText(item.from || item.outturn?.code || '-', 14),
            to: truncateText(item.to || item.locationCode || item.location_code || '-', 14),
            lorryNumber: item.lorryNumber || item.lorry_number || '-',
            status: (item.status || 'PEND').substring(0, 4).toUpperCase()
        };
    });

    // Use smaller font for portrait mode
    generateOptimizedTable(doc, columns, tableData, 35, movements, 'portrait');

    const totalBags = movements.reduce((sum, m) => sum + (m.bags || 0), 0);
    const totalQtls = movements.reduce((sum, m) => sum + (parseFloat(m.quantityQuintals || m.quantity_quintals || m.qtls || 0) || 0), 0);

    addSummary(doc, [
        { label: 'Total Records', value: movements.length.toString() },
        { label: 'Total Bags', value: totalBags.toLocaleString() },
        { label: 'Total Quintals', value: formatNumber(totalQtls) }
    ], 'portrait');

    addFooter(doc, options, 'portrait');

    const filename = `RiceMovements_${options.filterType || 'all'}_${formatFilename()}.pdf`;
    savePDFWithFallback(doc, filename);
    console.log(`✅ PDF Generated: ${filename} with ${movements.length} records across ${doc.getNumberOfPages()} pages`);
};

/**
 * Generate PDF for Outturn Report tab - Complete frontend match
 * Includes: Outturn info, Production Shifting (15 cols), By-Products (11 cols), Yield Summary
 */
export const generateOutturnReportPDF = (
    outturnData: any,
    productionRecords: any[],
    byProducts: any[],
    options: PDFOptions
): void => {
    console.log(`📊 PDF Export: Generating Outturn Report for ${outturnData?.code}`);

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const title = `Outturn Report - ${outturnData?.code || 'N/A'}`;
    addHeader(doc, { ...options, title }, productionRecords.length + byProducts.length, 'portrait');

    let yPos = 42;
    const contentWidth = PAGE_WIDTH_PORTRAIT - (MARGIN * 2);

    // Outturn Info Box
    doc.setFillColor(248, 249, 250);
    doc.rect(MARGIN, yPos - 4, contentWidth, 22, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(MARGIN, yPos - 4, contentWidth, 22);

    doc.setFontSize(SUBHEADING_SIZE);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(68, 114, 196);
    doc.text('Outturn Details', MARGIN + 3, yPos);
    yPos += 6;

    doc.setFontSize(CONTENT_SIZE + 1);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`Code: ${outturnData?.code || '-'}`, MARGIN + 3, yPos);
    doc.text(`Variety: ${outturnData?.allottedVariety || '-'}`, MARGIN + 60, yPos);
    doc.text(`Type: ${outturnData?.type || 'Raw'}`, MARGIN + 130, yPos);
    yPos += 5;
    doc.text(`Paddy Date: ${formatDate(outturnData?.paddyDate)}`, MARGIN + 3, yPos);
    doc.text(`Status: ${outturnData?.isCleared ? 'CLEARED' : 'ACTIVE'}`, MARGIN + 60, yPos);

    if (outturnData?.isCleared && outturnData?.clearedAt) {
        doc.text(`Cleared: ${formatDate(outturnData.clearedAt)}`, MARGIN + 130, yPos);
    }
    yPos += 14;

    // Production Shifting Records (15 columns matching frontend exactly)
    if (productionRecords.length > 0) {
        doc.setFontSize(SUBHEADING_SIZE);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(68, 114, 196);
        doc.text(`Production Shifting Records (${productionRecords.length})`, MARGIN, yPos);
        yPos += 6;

        // 15 columns matching frontend: Sl, Date, Type, Broker, From, To, Variety, Bags, M%, Cut, WB, Net, Lorry, Rate, Amount
        const prodColumns: ColumnDef[] = [
            { header: 'Sl', dataKey: 'slNo', width: 6, halign: 'center' },
            { header: 'Date', dataKey: 'date', width: 12, halign: 'center' },
            { header: 'Type', dataKey: 'type', width: 14 },
            { header: 'Broker', dataKey: 'broker', width: 12 },
            { header: 'From', dataKey: 'from', width: 14 },
            { header: 'To', dataKey: 'to', width: 14 },
            { header: 'Variety', dataKey: 'variety', width: 16 },
            { header: 'Bags', dataKey: 'bags', width: 8, halign: 'center' },
            { header: 'M%', dataKey: 'moisture', width: 7, halign: 'center' },
            { header: 'Cut', dataKey: 'cutting', width: 7, halign: 'center' },
            { header: 'WB', dataKey: 'wbNo', width: 9, halign: 'center' },
            { header: 'Net', dataKey: 'netWeight', width: 12, halign: 'center' },
            { header: 'Lorry', dataKey: 'lorry', width: 12 },
            { header: 'Rate', dataKey: 'rate', width: 10, halign: 'right' },
            { header: 'Amount', dataKey: 'amount', width: 14, halign: 'right' }
        ];

        const prodData = productionRecords.map((r, idx) => {
            const isForProduction = r.movementType === 'purchase' && r.outturnId;
            const avgRate = r.purchaseRate?.averageRate || r.snapshotRate || r.outturn?.averageRate || 0;
            const totalAmount = r.purchaseRate?.totalAmount || 0;

            return {
                slNo: idx + 1,
                date: formatDate(r.date),
                type: isForProduction ? 'For-Prod' : 'Prod-Shift',
                broker: truncateText(r.broker || '-', 10),
                from: isForProduction ? truncateText(r.fromLocation || 'Direct', 12) : truncateText(`${r.fromKunchinittu?.code || ''}-${r.fromWarehouse?.name || ''}`, 12),
                to: isForProduction ? '-' : truncateText(`${r.toKunchinittu?.code || ''}-${r.toWarehouseShift?.name || ''}`, 12),
                variety: truncateText(r.variety || '-', 14),
                bags: r.bags || 0,
                moisture: r.moisture || '-',
                cutting: r.cutting || '-',
                wbNo: r.wbNo || '-',
                netWeight: formatNumber(r.netWeight),
                lorry: truncateText(r.lorryNumber || '-', 10),
                rate: avgRate > 0 ? `₹${Number(avgRate).toFixed(0)}` : '-',
                amount: totalAmount > 0 ? `₹${Number(totalAmount).toFixed(0)}` : '-'
            };
        });

        autoTable(doc, {
            startY: yPos,
            head: [prodColumns.map(c => c.header)],
            body: prodData.map((row: any) => prodColumns.map(c => row[c.dataKey])),
            theme: 'grid',
            styles: { ...getBaseTableStyles(), fontSize: SMALL_SIZE },
            headStyles: getHeaderStyles(),
            columnStyles: prodColumns.reduce((acc, col, idx) => {
                acc[idx] = { cellWidth: col.width, halign: col.halign || 'left' };
                return acc;
            }, {} as any),
            alternateRowStyles: { fillColor: ALTERNATE_ROW },
            margin: { left: MARGIN, right: MARGIN }
        });

        // Add totals row
        const totalNetWeight = productionRecords.reduce((sum, r) => sum + (parseFloat(r.netWeight) || 0), 0);
        const totalAmount = productionRecords.reduce((sum, r) => sum + (parseFloat(r.purchaseRate?.totalAmount) || 0), 0);

        yPos = (doc as any).lastAutoTable.finalY + 2;
        doc.setFillColor(68, 114, 196);
        doc.rect(MARGIN, yPos, contentWidth, 5, 'F');
        doc.setFontSize(SMALL_SIZE);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('Total:', MARGIN + contentWidth - 50, yPos + 3.5);
        doc.text(`${formatNumber(totalNetWeight)} kg`, MARGIN + contentWidth - 35, yPos + 3.5);
        doc.text(`₹${Number(totalAmount).toLocaleString()}`, MARGIN + contentWidth - 15, yPos + 3.5);

        yPos += 12;
    }

    // By-Products Table with all 11 columns
    if (byProducts.length > 0) {
        if (yPos > PAGE_HEIGHT_PORTRAIT - 80) {
            doc.addPage();
            yPos = MARGIN + 10;
        }

        doc.setFontSize(SUBHEADING_SIZE);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(112, 173, 71);
        doc.text(`By-Products Summary`, MARGIN, yPos);
        yPos += 6;

        // Calculate totals for by-products
        const totals = {
            rice: byProducts.reduce((sum, bp) => sum + Number(bp.rice || 0), 0),
            sizerBroken: byProducts.reduce((sum, bp) => sum + Number(bp.rejectionRice || 0), 0),
            rjRice1: byProducts.reduce((sum, bp) => sum + Number(bp.rjRice1 || 0), 0),
            rjRice2: byProducts.reduce((sum, bp) => sum + Number(bp.rjRice2 || 0), 0),
            broken: byProducts.reduce((sum, bp) => sum + Number(bp.broken || 0), 0),
            rjBroken: byProducts.reduce((sum, bp) => sum + Number(bp.rejectionBroken || 0), 0),
            zeroBroken: byProducts.reduce((sum, bp) => sum + Number(bp.zeroBroken || 0), 0),
            faram: byProducts.reduce((sum, bp) => sum + Number(bp.faram || 0), 0),
            bran: byProducts.reduce((sum, bp) => sum + Number(bp.bran || 0), 0),
            unpolished: byProducts.reduce((sum, bp) => sum + Number(bp.unpolished || 0), 0)
        };

        const totalByProducts = totals.rice + totals.sizerBroken + totals.rjRice1 + totals.rjRice2 +
            totals.broken + totals.rjBroken + totals.zeroBroken + totals.faram + totals.bran + totals.unpolished;

        // Total paddy weight from production records
        const totalPaddyWeightKg = productionRecords.reduce((sum, r) => sum + Number(r.netWeight || 0), 0);
        const totalPaddyQuintals = totalPaddyWeightKg / 100;

        // Draw by-products summary table (3 columns: Quintals, Product, Yield%)
        const entries = [
            { label: 'Rice', value: totals.rice },
            { label: 'Sizer Broken', value: totals.sizerBroken },
            { label: 'RJ Rice 1', value: totals.rjRice1 },
            { label: 'RJ Rice 2', value: totals.rjRice2 },
            { label: 'Broken', value: totals.broken },
            { label: 'RJ Broken', value: totals.rjBroken },
            { label: 'Zero Broken', value: totals.zeroBroken },
            { label: 'Faram', value: totals.faram },
            { label: 'Bran', value: totals.bran },
            { label: 'Unpolished', value: totals.unpolished }
        ];

        // Draw header
        doc.setFillColor(155, 194, 230);
        doc.rect(MARGIN, yPos, contentWidth / 2, 5, 'F');
        doc.setFontSize(SMALL_SIZE);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Quintals', MARGIN + 5, yPos + 3.5);
        doc.text('Product', MARGIN + 30, yPos + 3.5);
        doc.text('Yield %', MARGIN + 70, yPos + 3.5);
        yPos += 5;

        // Draw entries
        entries.forEach((entry, idx) => {
            const rowY = yPos + (idx * 4);
            doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 249, idx % 2 === 0 ? 255 : 250);
            doc.rect(MARGIN, rowY, contentWidth / 2, 4, 'F');

            doc.setFontSize(SMALL_SIZE);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 0);
            doc.text(entry.value > 0 ? entry.value.toFixed(2) : '-', MARGIN + 5, rowY + 3);
            doc.text(entry.label, MARGIN + 30, rowY + 3);

            const yieldPct = totalPaddyQuintals > 0 ? ((entry.value / totalPaddyQuintals) * 100).toFixed(2) : '0.00';
            doc.text(yieldPct, MARGIN + 70, rowY + 3);
        });

        yPos += (entries.length * 4) + 2;

        // Total row with yield
        doc.setFillColor(112, 173, 71);
        doc.rect(MARGIN, yPos, contentWidth / 2, 5, 'F');
        doc.setFontSize(SMALL_SIZE);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(`${totalByProducts.toFixed(2)} Q`, MARGIN + 5, yPos + 3.5);
        doc.text('Total BY Products', MARGIN + 30, yPos + 3.5);

        const totalYield = totalPaddyQuintals > 0 ? ((totalByProducts / totalPaddyQuintals) * 100).toFixed(2) : '0.00';
        doc.text(`${totalYield} %`, MARGIN + 70, yPos + 3.5);
    }

    addFooter(doc, options, 'portrait');

    const filename = `OutturnReport_${outturnData?.code || 'report'}_${formatFilename()}.pdf`;
    savePDFWithFallback(doc, filename);
    console.log(`✅ PDF Generated: ${filename}`);
};

// ============ HELPER FUNCTIONS ============

function addHeader(doc: jsPDF, options: PDFOptions, totalRecords: number, orientation: 'landscape' | 'portrait'): void {
    const pageWidth = orientation === 'landscape' ? PAGE_WIDTH_LANDSCAPE : PAGE_WIDTH_PORTRAIT;

    // Title background
    doc.setFillColor(68, 114, 196);
    doc.rect(0, 0, pageWidth, 20, 'F');

    // Title
    doc.setFontSize(HEADING_SIZE);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(options.title, pageWidth / 2, 10, { align: 'center' });

    // Subtitle and record count
    doc.setFontSize(SMALL_SIZE + 1);
    doc.setFont('helvetica', 'normal');
    const subtitleText = options.subtitle || options.dateRange || '';
    if (subtitleText) {
        doc.text(subtitleText, pageWidth / 2, 16, { align: 'center' });
    }

    // Record count on right
    doc.text(`Total: ${totalRecords.toLocaleString()} records`, pageWidth - MARGIN, 16, { align: 'right' });

    // Generated timestamp
    doc.setFontSize(SMALL_SIZE);
    doc.setTextColor(100, 100, 100);
    const now = new Date();
    doc.text(`Generated: ${now.toLocaleString('en-GB')}`, MARGIN, 26);

    // Divider line
    doc.setDrawColor(68, 114, 196);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, 30, pageWidth - MARGIN, 30);
}

function addFooter(doc: jsPDF, options: PDFOptions, orientation: 'landscape' | 'portrait'): void {
    const pageCount = doc.getNumberOfPages();
    const pageWidth = orientation === 'landscape' ? PAGE_WIDTH_LANDSCAPE : PAGE_WIDTH_PORTRAIT;
    const pageHeight = orientation === 'landscape' ? PAGE_HEIGHT_LANDSCAPE : PAGE_HEIGHT_PORTRAIT;

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        // Footer line
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(MARGIN, pageHeight - 12, pageWidth - MARGIN, pageHeight - 12);

        // Page number
        doc.setFontSize(SMALL_SIZE);
        doc.setTextColor(100, 100, 100);
        doc.text(
            `Page ${i} of ${pageCount}`,
            pageWidth / 2,
            pageHeight - 6,
            { align: 'center' }
        );

        // Filter type badge
        if (options.filterType && options.filterType !== 'all') {
            doc.text(
                `Filter: ${options.filterType.toUpperCase()}`,
                pageWidth - MARGIN,
                pageHeight - 6,
                { align: 'right' }
            );
        }
    }
}

function addSummary(doc: jsPDF, items: { label: string; value: string }[], orientation: 'landscape' | 'portrait'): void {
    const yPos = (doc as any).lastAutoTable?.finalY + 8 || (orientation === 'landscape' ? PAGE_HEIGHT_LANDSCAPE : PAGE_HEIGHT_PORTRAIT) - 40;
    const pageWidth = orientation === 'landscape' ? PAGE_WIDTH_LANDSCAPE : PAGE_WIDTH_PORTRAIT;

    // Summary box
    doc.setFillColor(248, 249, 250);
    doc.rect(MARGIN, yPos - 2, pageWidth - (MARGIN * 2), 12, 'F');
    doc.setDrawColor(68, 114, 196);
    doc.rect(MARGIN, yPos - 2, pageWidth - (MARGIN * 2), 12);

    doc.setFontSize(CONTENT_SIZE);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(68, 114, 196);

    let xPos = MARGIN + 5;
    const spacing = (pageWidth - (MARGIN * 2) - 10) / items.length;

    items.forEach((item) => {
        doc.text(`${item.label}: ${item.value}`, xPos, yPos + 5);
        xPos += spacing;
    });
}

function generateOptimizedTable(
    doc: jsPDF,
    columns: ColumnDef[],
    data: any[],
    startY: number,
    originalRecords?: any[],
    orientation: 'landscape' | 'portrait' = 'landscape'
): void {
    autoTable(doc, {
        startY,
        head: [columns.map(c => c.header)],
        body: data.map((row) => columns.map(c => row[c.dataKey])),
        theme: 'grid',
        styles: {
            ...getBaseTableStyles(),
            fontSize: SMALL_SIZE
        },
        headStyles: getHeaderStyles(),
        alternateRowStyles: {
            fillColor: ALTERNATE_ROW
        },
        columnStyles: columns.reduce((acc, col, index) => {
            acc[index] = {
                cellWidth: col.width || 'auto',
                halign: col.halign || 'left',
                overflow: 'linebreak'
            };
            return acc;
        }, {} as any),
        margin: { left: MARGIN, right: MARGIN },
        didDrawCell: (cellData: any) => {
            // Color code rows based on movement type
            if (originalRecords && cellData.section === 'body') {
                const record = originalRecords[cellData.row.index];
                if (record) {
                    const mvmtType = (record.movementType || record.movement_type || '').toLowerCase();
                    if (mvmtType === 'purchase') {
                        cellData.cell.styles.fillColor = GREEN_BG;
                    } else if (mvmtType === 'sale') {
                        cellData.cell.styles.fillColor = RED_BG;
                    } else if (mvmtType === 'palti') {
                        cellData.cell.styles.fillColor = YELLOW_BG;
                    } else if (mvmtType === 'shifting' || mvmtType === 'production-shifting') {
                        cellData.cell.styles.fillColor = PURPLE_BG;
                    }
                }
            }
        },
        willDrawPage: (data: any) => {
            // Add continuation header on new pages
            if (data.pageNumber > 1) {
                doc.setFontSize(SMALL_SIZE);
                doc.setTextColor(100, 100, 100);
                doc.text('(continued)', MARGIN, 12);
            }
        }
    });
}

function formatDate(date: string | Date): string {
    if (!date) return '-';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch {
        return '-';
    }
}

function formatDateDisplay(date: string): string {
    if (!date || date === '-') return date;
    try {
        // Parse DD/MM/YYYY format
        const parts = date.split('/');
        if (parts.length === 3) {
            const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            return d.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: '2-digit'
            });
        }
        return date;
    } catch {
        return date;
    }
}

function formatNumber(value: any): string {
    if (value === null || value === undefined || value === '') return '-';
    const num = parseFloat(value);
    if (isNaN(num)) return '-';
    return num.toFixed(2);
}

function formatMovementType(type: string): string {
    if (!type) return '-';
    const typeMap: { [key: string]: string } = {
        'purchase': 'Purchase',
        'shifting': 'Shifting',
        'production-shifting': 'Prod-Shift',
        'for-production': 'For-Prod',
        'loose': 'Loose',
        'production': 'Production',
        'sale': 'Sale',
        'palti': 'Palti'
    };
    return typeMap[type.toLowerCase()] || type;
}

function formatAmountFormula(formula: string): string {
    if (!formula) return '-';
    return formula
        .replace(/\n/g, ',')
        .replace(/\\n/g, ',')
        .replace(/\s+/g, '')
        .replace(/,+/g, ',')
        .substring(0, 35) + (formula.length > 35 ? '...' : '');
}

function truncateText(text: string, maxLength: number): string {
    if (!text || text === '-') return '-';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 2) + '..';
}

function formatFilename(): string {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
}

function getFromLocation(record: any): string {
    if (record.movementType === 'purchase') {
        return record.fromLocation || '-';
    }
    if (record.fromKunchinittu?.code) {
        return `${record.fromKunchinittu.code}(${record.fromWarehouse?.code || '-'})`;
    }
    return '-';
}

function getToLocation(record: any): string {
    if (record.toKunchinittu?.code) {
        const warehouse = record.toWarehouse?.code || record.toWarehouseShift?.code || '-';
        return `${record.toKunchinittu.code}(${warehouse})`;
    }
    if (record.outturn?.code) {
        return record.outturn.code;
    }
    return '-';
}

export default {
    generateArrivalsPDF,
    generatePurchasePDF,
    generateShiftingPDF,
    generatePaddyStockPDF,
    generateRiceStockPDF,
    generateRiceMovementsPDF,
    generateOutturnReportPDF
};
