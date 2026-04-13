import { config } from '../config';
import { getApprovalInstanceList } from '../feishu/approval';
import { getLastMonthDateRange, getLastMonthName, formatDate } from '../utils/date';
import { ReimbursementRecord, PaymentRecord, generateExcel, saveExcelToFile } from '../utils/excel';
import { batchCreateRecords, deleteAllRecords, createBitableApp, createTableWithFields, getBitableShareUrl, BITABLE_FIELD_TYPES } from '../feishu/bitable';
import { sendTextMessage, sendFileMessage, sendInteractiveMessage, buildReportCard } from '../feishu/bot';
import { getUserOpenIdsByNames } from '../feishu/user';

const REIMBURSEMENT_FIELDS = [
  { field_name: '所属公司', type: BITABLE_FIELD_TYPES.TEXT },
  { field_name: '所属项目', type: BITABLE_FIELD_TYPES.TEXT },
  { field_name: '报销类型', type: BITABLE_FIELD_TYPES.TEXT },
  { field_name: '用途', type: BITABLE_FIELD_TYPES.TEXT },
  { field_name: '金额', type: BITABLE_FIELD_TYPES.NUMBER },
  { field_name: '付款日期', type: BITABLE_FIELD_TYPES.DATE },
  { field_name: '申请人', type: BITABLE_FIELD_TYPES.TEXT },
  { field_name: '支付凭证', type: BITABLE_FIELD_TYPES.ATTACHMENT },
  { field_name: '总金额', type: BITABLE_FIELD_TYPES.NUMBER },
  { field_name: '报销人银行卡', type: BITABLE_FIELD_TYPES.TEXT },
];

const PAYMENT_FIELDS = [
  { field_name: '所属公司', type: BITABLE_FIELD_TYPES.TEXT },
  { field_name: '所属项目', type: BITABLE_FIELD_TYPES.TEXT },
  { field_name: '付款原因', type: BITABLE_FIELD_TYPES.TEXT },
  { field_name: '金额', type: BITABLE_FIELD_TYPES.NUMBER },
  { field_name: '付款日期', type: BITABLE_FIELD_TYPES.DATE },
  { field_name: '发票合同', type: BITABLE_FIELD_TYPES.ATTACHMENT },
];

export interface ProcessResult {
  success: boolean;
  monthName: string;
  reimbursementCount: number;
  paymentCount: number;
  bitableUrl?: string;
  error?: string;
}

function extractFieldValue(instance: any, fieldName: string): any {
  const formStr = instance.form || '[]';
  let form: any[];
  
  try {
    form = typeof formStr === 'string' ? JSON.parse(formStr) : formStr;
  } catch (e) {
    console.error('解析表单数据失败:', e);
    return '';
  }

  for (const item of form) {
    if (item.name === fieldName || item.field_name === fieldName) {
      if (item.value !== undefined && item.value !== null) {
        if (typeof item.value === 'object') {
          if (Array.isArray(item.value)) {
            return item.value.join(', ');
          }
          return item.value.text || item.value.name || item.value.number || JSON.stringify(item.value);
        }
        return item.value;
      }
    }
  }
  return '';
}

function extractFieldListRows(instance: any): any[] {
  const formStr = instance.form || '[]';
  let form: any[];
  
  try {
    form = typeof formStr === 'string' ? JSON.parse(formStr) : formStr;
  } catch (e) {
    console.error('解析表单数据失败:', e);
    return [];
  }

  for (const item of form) {
    if (item.type === 'fieldList' && Array.isArray(item.value) && item.value.length > 0) {
      return item.value;
    }
  }
  return [];
}

function extractFieldFromRow(row: any[], fieldName: string): any {
  if (!Array.isArray(row)) return '';
  for (const field of row) {
    if (field.name === fieldName) {
      if (field.value !== undefined && field.value !== null) {
        if (typeof field.value === 'object') {
          if (Array.isArray(field.value)) {
            return field.value.join(', ');
          }
          return field.value.text || field.value.name || field.value.number || JSON.stringify(field.value);
        }
        return field.value;
      }
    }
  }
  return '';
}

