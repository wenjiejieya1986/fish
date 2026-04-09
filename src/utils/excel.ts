import ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';

export interface ReimbursementRecord {
  所属公司: string;
  所属项目: string;
  报销类型: string;
  用途: string;
  金额: number;
  付款日期: string;
  申请人: string;
  支付凭证: string;
  总金额: number;
  报销人银行卡: string;
}

export interface PaymentRecord {
  所属公司: string;
  所属项目: string;
  付款原因: string;
  金额: number;
  付款日期: string;
  发票合同: string;
}

export async function generateExcel(
  reimbursementData: ReimbursementRecord[],
  paymentData: PaymentRecord[],
  monthName: string
): Promise<any> {
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();

  const reimbursementSheet = workbook.addWorksheet('报销登记表');
  const paymentSheet = workbook.addWorksheet('付款登记表');

  const lightYellowFill: any = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFCC' }
  };

  const darkYellowFill: any = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFF00' }
  };

  const blueFill: any = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9E1F2' }
  };

  const titleRow1 = reimbursementSheet.addRow([`${monthName}报销统计报表`]);
  titleRow1.getCell(1).font = { bold: true, size: 14 };
  titleRow1.getCell(1).alignment = { horizontal: 'center' };
  reimbursementSheet.mergeCells('A1:I1');

  const headers1 = ['所属公司', '所属项目', '报销类型', '用途', '金额', '付款日期', '申请人', '支付凭证', '报销人银行卡'];
  const headerRow1 = reimbursementSheet.addRow(headers1);
  headerRow1.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = blueFill;
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    };
    cell.alignment = { horizontal: 'center' };
  });

  const groups = new Map<string, ReimbursementRecord[]>();
  for (const record of reimbursementData) {
    const applicant = record.申请人 || '未知';
    if (!groups.has(applicant)) {
      groups.set(applicant, []);
    }
    groups.get(applicant)!.push(record);
  }

  for (const [applicant, records] of groups) {
    for (const record of records) {
      const row = reimbursementSheet.addRow([
        record.所属公司,
        record.所属项目,
        record.报销类型,
        record.用途,
        record.金额,
        record.付款日期,
        record.申请人,
        record.支付凭证.startsWith('http') ? '附件' : record.支付凭证,
        record.报销人银行卡,
      ]);

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      if (record.支付凭证.startsWith('http')) {
        const cell = row.getCell(8);
        cell.value = {
          text: '附件',
          hyperlink: record.支付凭证
        };
      }
    }

    let subtotal = 0;
    for (const record of records) {
      subtotal += record.金额 || 0;
    }

    const subtotalRow = reimbursementSheet.addRow(['', '', '', '小计', subtotal, '', '', '', '']);
    subtotalRow.eachCell((cell) => {
      cell.fill = lightYellowFill;
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.font = { bold: true };
    });
  }

  let grandTotal = 0;
  for (const record of reimbursementData) {
    grandTotal += record.金额 || 0;
  }

  const grandTotalRow = reimbursementSheet.addRow(['', '', '', '月度总计', grandTotal, '', '', '', '']);
  grandTotalRow.eachCell((cell) => {
    cell.fill = darkYellowFill;
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    };
    cell.font = { bold: true };
  });

  reimbursementSheet.columns = [
    { width: 15 },
    { width: 20 },
    { width: 15 },
    { width: 30 },
    { width: 12 },
    { width: 15 },
    { width: 12 },
    { width: 30 },
    { width: 25 },
  ];

  const titleRow2 = paymentSheet.addRow([`${monthName}付款统计报表`]);
  titleRow2.getCell(1).font = { bold: true, size: 14 };
  titleRow2.getCell(1).alignment = { horizontal: 'center' };
  paymentSheet.mergeCells('A1:F1');

  const headers2 = ['所属公司', '所属项目', '付款原因', '金额', '付款日期', '发票合同'];
  const headerRow2 = paymentSheet.addRow(headers2);
  headerRow2.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = blueFill;
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    };
    cell.alignment = { horizontal: 'center' };
  });

  for (const record of paymentData) {
    const row = paymentSheet.addRow([
      record.所属公司,
      record.所属项目,
      record.付款原因,
      record.金额,
      record.付款日期,
      record.发票合同.startsWith('http') ? '附件' : record.发票合同,
    ]);

    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    if (record.发票合同.startsWith('http')) {
      const cell = row.getCell(6);
      cell.value = {
        text: '附件',
        hyperlink: record.发票合同
      };
    }
  }

  paymentSheet.columns = [
    { width: 15 },
    { width: 20 },
    { width: 30 },
    { width: 12 },
    { width: 15 },
    { width: 35 },
  ];

  return await workbook.xlsx.writeBuffer();
}

export function saveExcelToFile(buffer: any, monthName: string): string {
  const exportDir = path.join(process.cwd(), 'exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }
  const fileName = `${monthName}报销付款统计报表.xlsx`;
  const filePath = path.join(exportDir, fileName);
  fs.writeFileSync(filePath, Buffer.from(buffer));
  console.log(`Excel 文件已保存到: ${filePath}`);
  return filePath;
}