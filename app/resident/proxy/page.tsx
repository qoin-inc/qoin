'use client';

import React, { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function ProxyPrintContent() {
  const searchParams = useSearchParams();

  const title = searchParams.get('title') || '';
  const date = searchParams.get('date') || '';
  const signer = searchParams.get('signer') || '';
  const agent = searchParams.get('agent') || '';
  const text = searchParams.get('text') || '';

  // 西暦(YYYY-MM-DD)を和暦(令和◯年◯月◯日)に変換する関数
  const formatToJapaneseDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        let eraYear = year - 2018;
        let eraName = '令和';
        if (year < 2019) {
          eraYear = year - 1988;
          eraName = '平成';
        }
        const eraYearStr = eraYear === 1 ? '元' : String(eraYear);
        return `${eraName}${eraYearStr}年${month}月${day}日`;
      }
    }
    return dateStr;
  };

  const formattedDate = formatToJapaneseDate(date);

  useEffect(() => {
    // 画面ロード時に自動的に印刷ダイアログを起動
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="outer-proxy-wrapper bg-white min-h-screen p-8 md:p-16 flex items-center justify-center">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&display=swap');
        body {
          font-family: 'Noto Sans JP', sans-serif;
          background-color: #fff;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .proxy-container {
          padding: 60px 50px;
          width: 100%;
          max-width: 700px;
          min-height: 800px;
          background: #fff;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }
        .proxy-top-date {
          text-align: right;
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 60px;
        }
        .proxy-title {
          text-align: center;
          font-size: 32px;
          font-weight: 900;
          margin-bottom: 60px;
          letter-spacing: 0.5em;
          text-indent: 0.5em;
        }
        .proxy-body-text {
          font-size: 17px;
          line-height: 2;
          margin-bottom: 80px;
          white-space: pre-wrap;
          font-weight: bold;
          text-indent: 1em;
        }
        .proxy-signatures {
          margin-top: auto;
          space-y: 24px;
        }
        .proxy-sig-row {
          font-size: 18px;
          margin-bottom: 24px;
          display: flex;
          align-items: flex-end;
        }
        .proxy-sig-row:last-child {
          margin-bottom: 0;
        }
        .proxy-sig-date {
          font-weight: bold;
        }
        .proxy-sig-label {
          width: 100px;
          font-weight: bold;
        }
        .proxy-sig-value {
          font-size: 22px;
          font-weight: 900;
          border-bottom: 1.5px solid #000;
          width: 300px;
          padding-bottom: 4px;
          text-align: left;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          html, body {
            height: auto !important;
            min-height: initial !important;
            overflow: visible !important;
            background: none !important;
          }
          .outer-proxy-wrapper {
            min-height: initial !important;
            height: auto !important;
            display: block !important;
            padding: 60px !important;
            margin: 0 !important;
            background: none !important;
          }
          .proxy-container {
            max-width: 100% !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
            min-height: initial !important;
            padding: 0 !important;
          }
        }
      `}</style>

      <div className="proxy-container">
        {/* 本文 */}
        <div className="proxy-body-text">
          {text || `私は、${title}に出席できませんので、同総会における議決権を委任します。`}
        </div>

        {/* 下部の署名欄 */}
        <div className="proxy-signatures">
          <div className="proxy-sig-row">
            <span className="proxy-sig-date">{formattedDate}</span>
          </div>
          <div className="proxy-sig-row">
            <span className="proxy-sig-label">(本人)</span>
            <span className="proxy-sig-value">{signer}</span>
          </div>
          {agent && (
            <div className="proxy-sig-row">
              <span className="proxy-sig-label">(代理人)</span>
              <span className="proxy-sig-value">{agent}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProxyPrintPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">読み込み中...</div>}>
      <ProxyPrintContent />
    </Suspense>
  );
}