function transformReimbursementData(instances: any[]): ReimbursementRecord[] {
  const records: ReimbursementRecord[] = [];
  
  for (const instance of instances) {
    const 所属公司 = extractFieldValue(instance, '所属公司');
    const 所属项目 = extractFieldValue(instance, '所属项目');
    const 报销类型 = extractFieldValue(instance, '报销类型');
    const 申请人 = extractFieldValue(instance, '申请人');
    const 报销人银行卡 = extractFieldValue(instance, '报销人银行卡');
    
    const fieldListRows = extractFieldListRows(instance);
    
    if (fieldListRows.length > 0) {
      for (const row of fieldListRows) {
        records.push({
          所属公司,
          所属项目,
          报销类型,
          用途: extractFieldFromRow(row, '用途'),
          金额: parseFloat(extractFieldFromRow(row, '金额')) || 0,
          付款日期: formatDate(parseDateFromString(extractFieldFromRow(row, '付款日期'))),
          申请人,
          支付凭证: extractFieldFromRow(row, '支付凭证'),
          总金额: 0,
          报销人银行卡,
        });
      }
    } else {
      records.push({
        所属公司,
        所属项目,
        报销类型,
        用途: extractFieldValue(instance, '用途'),
        金额: parseFloat(extractFieldValue(instance, '金额')) || 0,
        付款日期: formatDate(parseDateFromString(extractFieldValue(instance, '付款日期'))),
        申请人,
        支付凭证: extractFieldValue(instance, '支付凭证'),
        总金额: parseFloat(extractFieldValue(instance, '总金额')) || 0,
        报销人银行卡,
      });
    }
  }
  
  return records;
}

function transformPaymentData(instances: any[]): PaymentRecord[] {
  return instances.map((instance) => {
    return {
      所属公司: extractFieldValue(instance, '所属公司'),
      所属项目: extractFieldValue(instance, '所属项目') || extractFieldValue(instance, '付款账户'),
      付款原因: extractFieldValue(instance, '付款原因'),
      金额: parseFloat(extractFieldValue(instance, '金额')) || 0,
      付款日期: formatDate(parseDateFromString(extractFieldValue(instance, '付款日期') || extractFieldValue(instance, '计划付款日期'))),
      发票合同: extractFieldValue(instance, '发票/合同') || extractFieldValue(instance, '合同/发票'),
    };
  });
}

function parseDateFromString(dateStr: any): number {
  if (!dateStr) return 0;
  if (typeof dateStr === 'number') return dateStr;
  if (typeof dateStr === 'string') {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? 0 : date.getTime();
  }
  return 0;
}

function isDateInRange(dateStr: string, startTime: number, endTime: number): boolean {
  if (!dateStr) return false;
  const date = parseDateFromString(dateStr);
  if (!date) return false;
  return date >= startTime && date <= endTime;
}

