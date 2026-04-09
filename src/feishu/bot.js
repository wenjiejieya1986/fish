"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessage = sendMessage;
exports.sendTextMessage = sendTextMessage;
exports.sendFileMessage = sendFileMessage;
exports.sendInteractiveMessage = sendInteractiveMessage;
exports.buildReportCard = buildReportCard;
const axios_1 = __importDefault(require("axios"));
const fs = __importStar(require("fs"));
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
async function sendFileMessage(openIds, filePath, fileName) {
    for (const openId of openIds) {
        try {
            const fileBuffer = fs.readFileSync(filePath);
            const formData = new FormData();
            const fileBlob = new Blob([fileBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            formData.append('file', fileBlob, fileName);
            formData.append('file_name', fileName);
            formData.append('file_size', fileBuffer.length.toString());
            formData.append('receive_id', openId);
            formData.append('receive_id_type', 'open_id');
            const response = await axios_1.default.post('https://open.feishu.cn/open-apis/im/v1/files', formData, {
                headers: {
                    Authorization: `Bearer ${process.env.FEISHU_BOT_TOKEN}`,
                    'Content-Type': 'multipart/form-data',
                },
            });
            console.log(`文件已发送给 ${openId}:`, response.data);
        }
        catch (error) {
            console.error(`发送文件给 ${openId} 失败:`, error.response?.data || error.message);
        }
    }
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
