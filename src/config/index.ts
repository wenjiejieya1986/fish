const FEISHU_APP_ID = process.env.FEISHU_APP_ID || '';
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || '';
const FEISHU_APPROVAL_CODE = process.env.FEISHU_APPROVAL_CODE || '';
const FEISHU_APPROVAL_CODE_PAYMENT = process.env.FEISHU_APPROVAL_CODE_PAYMENT || '';
const FEISHU_BITABLE_APP_TOKEN = process.env.FEISHU_BITABLE_APP_TOKEN || '';
const FEISHU_BITABLE_TABLE_ID_REIMBURSEMENT = process.env.FEISHU_BITABLE_TABLE_ID_REIMBURSEMENT || '';
const FEISHU_BITABLE_TABLE_ID_PAYMENT = process.env.FEISHU_BITABLE_TABLE_ID_PAYMENT || '';
const REPORT_RECIPIENTS = (process.env.REPORT_RECIPIENTS || '').split(',').filter(Boolean);

export const config = {
  feishu: {
    appId: FEISHU_APP_ID,
    appSecret: FEISHU_APP_SECRET,
    approvalCode: FEISHU_APPROVAL_CODE,
    approvalCodePayment: FEISHU_APPROVAL_CODE_PAYMENT,
  },
  bitable: {
    appToken: FEISHU_BITABLE_APP_TOKEN,
    tableIdReimbursement: FEISHU_BITABLE_TABLE_ID_REIMBURSEMENT,
    tableIdPayment: FEISHU_BITABLE_TABLE_ID_PAYMENT,
  },
  recipients: REPORT_RECIPIENTS,
};

export const isConfigured = () => {
  return !!(
    config.feishu.appId &&
    config.feishu.appSecret &&
    config.feishu.approvalCode &&
    config.feishu.approvalCodePayment
  );
};