export async function processMonthlyReport(): Promise<ProcessResult> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  // 上个月
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  // 报表月份名称
  const monthName = `${lastMonthYear}年${lastMonth + 1}月`;

  // 统计周期（付款日期）：上个月1日到上个月最后一天
  const startTime = new Date(lastMonthYear, lastMonth, 1).getTime();
  const endTime = new Date(lastMonthYear, lastMonth + 1, 0, 23, 59, 59).getTime(); // 上个月最后一天

  console.log(`开始处理 ${monthName} 报表...`);
  console.log(`统计周期(付款日期): ${new Date(startTime).toISOString()} - ${new Date(endTime).toISOString()}`);

  // 查询提交日期范围：上个月1日到本月5号（或今天，如果今天小于5号）
  const queryStartTime = startTime;
  const queryEndDay = currentDay < 5 ? currentDay : 5;
  const queryEndTime = new Date(currentYear, currentMonth, queryEndDay, 23, 59, 59).getTime();
  console.log(`查询审批时间范围(提交日期): ${new Date(queryStartTime).toISOString()} - ${new Date(queryEndTime).toISOString()}`);

  try {
    console.log('获取报销申请数据...');
    const reimbursementResult = await getApprovalInstanceList(
      config.feishu.approvalCode,
      queryStartTime,
      queryEndTime
    );
    const reimbursementInstances = reimbursementResult.data.filter(
      (instance) => instance.status === 'APPROVED' || instance.status === 2
    );
    console.log(`获取到 ${reimbursementInstances.length} 条报销申请`);

    console.log('获取付款申请数据...');
    const paymentResult = await getApprovalInstanceList(
      config.feishu.approvalCodePayment,
      queryStartTime,
      queryEndTime
    );
    const paymentInstances = paymentResult.data.filter(
      (instance) => instance.status === 'APPROVED' || instance.status === 2
    );
    console.log(`获取到 ${paymentInstances.length} 条付款申请`);

    const reimbursementData = transformReimbursementData(reimbursementInstances);
    console.log('\n=== 报销申请原始数据 ===');
    reimbursementData.forEach((record, index) => {
      console.log(`${index + 1}. 申请人=${record.申请人}, 付款日期=${record.付款日期}, 金额=${record.金额}, 用途=${record.用途}`);
    });

    const filteredReimbursementData = reimbursementData.filter(record => {
      return isDateInRange(record.付款日期, startTime, endTime);
    });
    console.log(`\n根据付款日期过滤后: 报销 ${filteredReimbursementData.length} 条`);

    const paymentData = transformPaymentData(paymentInstances);
    console.log('\n=== 付款申请原始数据 ===');
    paymentData.forEach((record, index) => {
      console.log(`${index + 1}. 所属公司=${record.所属公司}, 付款日期=${record.付款日期}, 金额=${record.金额}, 付款原因=${record.付款原因}`);
    });

    const filteredPaymentData = paymentData.filter(record => {
      return isDateInRange(record.付款日期, startTime, endTime);
    });
    console.log(`\n根据付款日期过滤后: 付款 ${filteredPaymentData.length} 条`);

    const excelBuffer = await generateExcel(filteredReimbursementData, filteredPaymentData, monthName);
    console.log(`Excel 文件已生成，大小: ${excelBuffer.length} bytes`);

    const excelFilePath = saveExcelToFile(excelBuffer, monthName);
    console.log(`Excel 文件路径: ${excelFilePath}`);

    let bitableUrl = '';

    if (config.bitable.appToken) {
      console.log('上传数据到多维表格...');

      try {
        if (config.bitable.tableIdReimbursement) {
          await deleteAllRecords(config.bitable.tableIdReimbursement);
          if (reimbursementData.length > 0) {
            await batchCreateRecords(
              config.bitable.tableIdReimbursement,
              reimbursementData.map((r) => ({ fields: r }))
            );
          }
        }

        if (config.bitable.tableIdPayment) {
          await deleteAllRecords(config.bitable.tableIdPayment);
          if (paymentData.length > 0) {
            await batchCreateRecords(
              config.bitable.tableIdPayment,
              paymentData.map((p) => ({ fields: p }))
            );
          }
        }

        bitableUrl = await getBitableShareUrl();
      } catch (bitableError) {
        console.error('多维表格处理失败，继续生成Excel:', bitableError);
      }
    } else {
      console.log('未配置多维表格，跳过多维表格步骤');
    }

    if (config.recipients.length > 0) {
      console.log('发送通知消息...');

      const recipientNames = config.recipients;
      const openIds = await getUserOpenIdsByNames(recipientNames);

      if (openIds.length > 0) {
        const fileName = `${monthName}报销付款统计报表.xlsx`;

        try {
          await sendFileMessage(openIds, excelFilePath, fileName);
          console.log('Excel文件已发送');
        } catch (fileError) {
          console.error('发送文件失败，发送文本消息:', fileError);
          await sendTextMessage(
            openIds,
            `${monthName} 报销付款统计报表已生成\n报销申请: ${reimbursementData.length} 条\n付款申请: ${paymentData.length} 条`
          );
        }

        if (bitableUrl) {
          const card = buildReportCard(
            monthName,
            reimbursementData.length,
            paymentData.length,
            bitableUrl
          );
          await sendInteractiveMessage(openIds, card);
        }
      }
    }

    console.log('处理完成!');

    return {
      success: true,
      monthName,
      reimbursementCount: reimbursementData.length,
      paymentCount: paymentData.length,
      bitableUrl,
    };
  } catch (error: any) {
    console.error('处理失败:', error);
    return {
      success: false,
      monthName,
      reimbursementCount: 0,
      paymentCount: 0,
      error: error.message || '未知错误',
    };
  }
}
