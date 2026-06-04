import React, { useState } from "react";
const API =
  `${window.location.protocol}//${window.location.hostname}:8000`;
const demandLayouts = import.meta.glob(
  "../data/demand_layout_*.json",
  { eager: true }
);

const supplyLayouts = import.meta.glob(
  "../data/supply_layout_*.json",
  { eager: true }
);

function getLatestYear() {
  const demandYears =
    Object.keys(demandLayouts).map(
      (path) => {
        const match =
          path.match(
            /demand_layout_(\d+)/
          );

        return match
          ? Number(match[1])
          : 0;
      }
    );

  const supplyYears =
    Object.keys(supplyLayouts).map(
      (path) => {
        const match =
          path.match(
            /supply_layout_(\d+)/
          );

        return match
          ? Number(match[1])
          : 0;
      }
    );

  const latestDemand =
    demandYears.length
      ? Math.max(...demandYears)
      : 0;

  const latestSupply =
    supplyYears.length
      ? Math.max(...supplyYears)
      : 0;

  return Math.min(
    latestDemand,
    latestSupply
  );
}
export default function DataCenter() {
  const [message, setMessage] = useState("");
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  const CURRENT_YEAR =
    getLatestYear();

  const CURRENT_ROC_YEAR =
    new Date().getFullYear() - 1911;

  const MAX_ALLOWED_YEAR =
    CURRENT_ROC_YEAR - 1;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const filename = file.name;

    setSelectedFile(file);
    setUpdateSuccess(false);

    if (!filename.includes("能源平衡表")) {
      setSelectedYear(null);

      setMessage(
        "❌ 請上傳能源平衡表 Excel 檔案"
      );

      return;
    }

    const matches = filename.match(/\d{3}/g);

    if (!matches?.length) {
      setSelectedYear(null);

      setMessage(
        "❌ 無法從檔名判斷年份"
      );

      return;
    }

    const year = Number(
      matches[matches.length - 1]
    );

    if (year <= CURRENT_YEAR) {
      setSelectedYear(null);

      setMessage(
        `⚠️ 系統已存在 ${year} 年資料`
      );

      return;
    }

    if (year > MAX_ALLOWED_YEAR) {
      setSelectedYear(null);

      setMessage(
        `❌ ${year} 年資料尚未公布`
      );

      return;
    }

    setSelectedYear(year);

    setMessage(
      `✅ 偵測到新增年份：${year}`
    );
  };

  const handleUpdate = async () => {
    if (!selectedYear) return;

    try {

      setUpdateSuccess(false);
      setIsUpdating(true);

      const response = await fetch(
        `${API}/generate-layout`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(
          data.error || "更新失敗"
        );
      }

      setUpdateSuccess(true);

      setTimeout(() => {
        window.location.reload();
      }, 1000);
      setMessage(
        `✅ ${selectedYear} 年能源球體更新完成`
      );

    } catch (err) {

      alert(
        `更新失敗：${err.message}`
      );

    } finally {

      setIsUpdating(false);

    }
  };

  return (
    <>
      <style>
        {`
          .dc-spinner {
            width: 50px;
            height: 50px;
            border: 4px solid rgba(148,163,184,.2);
            border-top: 4px solid #f97316;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto;
          }

          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>

      <div style={container}>
        <h1 style={titleStyle}>
          能源資料中心
        </h1>

        {/* 統計卡片 */}
        <div style={statsGrid}>
          <InfoCard
            title="目前資料版本"
            value={CURRENT_YEAR}
          />

        </div>

        {/* 上傳 */}
        <div style={cardStyle}>
          <h2 style={sectionTitle}>
            上傳能源平衡表
          </h2>

          <p style={description}>
            請上傳最新版能源平衡表 Excel 檔案，
            系統將自動驗證年份與檔案格式。
          </p>

          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
          />

          {selectedFile && (
            <div style={fileBox}>
              📄 {selectedFile.name}
            </div>
          )}

          {message && (
            <div style={messageBox}>
              {message}
            </div>
          )}
        </div>

        {/* 系統狀態 */}
        <div style={cardStyle}>
          <h2 style={sectionTitle}>
            系統狀態
          </h2>

          <div style={statusArea}>
            <div>
              📅 目前系統年份：
              {CURRENT_YEAR}
            </div>

            <div>
              📈 可接受最新年份：
              {MAX_ALLOWED_YEAR}
            </div>

            {selectedYear && (
              <div
                style={{
                  color: "#22c55e",
                  fontWeight: 700,
                }}
              >
                ✅ 準備更新：
                {selectedYear} 年
              </div>
            )}
          </div>

          {isUpdating && (
            <div
              style={{
                marginTop: "25px",
                textAlign: "center",
              }}
            >
              <div className="dc-spinner" />

              <div
                style={{
                  marginTop: "15px",
                  color: "#f97316",
                  fontWeight: 600,
                }}
              >
                正在更新能源球體...
              </div>
            </div>
          )}

          {updateSuccess && (
            <div style={successBox}>
              ✅ 能源球體更新完成
            </div>
          )}

          <button
            onClick={handleUpdate}
            disabled={
              !selectedYear || isUpdating
            }
            style={{
              ...buttonStyle,
              opacity:
                !selectedYear || isUpdating
                  ? 0.5
                  : 1,
            }}
          >
            {isUpdating
              ? "更新中..."
              : "更新能源球體"}
          </button>
        </div>
      </div>
    </>
  );
}

function InfoCard({ title, value }) {
  return (
    <div style={infoCard}>
      <div
        style={{
          fontSize: "14px",
          opacity: 0.8,
          marginBottom: "10px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: "32px",
          fontWeight: 700,
          color: "#f97316",
        }}
      >
        {value}
      </div>
    </div>
  );
}

const container = {
  minHeight: "calc(100vh - 220px)",
  padding: "80px 20px",
  maxWidth: "1000px",
  margin: "0 auto",
  color: "var(--text-color)",
};

const titleStyle = {
  fontSize: "36px",
  fontWeight: "700",
  color: "#f97316",
  marginBottom: "30px",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(220px,1fr))",
  gap: "20px",
  marginBottom: "25px",
};

const infoCard = {
  background: "var(--card-bg)",
  borderRadius: "16px",
  padding: "24px",
  textAlign: "center",
  border:
    "1px solid rgba(148,163,184,.15)",
};

const cardStyle = {
  background: "var(--card-bg)",
  borderRadius: "16px",
  padding: "24px",
  marginBottom: "25px",
  border:
    "1px solid rgba(148,163,184,.15)",
};

const sectionTitle = {
  marginBottom: "15px",
};

const description = {
  opacity: 0.8,
  marginBottom: "20px",
};

const fileBox = {
  marginTop: "15px",
  padding: "12px",
  borderRadius: "10px",
  background:
    "rgba(249,115,22,.08)",
};

const messageBox = {
  marginTop: "15px",
  padding: "12px",
  borderRadius: "10px",
  background:
    "rgba(249,115,22,.08)",
  border:
    "1px solid rgba(249,115,22,.2)",
};

const statusArea = {
  lineHeight: "2",
};

const successBox = {
  marginTop: "20px",
  padding: "15px",
  borderRadius: "12px",
  background:
    "rgba(34,197,94,.15)",
  color: "#22c55e",
  fontWeight: 700,
};

const buttonStyle = {
  width: "100%",
  marginTop: "25px",
  background: "#f97316",
  color: "#fff",
  border: "none",
  borderRadius: "12px",
  padding: "14px",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "15px",
};