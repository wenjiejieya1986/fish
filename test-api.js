require('dotenv').config();
const axios = require('axios');

async function test() {
  const tokenRes = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    app_id: process.env.FEISHU_APP_ID,
    app_secret: process.env.FEISHU_APP_SECRET,
  });
  const token = tokenRes.data.tenant_access_token;
  console.log('Token获取成功');

  // 测试不同的参数组合
  const testCases = [
    { user_id: '', approval_code: 'DFEA4A12-5DB3-4FC9-BBB9-97824C3068FB', offset: 0, limit: 100, sort_asc: false, start_time: 1769875200, end_time: 1772294399 },
    { user_id_type: 'open_id', approval_code: 'DFEA4A12-5DB3-4FC9-BBB9-97824C3068FB', offset: 0, limit: 100, sort_asc: false, start_time: 1769875200, end_time: 1772294399 },
  ];

  for (let i = 0; i < testCases.length; i++) {
    console.log(`\n测试 ${i + 1}:`, JSON.stringify(testCases[i]));
    try {
      const res = await axios.post('https://open.feishu.cn/open-apis/approval/v4/instances/search', testCases[i], {
        headers: { Authorization: 'Bearer ' + token }
      });
      console.log('成功:', JSON.stringify(res.data, null, 2));
    } catch (e) {
      const data = e.response?.data;
      console.log('失败 - code:', data?.code, 'msg:', data?.msg);
      if (data?.error) console.log('error:', JSON.stringify(data.error, null, 2));
    }
  }
}

test();
