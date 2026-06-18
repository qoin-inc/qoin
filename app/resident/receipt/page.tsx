'use client';

import React, { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function ReceiptPrintContent() {
  const searchParams = useSearchParams();

  const amount = searchParams.get('amount') || '0';
  const name = searchParams.get('name') || '';
  const date = searchParams.get('date') || '';
  const town = searchParams.get('town') || '';
  const txId = searchParams.get('txId') || '';
  const method = searchParams.get('method') || '';

  useEffect(() => {
    // 画面ロード時に自動的に印刷ダイアログを起動
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="outer-receipt-wrapper bg-white min-h-screen p-4 md:p-8 flex items-center justify-center">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&display=swap');
        body {
          font-family: 'Noto Sans JP', sans-serif;
          background-color: #fff;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .receipt-container {
          border: 3px double #4b5563;
          padding: 20px 24px;
          width: 100%;
          max-width: 550px;
          background: #fff;
          position: relative;
          box-sizing: border-box;
        }
        .receipt-header {
          text-align: center;
          margin-bottom: 12px;
        }
        .receipt-header h1 {
          font-size: 22px;
          font-weight: 900;
          margin: 0 0 4px 0;
          letter-spacing: 0.5em;
          text-indent: 0.5em;
          color: #111827;
        }
        .receipt-line {
          width: 80px;
          height: 2px;
          background-color: #4b5563;
          margin: 0 auto;
        }
        .receipt-date {
          text-align: right;
          font-size: 11px;
          color: #6b7280;
          margin-bottom: 10px;
        }
        .receipt-target {
          font-size: 15px;
          font-weight: 700;
          border-bottom: 2px solid #374151;
          padding-bottom: 4px;
          margin-bottom: 10px;
          width: 70%;
        }
        .receipt-amount {
          text-align: center;
          font-size: 18px;
          font-weight: 900;
          background-color: #f9fafb;
          border: 1px solid #e5e7eb;
          padding: 10px;
          margin: 12px 0;
          border-radius: 8px;
          letter-spacing: 1px;
        }
        .receipt-details {
          margin-bottom: 15px;
          font-size: 12px;
        }
        .receipt-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 6px;
          border-bottom: 1px dashed #e5e7eb;
          padding-bottom: 3px;
        }
        .receipt-label {
          color: #6b7280;
          font-weight: bold;
        }
        .receipt-value {
          font-weight: bold;
          color: #1f2937;
        }
        .receipt-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: 15px;
          border-top: 1px solid #e5e7eb;
          padding-top: 10px;
        }
        .receipt-issuer {
          font-size: 12px;
          font-weight: 700;
        }
        .receipt-issuer p {
          margin: 2px 0;
        }
        .receipt-stamp {
          border: 2px solid #ef4444;
          color: #ef4444;
          width: 55px;
          height: 55px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: bold;
          transform: rotate(-10deg);
          opacity: 0.85;
          user-select: none;
          text-align: center;
          line-height: 1.2;
        }
        @media print {
          @page {
            margin: 0; /* マージンを完全にゼロにする */
          }
          html, body {
            height: auto !important;
            min-height: initial !important;
            overflow: visible !important;
            background: none !important;
          }
          .outer-receipt-wrapper {
            min-height: initial !important;
            height: auto !important;
            display: block !important;
            padding: 20px !important; /* 周囲に適度なマージンを印刷時に直接持たせる */
            margin: 0 !important;
            background: none !important;
          }
          .receipt-container {
            border: 3px double #000;
            max-width: 100% !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="receipt-container">
        <div className="receipt-date">発行日: {date}</div>
        <div className="receipt-header">
          <h1>領収書</h1>
          <div className="receipt-line"></div>
        </div>
        
        <div className="receipt-target">
          {name} 様
        </div>
        
        <p style={{ fontSize: '12px', fontWeight: 'bold', margin: 0 }}>金額として、下記のとおり領収いたしました。</p>
        
        <div className="receipt-amount">
          領収金額： ¥{parseInt(amount).toLocaleString()}-
        </div>
        
        <div className="receipt-details">
          <div className="receipt-row">
            <span className="receipt-label">但し書き</span>
            <span className="receipt-value">会費として</span>
          </div>
          <div className="receipt-row">
            <span className="receipt-label">お支払方法</span>
            <span className="receipt-value">{method}</span>
          </div>
          <div className="receipt-row">
            <span className="receipt-label">領収日</span>
            <span className="receipt-value">{date}</span>
          </div>
          <div className="receipt-row" style={{ borderBottom: 'none' }}>
            <span className="receipt-label">決済番号</span>
            <span className="receipt-value" style={{ fontFamily: 'monospace' }}>{txId}</span>
          </div>
        </div>
        
        <div className="receipt-footer">
          <div className="receipt-issuer">
            <p style={{ fontSize: '10px', color: '#6b7280', marginBottom: '3px' }}>領収者</p>
            <p style={{ fontSize: '14px', fontWeight: '900', color: '#111827' }}>{town}</p>
            <p style={{ fontSize: '8px', color: '#6b7280', fontWeight: 'normal' }}>el-town オンライン集金受領</p>
          </div>
          <div className="receipt-stamp">
            {town.slice(0, 3)}<br />領収済
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReceiptPrintPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">読み込み中...</div>}>
      <ReceiptPrintContent />
    </Suspense>
  );
}
