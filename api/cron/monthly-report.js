"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const report_1 = require("../../src/services/report");
async function handler(req, res) {
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    console.log('收到定时任务触发请求');
    try {
        const result = await (0, report_1.processMonthlyReport)();
        if (result.success) {
            console.log(`报表生成成功: ${result.monthName}`);
            console.log(`报销申请: ${result.reimbursementCount} 条`);
            console.log(`付款申请: ${result.paymentCount} 条`);
            return res.status(200).json({
                success: true,
                message: '报表生成成功',
                data: result,
            });
        }
        else {
            console.error(`报表生成失败: ${result.error}`);
            return res.status(500).json({
                success: false,
                message: '报表生成失败',
                error: result.error,
            });
        }
    }
    catch (error) {
        console.error('定时任务执行失败:', error);
        return res.status(500).json({
            success: false,
            message: '定时任务执行失败',
            error: error.message || '未知错误',
        });
    }
}
