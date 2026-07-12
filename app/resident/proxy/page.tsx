'use client';

import React, { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

function ProxyPrintContent() {
  const searchParams = useSearchParams();

  const title = searchParams?.get('title') || '';
  const date = searchParams?.get('date') || '';
  const signer = searchParams?.get('signer') || '';
  const agent = searchParams?.get('agent') || '';
  const text = searchParams?.get('text') || '';

  const formatToJapaneseDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;

    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return dateStr;

    if (year >= 2019) {
      const eraYear = year - 2018;
      return `令和${eraYear === 1 ? '元' : eraYear}年${month}月${day}日`;
    }

    const eraYear = year - 1988;
    return `平成${eraYear === 1 ? '元' : eraYear}年${month}月${day}日`;
  };

  const formattedDate = formatToJapaneseDate(date);
  const proxyText = text || `私は、${title || '総会'}に出席できませんので、同総会における議決権を代理人に委任します。`;
  const proxyLines = proxyText.split('\n').map((line) => {
    const marker = line.match(/^\[(left|center|right)\]\s*/);
    return {
      alignment: marker?.[1] || 'left',
      text: marker ? line.slice(marker[0].length) : line,
    };
  }).filter((line) => line.text.trim() !== '委任状');

  useEffect(() => {
    const timer = window.setTimeout(() => window.print(), 500);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="outer-proxy-wrapper bg-white min-h-screen p-8 md:p-16 flex items-center justify-center">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&display=swap');
        body { font-family: 'Noto Sans JP', sans-serif; background-color: #fff; color: #333; margin: 0; padding: 0; }
        .proxy-container { padding: 60px 50px; width: 100%; max-width: 700px; min-height: 800px; background: #fff; box-sizing: border-box; display: flex; flex-direction: column; }
        .proxy-heading { margin: 0 0 34px; text-align: center; font-size: 28px; line-height: 1.4; font-weight: 900; letter-spacing: 0.12em; }
        .proxy-body-text { font-size: 17px; line-height: 2; margin-bottom: 80px; white-space: pre-wrap; font-weight: bold; }
        .proxy-body-line { min-height: 2em; white-space: pre-wrap; }
        .proxy-signatures { margin-top: auto; }
        .proxy-sig-row { font-size: 18px; margin-bottom: 24px; display: flex; align-items: flex-end; }
        .proxy-sig-row:last-child { margin-bottom: 0; }
        .proxy-sig-date { font-weight: bold; }
        .proxy-sig-label { width: 100px; font-weight: bold; }
        .proxy-sig-value { font-size: 22px; font-weight: 900; border-bottom: 1.5px solid #000; width: 300px; padding-bottom: 4px; text-align: left; }
        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body { height: auto !important; min-height: initial !important; overflow: visible !important; background: none !important; }
          .outer-proxy-wrapper { min-height: initial !important; height: auto !important; display: block !important; padding: 60px !important; margin: 0 !important; background: none !important; }
          .proxy-container { max-width: 100% !important; box-shadow: none !important; page-break-inside: avoid !important; min-height: initial !important; padding: 0 !important; }
        }
      `}</style>

      <div className="proxy-container">
        <h1 className="proxy-heading">委任状</h1>
        <div className="proxy-body-text">
          {proxyLines.map((line, index) => (
            <div key={index} className="proxy-body-line" style={{ textAlign: line.alignment as 'left' | 'center' | 'right' }}>{line.text || '\u00a0'}</div>
          ))}
        </div>

        <div className="proxy-signatures">
          <div className="proxy-sig-row">
            <span className="proxy-sig-date">{formattedDate}</span>
          </div>
          <div className="proxy-sig-row">
            <span className="proxy-sig-label">本人</span>
            <span className="proxy-sig-value">{signer}</span>
          </div>
          {agent && (
            <div className="proxy-sig-row">
              <span className="proxy-sig-label">代理人</span>
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
