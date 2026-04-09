require('dotenv').config();
const axios = require('axios');

async function test() {
  const tokenRes = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    app_id: process.env.FEISHU_APP_ID,
    app_secret: process.env.FEISHU_APP_SECRET,
  });
  const token = tokenRes.data.tenant_access_token;
  const headers = { 
    Authorization: 'Bearer ' + token,
    'Content-Type': 'application/json; charset=utf-8'
  };

  const instanceCode = '36DBA694-22AE-4573-9147-AE5D17F883AA';
  
  console.log(`\n=== 获取审批实例详情 ===`);
  const res = await axios.get(`https://open.feishu.cn/open-apis/approval/v4/instances/${instanceCode}`, { headers });
  
  if (res.data.code === 0) {
    const data = res.data.data;
    
    console.log('\n=== 基本信息 ===');
    console.log('instance_code:', data.instance_code);
    console.log('status:', data.status);
    console.log('start_time:', new Date(parseInt(data.start_time)).toISOString());
    console.log('user_id:', data.user_id);
    console.log('open_id:', data.open_id);
    
    console.log('\n=== 表单字段 ===');
    const formStr = data.form;
    const form = JSON.parse(formStr);
    
    form.forEach((item, index) => {
      console.log(`\n${index + 1}. 字段名: "${item.field_name}"`);
      console.log(`   类型: ${item.type}`);
      console.log(`   ID: ${item.id}`);
      console.log(`   值:`, typeof item.value === 'object' ? JSON.stringify(item.value, null, 2) : item.value);
    });
  }
}

test();