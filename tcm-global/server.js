import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fs from "fs";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const STATE_FILE = "./selected.json";

// ✅ 接收 AI agent 傳來的請求
app.post("/api/select", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "缺少 name 參數" });

  fs.writeFileSync(STATE_FILE, JSON.stringify({ selection: name }, null, 2));
  console.log("✅ 收到 AI 指令：選擇", name);
  res.json({ success: true });
});

// 提供 selected.json 給 React 前端讀取
app.get("/selected.json", (req, res) => {
  if (!fs.existsSync(STATE_FILE)) {
    return res.json({ selection: null });
  }
  res.sendFile(process.cwd() + "/selected.json");
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🧠 控制伺服器啟動於 http://localhost:${PORT}`);
});
