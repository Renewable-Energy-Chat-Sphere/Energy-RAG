export default function Footer() {
  return (
    <footer>
      <div className="footer-grid">

        <div className="footer-col">
          <h3>EnerSphere TW</h3>
          <p>多模態視覺能源球系統，提供能源資料查詢、
            三維視覺化與智慧代理決策輔助。</p>
        </div>

        <div className="footer-col">
          <h4>快速連結</h4>
          <p><a href="/#features">系統特色</a></p>
          <p><a href="/global">能源視覺化</a></p>
          <p><a href="/rag">智慧查詢</a></p>
        </div>

        <div className="footer-col">
          <h4>聯絡資訊</h4>
          <p>E-mail：support@enersphere.tw</p>
          <p>地址：新北市新莊區中正路 510 號 天主教輔仁大學</p>
        </div>

      </div>

      <div className="footer-copy">
        © 2025 EnerSphere TW. All rights reserved.
      </div>
    </footer>
  );
}
