"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processMonthlyReport = processMonthlyReport;
const config_1 = require("../config");
const approval_1 = require("../feishu/approval");
const date_1 = require("../utils/date");
const excel_1 = require("../utils/excel");
const bitable_1 = require("../feishu/bitable");
const bot_1 = require("../feishu/bot");
const user_1 = require("../feishu/user");
const REIMBURSEMENT_FIELDS = [
    { field_name: '所属公司', type: bitable_1.BITABLE_FIELD_TYPES.TEXT },
    { field_name: '所属项目', type: bitable_1.BITABLE_FIELD_TYPES.TEXT },
    { field_name: '报销类型', type: bitable_1.BITABLE_FIELD_TYPES.TEXT },
    { field_name: '用途', type: bitable_1.BITABLE_FIELD_TYPES.TEXT },
    { field_name: '金额', type: bitable_1.BITABLE_FIELD_TYPES.NUMBER },
    { field_name: '付款日期', type: bitable_1.BITABLE_FIELD_TYPES.DATE },
    { field_name: '申请人', type: bitable_1.BITABLE_FIELD_TYPES.TEXT },
    { field_name: '支付凭证', type: bitable_1.BITABLE_FIELD_TYPES.ATTACHMENT },
    { field_name: '总金额', type: bitable_1.BITABLE_FIELD_TYPES.NUMBER },
    { field_name: '报销人银行卡', type: bitable_1.BITABLE_FIELD_TYPES.TEXT },
];
const PAYMENT_FIELDS = [
    { field_name: '所属公司', type: bitable_1.BITABLE_FIELD_TYPES.TEXT },
    { field_name: '所属项目', type: bitable_1.BITABLE_FIELD_TYPES.TEXT },
    { field_name: '付款原因', type: bitable_1.BITABLE_FIELD_TYPES.TEXT },
    { field_name: '金额', type: bitable_1.BITABLE_FIELD_TYPES.NUMBER },
    { field_name: '付款日期', type: bitable_1.BITABLE_FIELD_TYPES.DATE },
    { field_name: '发票合同', type: bitable_1.BITABLE_FIELD_TYPES.ATTACHMENT },
];
function extractFieldValue(instance, fieldName) {
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
function transformReimbursementData(instances) {
    return instances.map((instance) => {
        return {
            所属公司: extractFieldValue(instance, '所属公司'),
            所属项目: extractFieldValue(instance, '所属项目'),
            报销类型: extractFieldValue(instance, '报销类型'),
            用途: extractFieldValue(instance, '用途'),
            金额: parseFloat(extractFieldValue(instance, '金额')) || 0,
            付款日期: (0, date_1.formatDate)(parseDateFromString(extractFieldValue(instance, '付款日期'))),
            申请人: extractFieldValue(instance, '申请人'),
            支付凭证: extractFieldValue(instance, '支付凭证'),
            总金额: parseFloat(extractFieldValue(instance, '总金额')) || 0,
            报销人银行卡: extractFieldValue(instance, '报销人银行卡'),
        };
    });
}
function transformPaymentData(instances) {
    return instances.map((instance) => {
        return {
            所属公司: extractFieldValue(instance, '所属公司'),
            所属项目: extractFieldValue(instance, '所属项目'),
            付款原因: extractFieldValue(instance, '付款原因'),
            金额: parseFloat(extractFieldValue(instance, '金额')) || 0,
            付款日期: (0, date_1.formatDate)(parseDateFromString(extractFieldValue(instance, '付款日期'))),
            发票合同: extractFieldValue(instance, '发票/合同'),
        };
    });
}
function parseDateFromString(dateStr) {
    if (!dateStr)
        return 0;
    if (typeof dateStr === 'number')
        return dateStr;
    if (typeof dateStr === 'string') {
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? 0 : date.getTime();
    }
    return 0;
}
async function processMonthlyReport() {
    const monthName = (0, date_1.getLastMonthName)();
    const { startTime, endTime } = (0, date_1.getLastMonthDateRange)();
    console.log(`开始处理 ${monthName} 报表...`);
    console.log(`时间范围: ${new Date(startTime).toISOString()} - ${new Date(endTime).toISOString()}`);
    try {
        console.log('获取报销申请数据...');
        const reimbursementResult = await (0, approval_1.getApprovalInstanceList)(config_1.config.feishu.approvalCode, startTime, endTime);
        const reimbursementInstances = reimbursementResult.data.filter((instance) => instance.status === 2);
        console.log(`获取到 ${reimbursementInstances.length} 条报销申请`);
        console.log('获取付款申请数据...');
        const paymentResult = await (0, approval_1.getApprovalInstanceList)(config_1.config.feishu.approvalCodePayment, startTime, endTime);
        const paymentInstances = paymentResult.data.filter((instance) => instance.status === 2);
        console.log(`获取到 ${paymentInstances.length} 条付款申请`);
        const reimbursementData = transformReimbursementData(reimbursementInstances);
        const paymentData = transformPaymentData(paymentInstances);
        const excelBuffer = (0, excel_1.generateExcel)(reimbursementData, paymentData, monthName);
        console.log(`Excel 文件已生成，大小: ${excelBuffer.length} bytes`);
        let bitableUrl = '';
        if (!config_1.config.bitable.appToken) {
            console.log('未配置多维表格 App Token，自动创建...');
            const bitableName = `${monthName} 报销付款统计报表`;
            config_1.config.bitable.appToken = await (0, bitable_1.createBitableApp)(bitableName);
            console.log(`多维表格已创建，App Token: ${config_1.config.bitable.appToken}`);
            const reimbursementTableId = await (0, bitable_1.createTableWithFields)(config_1.config.bitable.appToken, '报销登记表', REIMBURSEMENT_FIELDS);
            config_1.config.bitable.tableIdReimbursement = reimbursementTableId;
            const paymentTableId = await (0, bitable_1.createTableWithFields)(config_1.config.bitable.appToken, '付款登记表', PAYMENT_FIELDS);
            config_1.config.bitable.tableIdPayment = paymentTableId;
        }
        if (config_1.config.bitable.appToken) {
            console.log('上传数据到多维表格...');
            if (config_1.config.bitable.tableIdReimbursement) {
                await (0, bitable_1.deleteAllRecords)(config_1.config.bitable.tableIdReimbursement);
                if (reimbursementData.length > 0) {
                    await (0, bitable_1.batchCreateRecords)(config_1.config.bitable.tableIdReimbursement, reimbursementData.map((r) => ({ fields: r })));
                }
            }
            if (config_1.config.bitable.tableIdPayment) {
                await (0, bitable_1.deleteAllRecords)(config_1.config.bitable.tableIdPayment);
                if (paymentData.length > 0) {
                    await (0, bitable_1.batchCreateRecords)(config_1.config.bitable.tableIdPayment, paymentData.map((p) => ({ fields: p })));
                }
            }
            bitableUrl = await (0, bitable_1.getBitableShareUrl)();
        }
        if (config_1.config.recipients.length > 0) {
            console.log('发送通知消息...');
            const recipientNames = config_1.config.recipients;
            const openIds = await (0, user_1.getUserOpenIdsByNames)(recipientNames);
            if (openIds.length > 0 && bitableUrl) {
                const card = (0, bot_1.buildReportCard)(monthName, reimbursementData.length, paymentData.length, bitableUrl);
                await (0, bot_1.sendInteractiveMessage)(openIds, card);
            }
            else {
                await (0, bot_1.sendTextMessage)(openIds, `${monthName} 报销付款统计报表已生成\n报销申请: ${reimbursementData.length} 条\n付款申请: ${paymentData.length} 条`);
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
    }
    catch (error) {
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
