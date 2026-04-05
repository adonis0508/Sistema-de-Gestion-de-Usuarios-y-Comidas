import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

function parseName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { grado: '', nombre: '', apellido: parts[0].toUpperCase() };
  
  const lowerParts = parts.map(p => p.toLowerCase());
  let gradoTokens = 0;
  if (lowerParts[0] === 'tte' && lowerParts[1] === '1ro') gradoTokens = 2;
  else if (['tte', 'cap', 'my', 'tcnl', 'cnl', 'gral', 'subt', 'subof', 'sarg', 'cabo', 'vol', 'cdte'].includes(lowerParts[0])) gradoTokens = 1;
  
  const grado = parts.slice(0, gradoTokens).join(' ');
  const apellido = parts[parts.length - 1].toUpperCase();
  const nombre = parts.slice(gradoTokens, parts.length - 1).join(' ');
  
  return { grado, nombre, apellido };
}

function processReservations(reservations: any[]) {
  const grouped: Record<string, any> = {};
  reservations.forEach(r => {
    if (!grouped[r.userName]) {
      grouped[r.userName] = {
        userName: r.userName,
        ac: false, ac_p: false,
        cc: false, cc_p: false,
        ar: false, ar_p: false,
        cr: false, cr_p: false,
      };
    }
    const user = grouped[r.userName];
    if (r.meal === 'almuerzo' && r.menuType === 'casino') {
      user.ac = true; user.ac_p = r.attended;
    } else if (r.meal === 'cena' && r.menuType === 'casino') {
      user.cc = true; user.cc_p = r.attended;
    } else if (r.meal === 'almuerzo' && r.menuType === 'rancho') {
      user.ar = true; user.ar_p = r.attended;
    } else if (r.meal === 'cena' && r.menuType === 'rancho') {
      user.cr = true; user.cr_p = r.attended;
    }
  });

  return Object.values(grouped).sort((a, b) => a.userName.localeCompare(b.userName));
}

function getFormattedDate(dateStr: string) {
  const d = format(parseISO(dateStr), 'dd MMM yy', { locale: es });
  // Capitalize month: "04 abr 26" -> "04 Abr 26"
  const parts = d.split(' ');
  if (parts.length === 3) {
    parts[1] = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
    return parts.join(' ');
  }
  return d;
}

export function exportToPDF(date: string, reservations: any[]) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const formattedDate = getFormattedDate(date);
  const rows = processReservations(reservations);

  // Header Texts
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.text("Ejército Argentino", 14, 15);
  doc.text("Agrupación de Comunicaciones 601", 14, 20);
  
  doc.setFont("helvetica", "normal");
  doc.text("\"AÑO DE LA GRANDEZA ARGENTINA\"", 196, 15, { align: 'right' });

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Casino de Oficiales - GECB", 105, 30, { align: 'center' });
  
  // Table
  let sum_ac = 0, sum_ac_p = 0;
  let sum_cc = 0, sum_cc_p = 0;
  let sum_ar = 0, sum_ar_p = 0;
  let sum_cr = 0, sum_cr_p = 0;

  const tableBody = rows.map((r, i) => {
    if (r.ac) sum_ac++; if (r.ac && r.ac_p) sum_ac_p++;
    if (r.cc) sum_cc++; if (r.cc && r.cc_p) sum_cc_p++;
    if (r.ar) sum_ar++; if (r.ar && r.ar_p) sum_ar_p++;
    if (r.cr) sum_cr++; if (r.cr && r.cr_p) sum_cr_p++;

    const { grado, nombre, apellido } = parseName(r.userName);
    return [
      (i + 1).toString(),
      grado,
      nombre,
      apellido,
      r.ac ? 'X' : '-',
      r.ac ? (r.ac_p ? 'P' : 'A') : '-',
      r.cc ? 'X' : '-',
      r.cc ? (r.cc_p ? 'P' : 'A') : '-',
      r.ar ? 'X' : '-',
      r.ar ? (r.ar_p ? 'P' : 'A') : '-',
      r.cr ? 'X' : '-',
      r.cr ? (r.cr_p ? 'P' : 'A') : '-'
    ];
  });

  const tableFoot = [
    [
      { content: 'TOTAL', colSpan: 4, styles: { halign: 'center', fontStyle: 'bold' } },
      sum_ac.toString(),
      sum_ac_p.toString(),
      sum_cc.toString(),
      sum_cc_p.toString(),
      sum_ar.toString(),
      sum_ar_p.toString(),
      sum_cr.toString(),
      sum_cr_p.toString()
    ]
  ];

  autoTable(doc, {
    startY: 35,
    head: [
      [
        { content: `Reporte ${formattedDate}`, colSpan: 12, styles: { halign: 'center', fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1, lineColor: [0, 0, 0] } }
      ],
      [
        'Nro', 'Grado', 'Nombre', 'APELLIDO', 
        'Almuerzo\nCasino', 'P/A', 'Cena\nCasino', 'P/A', 
        'Almuerzo\nRancho', 'P/A', 'Cena\nRancho', 'P/A'
      ]
    ],
    body: tableBody,
    foot: tableFoot,
    theme: 'grid',
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1, lineColor: [0, 0, 0], halign: 'center', valign: 'middle' },
    bodyStyles: { textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [0, 0, 0], halign: 'center', valign: 'middle' },
    footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1, lineColor: [0, 0, 0], halign: 'center' },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 20, halign: 'left' },
      2: { cellWidth: 30, halign: 'left' },
      3: { cellWidth: 30, halign: 'left' },
    },
    styles: { fontSize: 8, cellPadding: 1 },
  });

  const finalY = (doc as any).lastAutoTable.finalY;
  doc.text("........................................", 150, finalY + 20);

  doc.save(`Reporte_${formattedDate.replace(/ /g, '_')}.pdf`);
}

