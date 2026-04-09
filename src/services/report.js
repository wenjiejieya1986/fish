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
    const formStr = instance.form || '[]';
    let form;
    try {
        form = typeof formStr === 'string' ? JSON.parse(formStr) : formStr;
    }
    catch (e) {
        console.error('解析表单数据失败:', e);
        return '';
    }
    console.log(`\n提取字段 "${fieldName}", 表单字段数量: ${form.length}`);
    for (const item of form) {
        console.log(`  检查字段: name="${item.name}", field_name="${item.field_name}", type="${item.type}"`);
        if (item.name === fieldName || item.field_name === fieldName) {
            console.log(`  ✓ 找到匹配字段: ${fieldName} = ${JSON.stringify(item.value)}`);
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
        if (item.type === 'fieldList' && Array.isArray(item.value)) {
            console.log(`  检查 fieldList, 行数: ${item.value.length}`);
            for (const row of item.value) {
                if (Array.isArray(row)) {
                    for (const field of row) {
                        console.log(`    fieldList 字段: name="${field.name}", value="${field.value}"`);
                        if (field.name === fieldName || field.field_name === fieldName) {
                            console.log(`    ✓ 在 fieldList 中找到匹配字段: ${fieldName} = ${JSON.stringify(field.value)}`);
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
                }
            }
        }
    }
    console.log(`  ✗ 未找到字段: ${fieldName}`);
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
            所属项目: extractFieldValue(instance, '所属项目') || extractFieldValue(instance, '付款账户'),
            付款原因: extractFieldValue(instance, '付款原因'),
            金额: parseFloat(extractFieldValue(instance, '金额')) || 0,
            付款日期: (0, date_1.formatDate)(parseDateFromString(extractFieldValue(instance, '付款日期') || extractFieldValue(instance, '计划付款日期'))),
            发票合同: extractFieldValue(instance, '发票/合同') || extractFieldValue(instance, '合同/发票'),
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
function isDateInRange(dateStr, startTime, endTime) {
    if (!dateStr)
        return false;
    const date = parseDateFromString(dateStr);
    if (!date)
        return false;
    return date >= startTime && date <= endTime;
}
async function processMonthlyReport() {
    const monthName = (0, date_1.getLastMonthName)();
    const { startTime, endTime } = (0, date_1.getLastMonthDateRange)();
    console.log(`开始处理 ${monthName} 报表...`);
    console.log(`统计周期(付款日期): ${new Date(startTime).toISOString()} - ${new Date(endTime).toISOString()}`);
    // 查询更宽的时间范围(最近6个月)，用于获取所有可能的审批数据
    const queryStartTime = startTime - 180 * 24 * 60 * 60 * 1000; // 往前6个月
    console.log(`查询审批时间范围(提交日期): ${new Date(queryStartTime).toISOString()} - ${new Date(endTime).toISOString()}`);
    try {
        console.log('获取报销申请数据...');
        const reimbursementResult = await (0, approval_1.getApprovalInstanceList)(config_1.config.feishu.approvalCode, queryStartTime, endTime);
        const reimbursementInstances = reimbursementResult.data.filter((instance) => instance.status === 'APPROVED' || instance.status === 2);
        console.log(`获取到 ${reimbursementInstances.length} 条报销申请`);
        console.log('获取付款申请数据...');
        const paymentResult = await (0, approval_1.getApprovalInstanceList)(config_1.config.feishu.approvalCodePayment, queryStartTime, endTime);
        const paymentInstances = paymentResult.data.filter((instance) => instance.status === 'APPROVED' || instance.status === 2);
        console.log(`获取到 ${paymentInstances.length} 条付款申请`);
        // 转换数据并按付款日期过滤
        const reimbursementData = transformReimbursementData(reimbursementInstances).filter(record => {
            return isDateInRange(record.付款日期, startTime, endTime);
        });
        const paymentData = transformPaymentData(paymentInstances).filter(record => {
            return isDateInRange(record.付款日期, startTime, endTime);
        });
        console.log(`根据付款日期过滤后: 报销 ${reimbursementData.length} 条, 付款 ${paymentData.length} 条`);
        const excelBuffer = await (0, excel_1.generateExcel)(reimbursementData, paymentData, monthName);
        console.log(`Excel 文件已生成，大小: ${excelBuffer.length} bytes`);
        const excelFilePath = (0, excel_1.saveExcelToFile)(excelBuffer, monthName);
        console.log(`Excel 文件路径: ${excelFilePath}`);
        let bitableUrl = '';
        if (config_1.config.bitable.appToken) {
            console.log('上传数据到多维表格...');
            try {
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
            catch (bitableError) {
                console.error('多维表格处理失败，继续生成Excel:', bitableError);
            }
        }
        else {
            console.log('未配置多维表格，跳过多维表格步骤');
        }
        if (config_1.config.recipients.length > 0) {
            console.log('发送通知消息...');
            const recipientNames = config_1.config.recipients;
            const openIds = await (0, user_1.getUserOpenIdsByNames)(recipientNames);
            if (openIds.length > 0) {
                const fileName = `${monthName}报销付款统计报表.xlsx`;
                try {
                    await (0, bot_1.sendFileMessage)(openIds, excelFilePath, fileName);
                    console.log('Excel文件已发送');
                }
                catch (fileError) {
                    console.error('发送文件失败，发送文本消息:', fileError);
                    await (0, bot_1.sendTextMessage)(openIds, `${monthName} 报销付款统计报表已生成\n报销申请: ${reimbursementData.length} 条\n付款申请: ${paymentData.length} 条`);
                }
                if (bitableUrl) {
                    const card = (0, bot_1.buildReportCard)(monthName, reimbursementData.length, paymentData.length, bitableUrl);
                    await (0, bot_1.sendInteractiveMessage)(openIds, card);
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
