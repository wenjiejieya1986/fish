require('dotenv').config();
const express = require('express');
const { isConfigured, config } = require('./src/config');
const { processMonthlyReport } = require('./src/services/report');

const app = express();
const PORT = 3000;

app.use(express.json());

app.get('/api/health', (req, res) => {
  const configured = isConfigured();
  res.status(configured ? 200 : 503).json({
    status: configured ? 'ok' : 'not_configured',
    timestamp: new Date().toISOString(),
    config: {
      feishuAppId: configured ? '***' + config.feishu.appId.slice(-4) : '',
      approvalCode: configured ? '***' : '',
      approvalCodePayment: configured ? '***' : '',
      recipients: configured ? config.recipients : []
    }
  });
});

app.post('/api/trigger-report', async (req, res) => {
  console.log('收到手动触发报表生成请求');
  try {
    const result = await processMonthlyReport();
    if (result.success) {
      console.log(`报表生成成功: ${result.monthName}`);
      return res.status(200).json({
        success: true,
        message: '报表生成成功',
        data: result
      });
    } else {
      console.error(`报表生成失败: ${result.error}`);
      return res.status(500).json({
        success: false,
        message: '报表生成失败',
        error: result.error
      });
    }
  } catch (error) {
    console.error('手动触发失败:', error);
    return res.status(500).json({
      success: false,
      message: '手动触发失败',
      error: error.message || '未知错误'
    });
  }
});

app.get('/api/trigger-report', async (req, res) => {
  console.log('收到手动触发报表生成请求 (GET)');
  try {
    const result = await processMonthlyReport();
    if (result.success) {
      console.log(`报表生成成功: ${result.monthName}`);
      return res.status(200).json({
        success: true,
        message: '报表生成成功',
        data: result
      });
    } else {
      console.error(`报表生成失败: ${result.error}`);
      return res.status(500).json({
        success: false,
        message: '报表生成失败',
        error: result.error
      });
    }
  } catch (error) {
    console.error('手动触发失败:', error);
    return res.status(500).json({
      success: false,
      message: '手动触发失败',
      error: error.message || '未知错误'
    });
  }
});

app.get('/', (req, res) => {
  res.send(`
    <h1>飞书报销付款统计服务</h1>
    <ul>
      <li><a href="/api/health">健康检查</a></li>
      <li><a href="/api/trigger-report">手动触发报表生成 (GET)</a></li>
    </ul>
    <h2>手动触发方式：</h2>
    <ol>
      <li>浏览器访问: <a href="/api/trigger-report" target="_blank">/api/trigger-report</a></li>
      <li>或使用curl: <code>curl -X POST http://localhost:3000/api/trigger-report</code></li>
    </ol>
  `);
});

app.listen(PORT, () => {
  console.log(`本地服务已启动: http://localhost:${PORT}`);
  console.log(`健康检查: http://localhost:${PORT}/api/health`);
  console.log(`手动触发报表: http://localhost:${PORT}/api/trigger-report`);
});
