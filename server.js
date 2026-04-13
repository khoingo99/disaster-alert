const express = require("express");
const cors = require("cors");
const axios = require("axios");
const moment = require("moment");
const path = require("path");

const app = express();
app.use(cors());

let globalCache = { data: [], lastUpdate: null };

async function fetchSevenDaysData() {
    const serviceKey = "DOA1R6BS9785HK11";
    let rawData = [];
    
    for (let i = 0; i < 7; i++) {
        const dateStr = moment().subtract(i, 'days').format('YYYYMMDD');
        const url = `https://www.safetydata.go.kr/V2/api/DSSP-IF-00247?serviceKey=${serviceKey}&crtDt=${dateStr}&pageNo=1&numOfRows=1000`;
        try {
            const resp = await axios.get(url, { timeout: 5000 });
            if (resp.data?.body) rawData = rawData.concat(resp.data.body);
        } catch (e) { console.log(`Error at ${dateStr}`); }
    }

    const uniqueMap = new Map();
    rawData.forEach(item => {
        if (!uniqueMap.has(item.SN)) uniqueMap.set(item.SN, item);
    });

    let filtered = Array.from(uniqueMap.values())
        .filter(item => item.DST_SE_NM !== "기타")
        .sort((a, b) => new Date(b.CRT_DT.replace(/\//g, '-')).getTime() - new Date(a.CRT_DT.replace(/\//g, '-')).getTime());

    globalCache = { data: filtered, lastUpdate: Date.now() };
    return filtered;
}

app.get("/api/safety", async (req, res) => {
    try {
        const oneHour = 60 * 60 * 1000;
        let data = globalCache.data;
        if (data.length === 0 || (Date.now() - globalCache.lastUpdate > oneHour)) {
            data = await fetchSevenDaysData();
        }
        const page = parseInt(req.query.page) || 1;
        const pageSize = 10;
        res.json({
            items: data.slice((page - 1) * pageSize, page * pageSize),
            totalCount: data.length,
            currentPage: page,
            lastPage: Math.ceil(data.length / pageSize)
        });
    } catch (err) {
        res.status(500).json({ error: "서버 오류가 발생했습니다." });
    }
});

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.listen(3000, () => console.log(`🚀 http://localhost:3000`));