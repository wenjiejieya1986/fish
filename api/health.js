"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const config_1 = require("../src/config");
async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    const configured = (0, config_1.isConfigured)();
    return res.status(configured ? 200 : 503).json({
        status: configured ? 'ok' : 'not_configured',
        timestamp: new Date().toISOString(),
    });
}
