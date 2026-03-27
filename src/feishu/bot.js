"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessage = sendMessage;
exports.sendTextMessage = sendTextMessage;
exports.sendInteractiveMessage = sendInteractiveMessage;
exports.buildReportCard = buildReportCard;
const axios_1 = __importDefault(require("axios"));
async function sendMessage(openIds, msgType, content) {
    for (const openId of openIds) {
        try {
            await axios_1.default.post('https://open.feishu.cn/open-apis/im/v1/messages', {
                receive_id: openId,
                receive_id_type: 'open_id',
                msg_type: msgType,
                content: JSON.stringify(content),
            }, {
                headers: {
                    Authorization: `Bearer ${process.env.FEISHU_BOT_TOKEN}`,
                    'Content-Type': 'application/json',
                },
            });
            console.log(`消息已发送给 ${openId}`);
        }
        catch (error) {
            console.error(`发送消息给 ${openId} 失败:`, error);
            throw error;
        }
    }
}
async function sendTextMessage(openIds, text) {
    await sendMessage(openIds, 'text', { text });
}
async function sendInteractiveMessage(openIds, cardContent) {
    await sendMessage(openIds, 'interactive', cardContent);
}
function buildReportCard(month, reimbursementCount, paymentCount, bitableUrl) {
    return {
        config: {
            wide_screen_mode: true,
        },
        elements: [
            {
                tag: 'markdown',
                content: `## 📊 **${month} 报销付款统计报表**\n\n已生成当月报表，请查收。`,
            },
            {
                tag: 'hr',
            },
            {
                tag: 'div',
                fields: [
                    {
                        is_short: true,
                        text: {
                            tag: 'lark_md',
                            content: `**报销申请**\n${reimbursementCount} 条`,
                        },
                    },
                    {
                        is_short: true,
                        text: {
                            tag: 'lark_md',
                            content: `**付款申请**\n${paymentCount} 条`,
                        },
                    },
                ],
            },
            {
                tag: 'action',
                actions: [
                    {
                        tag: 'open_link',
                        text: {
                            tag: 'lark_md',
                            content: '📎 查看报表',
                        },
                        url: bitableUrl,
                    },
                ],
            },
            {
                tag: 'note',
                elements: [
                    {
                        tag: 'plain_text',
                        content: '该消息由系统自动发送，如有疑问请联系管理员。',
                    },
                ],
            },
        ],
    };
}
