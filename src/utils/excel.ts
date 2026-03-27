import * as XLSX from 'xlsx';

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

export function generateExcel(
  reimbursementData: ReimbursementRecord[],
  paymentData: PaymentRecord[],
  monthName: string
): Buffer {
  const workbook = XLSX.utils.book_new();

  const reimbursementSheet = XLSX.utils.json_to_sheet(reimbursementData);
  const paymentSheet = XLSX.utils.json_to_sheet(paymentData);

  reimbursementSheet['!cols'] = [
    { wch: 15 },
    { wch: 20 },
    { wch: 15 },
    { wch: 30 },
    { wch: 12 },
    { wch: 15 },
    { wch: 12 },
    { wch: 20 },
    { wch: 12 },
    { wch: 25 },
  ];

  paymentSheet['!cols'] = [
    { wch: 15 },
    { wch: 20 },
    { wch: 30 },
    { wch: 12 },
    { wch: 15 },
    { wch: 25 },
  ];

  XLSX.utils.book_append_sheet(workbook, reimbursementSheet, '报销登记表');
  XLSX.utils.book_append_sheet(workbook, paymentSheet, '付款登记表');

  const excelBuffer = XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
  });

  return Buffer.from(excelBuffer);
}
