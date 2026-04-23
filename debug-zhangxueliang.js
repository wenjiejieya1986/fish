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

  const approvalCode = process.env.FEISHU_APPROVAL_CODE;
  
  const startTime = new Date('2026-03-01T00:00:00+08:00').getTime();
  const endTime = new Date('2026-04-05T23:59:59+08:00').getTime();
  
  const DAYS_30 = 30 * 24 * 60 * 60 * 1000;
  let allInstances = [];
  let currentStartTime = startTime;
  
  while (currentStartTime < endTime) {
    let currentEndTime = Math.min(currentStartTime + DAYS_30, endTime);
    console.log(`查询: ${new Date(currentStartTime).toLocaleDateString('zh-CN')} - ${new Date(currentEndTime).toLocaleDateString('zh-CN')}`);
    
    const res = await axios.post('https://open.feishu.cn/open-apis/approval/v4/instances/query', {
      approval_code: approvalCode,
      instance_status: 'APPROVED',
      instance_start_time_from: currentStartTime.toString(),
      instance_start_time_to: currentEndTime.toString(),
      page_size: 50,
    }, { headers });
    
    if (res.data.code === 0) {
      const instanceList = res.data.data?.instance_list || [];
      console.log(`  找到 ${instanceList.length} 条`);
      allInstances = allInstances.concat(instanceList);
    }
    
    currentStartTime = currentEndTime;
  }
  
  console.log(`\n共找到 ${allInstances.length} 条已通过的审批实例\n`);
  
  for (const item of allInstances) {
    const instanceCode = item.instance?.code;
    if (!instanceCode) continue;
    
    const detailRes = await axios.get(`https://open.feishu.cn/open-apis/approval/v4/instances/${instanceCode}`, { headers });
    if (detailRes.data.code !== 0) continue;
    
    const detail = detailRes.data.data;
    const form = JSON.parse(detail.form || '[]');
    
    const applicant = form.find(f => f.name === '申请人');
    const applicantName = applicant?.value || '未知';
    
    if (applicantName.includes('张雪亮')) {
      console.log('=== 张雪亮的报销申请 ===');
      console.log('instance_code:', instanceCode);
      console.log('start_time:', new Date(parseInt(detail.start_time)).toLocaleDateString('zh-CN'));
      console.log('\n=== 表单字段 ===');
      
      form.forEach((item, idx) => {
        console.log(`\n${idx + 1}. name="${item.name}", type="${item.type}"`);
        if (item.type === 'fieldList') {
          console.log('   费用明细行数:', item.value?.length || 0);
          item.value?.forEach((row, rowIdx) => {
            console.log(`   --- 明细 ${rowIdx + 1} ---`);
            if (Array.isArray(row)) {
              row.forEach(field => {
                console.log(`     ${field.name}: ${JSON.stringify(field.value)}`);
              });
            }
          });
        } else {
          console.log('   值:', typeof item.value === 'object' ? JSON.stringify(item.value) : item.value);
        }
      });
    }
  }
}

test();
