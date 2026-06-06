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
          input[type="file"] {
            width: 100%;
            padding: 12px;
            border-radius: 12px;
            border: 1px solid rgba(148,163,184,.2);
            background: rgba(255,255,255,.03);
            color: inherit;
            margin-top: 10px;
          }

          .spinner-icon {
            animation: spin 1s linear infinite;
            display: inline-block;
          }

          button:hover:not(:disabled) {
            transform: translateY(-2px);
          }
          
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

        {/* 統計卡片 */}
        <div style={statsGrid}>
          <InfoCard
            title="目前資料版本"
            value={CURRENT_YEAR}
          />

        </div>

        {/* 上傳 */}
        <div style={cardStyle}>
          <h2
            style={{
              ...sectionTitle,
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <i
              className="fi fi-rr-upload"
              style={{
                color: "#f97316",
                fontSize: "20px",
              }}
            ></i>
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
            <div
              style={{
                ...fileBox,
                gap: "10px",
              }}
            >
              <i
                className="fi fi-rr-file-excel"
                style={{
                  color: "#22c55e",
                  fontSize: "18px",
                }}
              ></i>

              {selectedFile.name}
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
          <h2
            style={{
              ...sectionTitle,
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <i
              className="fi fi-rr-settings"
              style={{
                color: "#f97316",
                fontSize: "20px",
              }}
            ></i>
            系統狀態
          </h2>

          <div style={statusArea}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
              }}
            >
              <i
                className="fi fi-rr-calendar"
                style={{
                  color: "#3b82f6",
                  fontSize: "18px",
                  marginRight: "10px",
                }}
              ></i>
              目前系統年份：
              <strong
                style={{
                  marginLeft: "6px",
                }}
              >
                {CURRENT_YEAR}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
              }}
            >
              <i
                className="fi fi-rr-chart-line-up"
                style={{
                  color: "#f59e0b",
                  fontSize: "18px",
                  marginRight: "10px",
                }}
              ></i>
              可接受最新年份：
              <strong
                style={{
                  marginLeft: "6px",
                }}
              >
                {MAX_ALLOWED_YEAR}
              </strong>
            </div>

            {selectedYear && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  color: "#22c55e",
                  fontWeight: 700,
                }}
              >
                <i
                  className="fi fi-rr-check"
                  style={{
                    fontSize: "18px",
                    marginRight: "10px",
                  }}
                ></i>
                準備更新：
                <strong
                  style={{
                    marginLeft: "6px",
                  }}
                >
                  {selectedYear} 年
                </strong>
              </div>
            )}
          </div>
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
                <>
                  <i
                    className="fi fi-rr-spinner spinner-icon"
                    style={{
                      marginRight: "8px",
                    }}
                  ></i>
                  正在更新能源球體...
                </>
              </div>
            </div>
          )}

          {updateSuccess && (
            <div
              style={{
                ...successBox,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
              }}
            >
              <i
                className="fi fi-rr-check"
                style={{
                  marginRight: "10px",
                }}
              ></i>
              能源球體更新完成
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
    </>
  );
}

function InfoCard({ title, value }) {
  return (
    <div style={infoCard}>

      <div
        style={{
          fontSize: "16px",
          opacity: 0.8,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: "40px",
          fontWeight: 800,
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
  padding: "60px 30px",
  maxWidth: "1200px",
  margin: "0 auto",
  color: "var(--text-color)",
};

const titleStyle = {
  fontSize: "42px",
  fontWeight: "800",
  color: "#f97316",
  marginBottom: "40px",
  textAlign: "center",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "20px",
  marginBottom: "25px",
};

const infoCard = {
  background: "var(--card-bg)",
  backdropFilter: "blur(12px)",
  borderRadius: "40px",
  padding: "30px",
  textAlign: "center",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  boxShadow:
    "0 10px 30px rgba(0, 0, 0, 0.15)",
  transition: "0.3s",
};

const cardStyle = {
  background: "var(--card-bg)",
  borderRadius: "40px",
  padding: "40px 60px",
  marginBottom: "25px",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  boxShadow:
    "0 10px 30px rgba(0, 0, 0, 0.12)",
};

const sectionTitle = {
  fontSize: "24px",
  fontWeight: "700",
  marginBottom: "20px",
  color: "#f97316",
};

const description = {
  opacity: 0.8,
  marginBottom: "20px",
};

const fileBox = {
  marginTop: "15px",
  padding: "12px 20px",
  borderRadius: "30px",
  background: "rgba(249, 115, 22, 0.08)",
  display: "flex",
  alignItems: "center",
};

const messageBox = {
  marginTop: "15px",
  padding: "15px",
  borderRadius: "20px",
  background:
    "rgba(249,115,22,.08)",
  border:
    "1px solid rgba(249, 115, 22, 0.2)",
  fontWeight: "600",
};

const statusArea = {
  lineHeight: "2.2",
  fontSize: "16px",
  padding: "15px",
  borderRadius: "12px",
  background:
    "rgba(255, 255, 255, 0.03)",
};

const successBox = {
  marginTop: "20px",
  padding: "18px",
  borderRadius: "20px",
  background:
    "rgba(34, 197, 94, 0.15)",
  border:
    "1px solid rgba(34, 197, 94, 0.3)",
  color: "#22c55e",
  fontWeight: "700",
  textAlign: "center",
};

const buttonStyle = {
  width: "100%",
  marginTop: "25px",
  background:
    "linear-gradient(135deg, #f97316, #fb923c)",
  color: "#fff",
  border: "none",
  borderRadius: "30px",
  padding: "16px",
  cursor: "pointer",
  fontWeight: "700",
  fontSize: "16px",
  transition: "0.3s",
  boxShadow:
    "0 8px 20px rgba(249, 115, 22, 0.35)",
};