export function exportToExcel(date: string, reservations: any[]) {
  const formattedDate = getFormattedDate(date);
  const rows = processReservations(reservations);

  let sum_ac = 0, sum_ac_p = 0;
  let sum_cc = 0, sum_cc_p = 0;
  let sum_ar = 0, sum_ar_p = 0;
  let sum_cr = 0, sum_cr_p = 0;

  const tableBody = rows.map((r, i) => {
    if (r.ac) sum_ac++; if (r.ac && r.ac_p) sum_ac_p++;
    if (r.cc) sum_cc++; if (r.cc && r.cc_p) sum_cc_p++;
    if (r.ar) sum_ar++; if (r.ar && r.ar_p) sum_ar_p++;
    if (r.cr) sum_cr++; if (r.cr && r.cr_p) sum_cr_p++;

    const { grado, nombre, apellido } = parseName(r.userName);
    return [
      i + 1,
      grado,
      nombre,
      apellido,
      r.ac ? 'X' : '-',
      r.ac ? (r.ac_p ? 'P' : 'A') : '-',
      r.cc ? 'X' : '-',
      r.cc ? (r.cc_p ? 'P' : 'A') : '-',
      r.ar ? 'X' : '-',
      r.ar ? (r.ar_p ? 'P' : 'A') : '-',
      r.cr ? 'X' : '-',
      r.cr ? (r.cr_p ? 'P' : 'A') : '-'
    ];
  });

  const wsData = [
    ["Ejército Argentino", "", "", "", "", "", "", "", "\"AÑO DE LA GRANDEZA ARGENTINA\""],
    ["Agrupación de Comunicaciones 601"],
    [],
    ["", "", "", "Casino de Oficiales - GECB"],
    [`Reporte ${formattedDate}`],
    ["Nro", "Grado", "Nombre", "APELLIDO", "Almuerzo Casino", "P/A", "Cena Casino", "P/A", "Almuerzo Rancho", "P/A", "Cena Rancho", "P/A"],
    ...tableBody,
    ["TOTAL", "", "", "", sum_ac, sum_ac_p, sum_cc, sum_cc_p, sum_ar, sum_ar_p, sum_cr, sum_cr_p],
    [],
    ["", "", "", "", "", "", "", "", "", ".............................."]
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Merge cells
  ws['!merges'] = [
    { s: { r: 4, c: 0 }, e: { r: 4, c: 11 } }, // Reporte DD Mmm AA spans all columns
    { s: { r: 6 + rows.length, c: 0 }, e: { r: 6 + rows.length, c: 3 } } // TOTAL spans first 4 columns
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Reporte");
  
  XLSX.writeFile(wb, `Reporte_${formattedDate.replace(/ /g, '_')}.xlsx`);
}
