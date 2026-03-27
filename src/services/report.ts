import { config } from '../config';
import { getApprovalInstanceList } from '../feishu/approval';
import { getLastMonthDateRange, getLastMonthName, formatDate } from '../utils/date';
import { ReimbursementRecord, PaymentRecord, generateExcel } from '../utils/excel';
import { batchCreateRecords, deleteAllRecords, createBitableApp, createTableWithFields, getBitableShareUrl, BITABLE_FIELD_TYPES } from '../feishu/bitable';
import { sendTextMessage, sendInteractiveMessage, buildReportCard } from '../feishu/bot';
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
  const form = instance.form || [];
  for (const item of form) {
    if (item.field_name === fieldName) {
      if (item.value) {
        if (typeof item.value === 'object') {
          return item.value.text || item.value.name || item.value.number || JSON.stringify(item.value);
        }
        return item.value;
      }
    }
  }
  return '';
}

function transformReimbursementData(instances: any[]): ReimbursementRecord[] {
  return instances.map((instance) => {
    return {
      所属公司: extractFieldValue(instance, '所属公司'),
      所属项目: extractFieldValue(instance, '所属项目'),
      报销类型: extractFieldValue(instance, '报销类型'),
      用途: extractFieldValue(instance, '用途'),
      金额: parseFloat(extractFieldValue(instance, '金额')) || 0,
      付款日期: formatDate(parseDateFromString(extractFieldValue(instance, '付款日期'))),
      申请人: extractFieldValue(instance, '申请人'),
      支付凭证: extractFieldValue(instance, '支付凭证'),
      总金额: parseFloat(extractFieldValue(instance, '总金额')) || 0,
      报销人银行卡: extractFieldValue(instance, '报销人银行卡'),
    };
  });
}

function transformPaymentData(instances: any[]): PaymentRecord[] {
  return instances.map((instance) => {
    return {
      所属公司: extractFieldValue(instance, '所属公司'),
      所属项目: extractFieldValue(instance, '所属项目'),
      付款原因: extractFieldValue(instance, '付款原因'),
      金额: parseFloat(extractFieldValue(instance, '金额')) || 0,
      付款日期: formatDate(parseDateFromString(extractFieldValue(instance, '付款日期'))),
      发票合同: extractFieldValue(instance, '发票/合同'),
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

export async function processMonthlyReport(): Promise<ProcessResult> {
  const monthName = getLastMonthName();
  const { startTime, endTime } = getLastMonthDateRange();

  console.log(`开始处理 ${monthName} 报表...`);
  console.log(`时间范围: ${new Date(startTime).toISOString()} - ${new Date(endTime).toISOString()}`);

  try {
    console.log('获取报销申请数据...');
    const reimbursementResult = await getApprovalInstanceList(
      config.feishu.approvalCode,
      startTime,
      endTime
    );
    const reimbursementInstances = reimbursementResult.data.filter(
      (instance) => instance.status === 2
    );
    console.log(`获取到 ${reimbursementInstances.length} 条报销申请`);

    console.log('获取付款申请数据...');
    const paymentResult = await getApprovalInstanceList(
      config.feishu.approvalCodePayment,
      startTime,
      endTime
    );
    const paymentInstances = paymentResult.data.filter(
      (instance) => instance.status === 2
    );
    console.log(`获取到 ${paymentInstances.length} 条付款申请`);

    const reimbursementData = transformReimbursementData(reimbursementInstances);
    const paymentData = transformPaymentData(paymentInstances);

    const excelBuffer = generateExcel(reimbursementData, paymentData, monthName);
    console.log(`Excel 文件已生成，大小: ${excelBuffer.length} bytes`);

    let bitableUrl = '';

    if (!config.bitable.appToken) {
      console.log('未配置多维表格 App Token，自动创建...');
      const bitableName = `${monthName} 报销付款统计报表`;
      config.bitable.appToken = await createBitableApp(bitableName);
      console.log(`多维表格已创建，App Token: ${config.bitable.appToken}`);

      const reimbursementTableId = await createTableWithFields(
        config.bitable.appToken,
        '报销登记表',
        REIMBURSEMENT_FIELDS
      );
      config.bitable.tableIdReimbursement = reimbursementTableId;

      const paymentTableId = await createTableWithFields(
        config.bitable.appToken,
        '付款登记表',
        PAYMENT_FIELDS
      );
      config.bitable.tableIdPayment = paymentTableId;
    }

    if (config.bitable.appToken) {
      console.log('上传数据到多维表格...');

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
    }

    if (config.recipients.length > 0) {
      console.log('发送通知消息...');

      const recipientNames = config.recipients;
      const openIds = await getUserOpenIdsByNames(recipientNames);

      if (openIds.length > 0 && bitableUrl) {
        const card = buildReportCard(
          monthName,
          reimbursementData.length,
          paymentData.length,
          bitableUrl
        );
        await sendInteractiveMessage(openIds, card);
      } else {
        await sendTextMessage(
          openIds,
          `${monthName} 报销付款统计报表已生成\n报销申请: ${reimbursementData.length} 条\n付款申请: ${paymentData.length} 条`
        );
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
