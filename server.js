const express = require("express");
const cors = require("cors");
const axios = require("axios");
const moment = require("moment");
const path = require("path");

const app = express();
app.use(cors());

// Phục vụ các file tĩnh (CSS, JS, Icon) từ thư mục public
app.use(express.static(path.join(__dirname, "public")));

let globalCache = { data: [], lastUpdate: null };

// --- LOGIC API CHO TIN NHẮN THẢM HỌA ---
async function fetchSevenDaysData() {
    const serviceKey = "DOA1R6BS9785HK11";
    let rawData = [];
    for (let i = 0; i < 7; i++) {
        const dateStr = moment().subtract(i, 'days').format('YYYYMMDD');
        const url = `https://www.safetydata.go.kr/V2/api/DSSP-IF-00247?serviceKey=${serviceKey}&crtDt=${dateStr}&pageNo=1&numOfRows=1000`;
        try {
            const resp = await axios.get(url, { timeout: 5000 });
            if (resp.data?.body) rawData = rawData.concat(resp.data.body);
        } catch (e) { console.log(`Error fetching ${dateStr}`); }
    }
    const uniqueMap = new Map();
    rawData.forEach(item => { if (!uniqueMap.has(item.SN)) uniqueMap.set(item.SN, item); });
    let sorted = Array.from(uniqueMap.values())
        .sort((a, b) => new Date(b.CRT_DT.replace(/\//g, '-')).getTime() - new Date(a.CRT_DT.replace(/\//g, '-')).getTime());
    globalCache = { data: sorted, lastUpdate: Date.now() };
    return sorted;
}

app.get("/api/safety", async (req, res) => {
    const oneHour = 60 * 60 * 1000;
    if (!globalCache.lastUpdate || (Date.now() - globalCache.lastUpdate > oneHour)) {
        await fetchSevenDaysData();
    }
    res.json(globalCache.data);
});

// --- ĐIỀU HƯỚNG TRANG (ROUTES) ---

// 1. Link trang chủ (Landing Page)
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 2. Link trang Tin nhắn thảm họa
app.get("/safety", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "safety.html"));
});

// 3. Link trang Mực nước
app.get("/water", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "water.html"));
});

app.listen(3000, () => console.log(`🚀 Hệ thống chạy tại http://localhost:3000`));