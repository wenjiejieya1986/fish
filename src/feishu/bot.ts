import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

export async function sendMessage(
  openIds: string[],
  msgType: string,
  content: any
): Promise<void> {
  for (const openId of openIds) {
    try {
      await axios.post(
        'https://open.feishu.cn/open-apis/im/v1/messages',
        {
          receive_id: openId,
          receive_id_type: 'open_id',
          msg_type: msgType,
          content: JSON.stringify(content),
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.FEISHU_BOT_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log(`消息已发送给 ${openId}`);
    } catch (error) {
      console.error(`发送消息给 ${openId} 失败:`, error);
      throw error;
    }
  }
}

export async function sendTextMessage(openIds: string[], text: string): Promise<void> {
  await sendMessage(openIds, 'text', { text });
}

export async function sendFileMessage(openIds: string[], filePath: string, fileName: string): Promise<void> {
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

      const response = await axios.post(
        'https://open.feishu.cn/open-apis/im/v1/files',
        formData,
        {
          headers: {
            Authorization: `Bearer ${process.env.FEISHU_BOT_TOKEN}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      console.log(`文件已发送给 ${openId}:`, response.data);
    } catch (error: any) {
      console.error(`发送文件给 ${openId} 失败:`, error.response?.data || error.message);
    }
  }
}

export async function sendInteractiveMessage(
  openIds: string[],
  cardContent: any
): Promise<void> {
  await sendMessage(openIds, 'interactive', cardContent);
}

export function buildReportCard(
  month: string,
  reimbursementCount: number,
  paymentCount: number,
  bitableUrl: string
): any {
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
