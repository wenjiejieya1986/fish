import { sendTextMessage, sendInteractiveMessage } from '../feishu/bot';
import { getUserOpenIdsByNames } from '../feishu/user';

export async function sendSuccessNotification(
  recipientNames: string[],
  monthName: string,
  reimbursementCount: number,
  paymentCount: number,
  bitableUrl?: string
): Promise<void> {
  if (recipientNames.length === 0) {
    console.log('没有配置接收者，跳过通知');
    return;
  }

  const openIds = await getUserOpenIdsByNames(recipientNames);
  if (openIds.length === 0) {
    console.log('未找到接收者的 OpenID，跳过通知');
    return;
  }

  if (bitableUrl) {
    const card = {
      config: { wide_screen_mode: true },
      elements: [
        {
          tag: 'markdown',
          content: `## ✅ ${monthName} 报销付款统计报表已生成\n\n请查收本月统计数据：\n\n- **报销申请**: ${reimbursementCount} 条\n- **付款申请**: ${paymentCount} 条`,
        },
        {
          tag: 'action',
          actions: [
            {
              tag: 'open_link',
              text: { tag: 'lark_md', content: '📊 查看报表' },
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
    await sendInteractiveMessage(openIds, card);
  } else {
    await sendTextMessage(
      openIds,
      `${monthName} 报销付款统计报表已生成\n\n报销申请: ${reimbursementCount} 条\n付款申请: ${paymentCount} 条`
    );
  }
}

export async function sendErrorNotification(
  recipientNames: string[],
  monthName: string,
  errorMessage: string
): Promise<void> {
  if (recipientNames.length === 0) {
    return;
  }

  const openIds = await getUserOpenIdsByNames(recipientNames);
  if (openIds.length === 0) {
    return;
  }

  const card = {
    config: { wide_screen_mode: true },
    elements: [
      {
        tag: 'markdown',
        content: `## ❌ ${monthName} 报表生成失败\n\n错误信息: ${errorMessage}`,
      },
      {
        tag: 'note',
        elements: [
          {
            tag: 'plain_text',
            content: '请检查系统日志或联系管理员。',
          },
        ],
      },
    ],
  };

  await sendInteractiveMessage(openIds, card);
}
