import React, { useState } from "react";
import { useTranslation } from "react-i18next";

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

function getYears(layouts, regex) {
  return Object.keys(layouts).map(
    (p) => Number(p.match(regex)?.[1] || 0)
  );
}

function getLatestYear() {
  return Math.min(
    Math.max(...getYears(
      demandLayouts,
      /demand_layout_(\d+)/
    )),
    
    Math.max(...getYears(
      supplyLayouts,
      /supply_layout_(\d+)/
    ))
  );
}

export default function DataCenter() {
  const [message, setMessage] = useState("");
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const { t } = useTranslation();

  const CURRENT_YEAR =
    getLatestYear();

  const MAX_ALLOWED_YEAR =
    new Date().getFullYear() - 1912;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const filename = file.name;

    setSelectedFile(file);
    setUpdateSuccess(false);

    if (!filename.includes("能源平衡表")) {
      setSelectedYear(null);

      setMessage(
        t("dataCenter.invalidFile")
      );

      return;
    }

    const matches = filename.match(/\d{3}/g);

    if (!matches?.length) {
      setSelectedYear(null);

      setMessage(
        t("dataCenter.invalidYear")
      );

      return;
    }

    const year = Number(
      matches[matches.length - 1]
    );

    if (year <= CURRENT_YEAR) {
      setSelectedYear(null);

      setMessage(
        t("dataCenter.yearExists", {
          year
        })
      );

      return;
    }

    if (year > MAX_ALLOWED_YEAR) {
      setSelectedYear(null);

      setMessage(
        t("dataCenter.yearNotReleased", {
          year
        })
      );

      return;
    }

    setSelectedYear(year);

    setMessage(
      t("dataCenter.yearDetected", {
        year
      })
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
          data.error ||
          t("dataCenter.updateFailed")
        );
      }

      setUpdateSuccess(true);

      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
      setMessage(
        t("dataCenter.updateFinished", {
          year: selectedYear
        })
      );

    } catch (err) {

      alert(
        t("dataCenter.updateFailedWithReason", {
          reason: err.message
        })
      );

    } finally {

      setIsUpdating(false);

    }
  };

  return (
    <>
      <style>
        {`
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

        <div style={statsGrid}>
          <InfoCard
            title={t("dataCenter.currentVersion")}
            value={CURRENT_YEAR}
          />

        </div>

        {/* 上傳 */}
        <div style={cardStyle}>
          <h2 style={titleRow}>
            <i
              className="fi fi-rr-upload"
              style={{
                color: "#f97316",
                fontSize: "20px",
              }}
            ></i>
            {t("dataCenter.uploadTitle")}
          </h2>

          <p style={description}>
            {t("dataCenter.uploadDesc")}
          </p>

          <label
            htmlFor="excel-upload"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "180px",
              border: "2px dashed rgba(249, 115, 22, 0.4)",
              borderRadius: "24px",
              background: "rgba(249, 115, 22, 0.04)",
              cursor: "pointer",
            }}
          >
            <i
              className="fi fi-rr-cloud-upload"
              style={{
                fontSize: "48px",
                color: "#f97316",
                marginBottom: "16px",
              }}
            />

            <div
              style={{
                fontSize: "18px",
                fontWeight: 700,
              }}
            >
              {t("dataCenter.chooseFile")}
            </div>

            <div
              style={{
                marginTop: "8px",
                opacity: 0.7,
                fontSize: "14px",
              }}
            >
              XLSX / XLS
            </div>
          </label>

          <input
            id="excel-upload"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            style={{
              display: "none",
            }}
          />

          {selectedFile && (
            <div
              style={{
                ...fileBox,
                gap: "10px",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <i
                  className="fi fi-rr-file-excel"
                  style={{
                    color: "#22c55e",
                    fontSize: "18px",
                  }}
                />
                {selectedFile.name}
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setSelectedYear(null);
                  setMessage("");

                  const input =
                    document.getElementById(
                      "excel-upload"
                    );

                  if (input) {
                    input.value = "";
                  }
                }}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#ef4444",
                  cursor: "pointer",
                  fontSize: "20px",
                  padding: "0 6px",
                }}
              >
                ✕
              </button>
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
          <h2 style={titleRow}>
            <i
              className="fi fi-rr-settings"
              style={{
                color: "#f97316",
                fontSize: "20px",
              }}
            ></i>
            {t("dataCenter.systemStatus")}
          </h2>

          <div style={statusArea}>
            <div style={rowStyle}>
              <i
                className="fi fi-rr-calendar"
                style={{
                  color: "#3b82f6",
                  fontSize: "18px",
                  marginRight: "10px",
                }}
              ></i>
              {t("dataCenter.currentYear")}：
              <strong
                style={{
                  marginLeft: "6px",
                }}
              >
                {CURRENT_YEAR}
              </strong>
            </div>

            <div style={rowStyle}>
              <i
                className="fi fi-rr-chart-line-up"
                style={{
                  color: "#f59e0b",
                  fontSize: "18px",
                  marginRight: "10px",
                }}
              ></i>
              {t("dataCenter.maxYear")}：
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
                {t("dataCenter.readyUpdate")}：
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
                  {t("dataCenter.updating")}
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
              {t("dataCenter.updateSuccess")}
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
              ? t("dataCenter.updatingButton")
              : t("dataCenter.updateButton")}
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

const titleRow = {
  ...sectionTitle,
  display: "flex",
  alignItems: "center",
  gap: "10px",
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

const rowStyle = {
  display: "flex",
  alignItems: "center",
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
