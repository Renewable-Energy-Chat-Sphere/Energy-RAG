import * as THREE from "three";

/* ================= 工具 ================= */

function normalize(arr) {
  const sum = arr.reduce((a, b) => a + b, 0);
  return arr.map(v => v / sum);
}

function splitByPhi(bounds, ratios) {
  const { phiStart, phiLength, thetaStart, thetaLength } = bounds;

  let currentPhi = phiStart;
  const patches = [];

  ratios.forEach(r => {
    const len = r * phiLength;

    patches.push({
      phiStart: currentPhi,
      phiLength: len,
      thetaStart,
      thetaLength
    });

    currentPhi += len;
  });

  return patches;
}

function splitByTheta(bounds, ratios) {
  const { phiStart, phiLength, thetaStart, thetaLength } = bounds;

  const thetaEnd = thetaStart + thetaLength;
  const totalAreaFactor =
    Math.cos(thetaStart) - Math.cos(thetaEnd);

  let currentTheta = thetaStart;
  const patches = [];

  ratios.forEach(r => {
    const area = r * totalAreaFactor;
    const nextTheta =
      Math.acos(Math.cos(currentTheta) - area);

    patches.push({
      phiStart,
      phiLength,
      thetaStart: currentTheta,
      thetaLength: nextTheta - currentTheta
    });

    currentTheta = nextTheta;
  });

  return patches;
}

/* ================= 風格 B 核心 ================= */

export function autoSubdividePatch(bounds, rawRatios) {
  if (!rawRatios || rawRatios.length === 0) return [];

  const ratios = normalize(rawRatios);
  const n = ratios.length;

  // 1 個就不切
  if (n === 1) return [bounds];

  // 2 個用單向切
  if (n === 2) {
    return splitByPhi(bounds, ratios);
  }

  // >=3 個 → 風格 B：雙向分帶

  // 依比例排序（大到小）
  const sorted = [...ratios].sort((a, b) => b - a);

  // 分成上下兩群（累積到 50% 為上帶）
  let acc = 0;
  let splitIndex = 0;

  for (let i = 0; i < sorted.length; i++) {
    acc += sorted[i];
    if (acc >= 0.5) {
      splitIndex = i + 1;
      break;
    }
  }

  const topGroup = sorted.slice(0, splitIndex);
  const bottomGroup = sorted.slice(splitIndex);

  const topSum = topGroup.reduce((a, b) => a + b, 0);

  const { thetaStart, thetaLength } = bounds;
  const thetaEnd = thetaStart + thetaLength;

  const totalAreaFactor =
    Math.cos(thetaStart) - Math.cos(thetaEnd);

  // 等面積計算上下分界
  const thetaSplit =
    Math.acos(Math.cos(thetaStart) - topSum * totalAreaFactor);

  const topBounds = {
    phiStart: bounds.phiStart,
    phiLength: bounds.phiLength,
    thetaStart: thetaStart,
    thetaLength: thetaSplit - thetaStart
  };

  const bottomBounds = {
    phiStart: bounds.phiStart,
    phiLength: bounds.phiLength,
    thetaStart: thetaSplit,
    thetaLength: thetaEnd - thetaSplit
  };

  return [
    ...splitByPhi(topBounds, normalize(topGroup)),
    ...splitByPhi(bottomBounds, normalize(bottomGroup))
  ];
}