'use client';

import React, { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function ProxyPrintContent() {
  const searchParams = useSearchParams();

  const title = searchParams?.get('title') || '';
  const date = searchParams?.get('date') || '';
  const signer = searchParams?.get('signer') || '';
  const agent = searchParams?.get('agent') || '';
  const text = searchParams?.get('text') || '';

  // 隘ｿ證ｦ(YYYY-MM-DD)繧貞柱證ｦ(莉､蜥娯留蟷ｴ笳ｯ譛遺留譌･)縺ｫ螟画鋤縺吶ｋ髢｢謨ｰ
  const formatToJapaneseDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        let eraYear = year - 2018;
        let eraName = '莉､蜥・;
        if (year < 2019) {
          eraYear = year - 1988;
          eraName = '蟷ｳ謌・;
        }
        const eraYearStr = eraYear === 1 ? '蜈・ : String(eraYear);
        return `${eraName}${eraYearStr}蟷ｴ${month}譛・{day}譌･`;
      }
    }
    return dateStr;
  };

  const formattedDate = formatToJapaneseDate(date);

  useEffect(() => {
    // 逕ｻ髱｢繝ｭ繝ｼ繝画凾縺ｫ閾ｪ蜍慕噪縺ｫ蜊ｰ蛻ｷ繝繧､繧｢繝ｭ繧ｰ繧定ｵｷ蜍・
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
        {/* 譛ｬ譁・*/}
        <div className="proxy-body-text">
          {text || `遘√・縲・{title}縺ｫ蜃ｺ蟶ｭ縺ｧ縺阪∪縺帙ｓ縺ｮ縺ｧ縲∝酔邱丈ｼ壹↓縺翫￠繧玖ｭｰ豎ｺ讓ｩ繧貞ｧ比ｻｻ縺励∪縺吶Ａ}
        </div>

        {/* 荳矩Κ縺ｮ鄂ｲ蜷肴ｬ・*/}
        <div className="proxy-signatures">
          <div className="proxy-sig-row">
            <span className="proxy-sig-date">{formattedDate}</span>
          </div>
          <div className="proxy-sig-row">
            <span className="proxy-sig-label">(譛ｬ莠ｺ)</span>
            <span className="proxy-sig-value">{signer}</span>
          </div>
          {agent && (
            <div className="proxy-sig-row">
              <span className="proxy-sig-label">(莉｣逅・ｺｺ)</span>
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
    <Suspense fallback={<div className="p-8 text-center text-gray-500">隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ...</div>}>
      <ProxyPrintContent />
    </Suspense>
  );
}

