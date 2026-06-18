'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function MemberManualPage() {
  const [step, setStep] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const totalSteps = 10;

  useEffect(() => {
    if (isPlaying) {
      const timer = setInterval(() => {
        setStep(s => {
          if (s >= totalSteps) {
            setIsPlaying(false);
            return 1;
          }
          return s + 1;
        });
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [isPlaying]);

  const nextStep = () => {
    setIsPlaying(false);
    setStep(s => Math.min(totalSteps, s + 1));
  };
  
  const prevStep = () => {
    setIsPlaying(false);
    setStep(s => Math.max(1, s - 1));
  };

  const togglePlay = () => setIsPlaying(!isPlaying);

  return (
    <div className="bg-gray-100 min-h-screen font-sans flex flex-col items-center py-6 px-4">
      <div className="w-full max-w-md">
        
        {/* ヘッダーエリア */}
        <div className="text-center mb-4">
          <Link href="/manual" className="text-xs text-gray-400 hover:text-gray-600 transition mb-2 inline-flex items-center">
            <i className="fas fa-chevron-left mr-1"></i>マニュアル一覧に戻る
          </Link>
          <h1 className="text-xl font-black text-gray-800 tracking-tight mt-1">会員向け操作マニュアル</h1>
          <p className="text-gray-500 font-bold text-xs mt-1">入会から日々の利用まで</p>
        </div>

        {/* コントローラー */}
        <div className="bg-white rounded-t-2xl shadow-md p-4 border-b-2 border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-gray-800 flex items-center text-sm">
              <i className="fas fa-mobile-alt text-qoin-main mr-2"></i>操作の流れ
            </h2>
            <div className="text-xs font-bold bg-gray-100 text-gray-500 px-3 py-1 rounded-full">
              ステップ {step} / {totalSteps}
            </div>
          </div>

          {/* ステップドット */}
          <div className="flex items-center justify-center gap-1.5 mb-4">
            {Array.from({ length: totalSteps }, (_, i) => (
              <button
                key={i}
                onClick={() => { setIsPlaying(false); setStep(i + 1); }}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  i + 1 === step 
                    ? 'bg-qoin-main scale-125 shadow-md' 
                    : i + 1 < step 
                      ? 'bg-qoin-main opacity-60' 
                      : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          
          <div className="flex items-center justify-between gap-2">
            <button 
              onClick={prevStep} 
              disabled={step === 1}
              className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center transition ${step === 1 ? 'bg-gray-100 text-gray-400' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              <i className="fas fa-step-backward mr-2"></i>前へ
            </button>
            <button 
              onClick={togglePlay}
              className={`flex-[1.5] py-2 rounded-lg font-black text-sm flex items-center justify-center text-white shadow-sm transition ${isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-qoin-main hover:bg-blue-600'}`}
            >
              <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} mr-2`}></i>
              {isPlaying ? '一時停止' : '自動再生'}
            </button>
            <button 
              onClick={nextStep} 
              disabled={step === totalSteps}
              className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center transition ${step === totalSteps ? 'bg-gray-100 text-gray-400' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              次へ<i className="fas fa-step-forward ml-2"></i>
            </button>
          </div>
        </div>

        {/* 動く模型（モックアップ） */}
        <div className="bg-[#f0f2f5] w-full h-[450px] border-x-4 border-b-4 border-gray-800 rounded-b-[2.5rem] relative overflow-hidden shadow-2xl flex flex-col">
          
          {/* ----- ステップ1：QRコード読み取り ----- */}
          <div className={`absolute inset-0 bg-black flex flex-col items-center justify-center transition-all duration-500 z-40 ${step === 1 ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <div className="absolute top-10 text-white font-bold text-sm">QRコードをスキャン</div>
            <div className="relative w-48 h-48 border-2 border-white/50 rounded-lg overflow-hidden flex items-center justify-center mt-8">
              <div className="absolute top-0 left-0 right-0 h-1 bg-green-400 shadow-[0_0_8px_2px_rgba(74,222,128,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>
              <div className="w-32 h-32 bg-white p-2 rounded relative">
                <div className="w-full h-full border-4 border-black border-dashed opacity-80"></div>
              </div>
            </div>
            <div className="mt-8 text-white/80 text-xs">町内会・自治会のチラシ等から読みとります</div>
          </div>

          {/* ----- ステップ2・8・9：LINEトーク画面（リッチメニュー） ----- */}
          <div className={`absolute inset-0 bg-[#7494C0] flex flex-col transition-all duration-500 z-30 ${step === 2 || step >= 8 ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <div className="bg-[#2C3E50] text-white flex items-center px-4 py-3 shrink-0">
              <i className="fas fa-chevron-left mr-3"></i>
              <div className="font-bold">el-town</div>
            </div>
            <div className="flex-1 p-4 flex flex-col justify-end relative">
              <div className={`bg-white rounded-2xl rounded-tl-none p-3 max-w-[80%] text-sm text-gray-800 shadow-sm mb-4 transition-all duration-300 ${step === 2 ? 'opacity-100' : 'opacity-0 hidden'}`}>
                友だち追加ありがとうございます！<br/>まずは下部のメニューから「会員の方」を選んで登録をお願いします。
              </div>
              
              {/* プッシュ通知 (ステップ9) */}
              <div className={`bg-white rounded-xl p-0 w-[85%] text-sm text-gray-800 shadow-md mb-2 overflow-hidden transition-all duration-500 origin-bottom-left ${step === 9 ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-50 translate-y-4 absolute bottom-4 left-4 pointer-events-none'}`}>
                <div className="bg-qoin-main text-white text-[11px] font-bold px-3 py-1.5 flex justify-between items-center">
                  <span>重要なお知らせ</span>
                  <span className="text-[9px] bg-white text-qoin-main px-1 rounded">NEW</span>
                </div>
                <div className="p-3">
                  <div className="flex gap-1 mb-1.5">
                    <span className="bg-sky-100 text-sky-600 px-1.5 py-0.5 rounded text-[9px] font-bold">電子回覧板</span>
                    <span className="bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded text-[9px] font-bold">イベント</span>
                  </div>
                  <div className="font-bold text-[14px] mb-1">清掃活動のお知らせ</div>
                  <p className="text-[11px] text-gray-500 mb-3">春の清掃活動を行います。重要なご案内が含まれております。</p>
                  <div className="bg-gray-100 text-center text-qoin-main font-bold py-2 rounded-lg text-[11px]">
                    アプリで詳細を見る
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white shrink-0 relative pb-4">
              <div className="text-center py-1 text-xs text-gray-500 border-b">▲ メニューを開く/閉じる</div>
              <div className="grid grid-cols-2 p-2 gap-2 h-32">
                <div className="bg-qoin-main rounded-xl flex flex-col items-center justify-center text-white relative">
                  <i className="fas fa-user-check text-2xl mb-1"></i>
                  <span className="font-bold text-sm">会員の方</span>
                  {step === 2 && (
                    <div className="absolute right-2 bottom-0 text-5xl transform -rotate-12 animate-bounce drop-shadow-xl z-50">👆</div>
                  )}
                </div>
                <div className="bg-[#4F95D3] rounded-xl flex flex-col items-center justify-center text-white opacity-80">
                  <i className="fas fa-user-cog text-2xl mb-1"></i>
                  <span className="font-bold text-sm">役員の方</span>
                </div>
              </div>
            </div>
          </div>

          {/* ----- ステップ3：LINE認証許可画面 ----- */}
          <div className={`absolute inset-0 bg-[#7494C0] flex flex-col transition-all duration-500 z-25 ${step === 3 ? 'opacity-100 translate-x-0' : (step < 3 ? 'opacity-0 translate-x-full' : 'opacity-0 -translate-x-full')}`}>
            <div className="bg-[#2C3E50] text-white flex items-center px-4 py-3 shrink-0">
              <i className="fas fa-chevron-left mr-3"></i>
              <div className="font-bold">el-town</div>
            </div>
            <div className="flex-1 bg-white flex flex-col items-center p-6 relative">
               <div className="w-16 h-16 bg-green-500 rounded-xl mb-4 mt-10 flex items-center justify-center">
                 <i className="fab fa-line text-white text-4xl"></i>
               </div>
               <h2 className="font-bold text-lg text-gray-800 mb-2">認証</h2>
               <p className="text-sm text-gray-600 mb-8 text-center leading-relaxed">el-townがあなたのLINEアカウント情報へのアクセスを求めています。</p>
               
               <div className="w-full space-y-4">
                 <div className="bg-[#06C755] text-white font-bold py-3 rounded-xl text-center shadow-md relative">
                   許可する
                   {step === 3 && (
                      <div className="absolute right-10 -bottom-2 text-5xl transform -rotate-12 animate-bounce drop-shadow-xl z-50">👆</div>
                   )}
                 </div>
                 <div className="bg-gray-200 text-gray-600 font-bold py-3 rounded-xl text-center">
                   キャンセル
                 </div>
               </div>
            </div>
          </div>

          {/* ----- ステップ4・5：LIFFアプリ（登録・完了） ----- */}
          <div className={`absolute inset-0 bg-white flex flex-col transition-all duration-500 z-20 ${step === 4 || step === 5 ? 'opacity-100 translate-x-0' : (step < 4 ? 'opacity-0 translate-x-full' : 'opacity-0 -translate-x-full')}`}>
            <div className="bg-gray-100 border-b flex items-center justify-between px-4 py-2 shrink-0">
              <span className="text-sm font-bold text-gray-700">ご本人登録（照合）</span>
              <i className="fas fa-times text-gray-500"></i>
            </div>
            
            {/* 登録フォーム (ステップ4) */}
            <div className={`flex-1 p-4 overflow-y-auto hide-scrollbar transition-opacity duration-300 ${step === 4 ? 'opacity-100' : 'opacity-0 hidden'}`}>
              <p className="text-xs text-gray-500 font-bold mb-4">町内会・自治会から配布された案内に従って情報を入力してください。</p>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-700">町内会・自治会名 <span className="text-red-500">*</span></label>
                  <div className="w-full bg-gray-50 border rounded p-2 text-sm font-bold text-gray-800">
                    <span className="animate-[typing_1s_steps(4,end)_forwards] overflow-hidden whitespace-nowrap inline-block align-bottom">得留ｹ丘</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700">氏名 <span className="text-red-500">*</span></label>
                  <div className="w-full bg-gray-50 border rounded p-2 text-sm font-bold text-gray-800">
                    <span className="animate-[typing_1.5s_steps(4,end)_forwards] overflow-hidden whitespace-nowrap inline-block align-bottom">得留　太郎</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700">郵便番号 (ハイフンなし7桁) <span className="text-red-500">*</span></label>
                  <div className="w-full bg-gray-50 border rounded p-2 text-sm font-bold text-gray-800">
                    <span className="animate-[typing_2s_steps(7,end)_forwards] overflow-hidden whitespace-nowrap inline-block align-bottom">1234567</span>
                  </div>
                </div>

                <div className="bg-orange-50 border border-orange-200 p-3 rounded-xl mt-2 animate-fadeIn" style={{ animationDelay: '2.5s', animationFillMode: 'both' }}>
                  <label className="text-xs font-bold text-gray-700 block mb-1">住所２（丁目番地）</label>
                  <p className="text-[10px] text-orange-600 font-bold mb-2">※同姓同名・同郵便番号の場合に入力</p>
                  <div className="w-full bg-white border rounded p-2 text-sm font-bold text-gray-800">
                    １丁目２−４０
                  </div>
                </div>

                <div className="pt-2 relative">
                  <div className="w-full bg-qoin-main text-white text-center py-3 rounded-xl font-bold shadow-md">
                    照合して連携する
                  </div>
                  {step === 4 && (
                    <div className="absolute right-6 -bottom-2 text-5xl transform -rotate-12 animate-bounce drop-shadow-xl z-50">👆</div>
                  )}
                </div>
              </div>
            </div>

            {/* 完了画面 (ステップ5) */}
            <div className={`flex-1 flex flex-col items-center justify-center p-5 transition-opacity duration-300 ${step === 5 ? 'opacity-100' : 'opacity-0 hidden'}`}>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <i className="fas fa-check text-3xl text-green-500"></i>
              </div>
              <h2 className="font-black text-xl text-gray-800 mb-2">連携完了！</h2>
              <p className="text-sm text-gray-600 text-center mb-8 font-bold">
                LINEアカウントと名簿の連携が完了しました。
              </p>
              <div className="w-full bg-qoin-main text-white text-center py-3 rounded-xl font-bold shadow-md relative">
                アプリ画面へ進む
                {step === 5 && (
                  <div className="absolute right-10 -bottom-4 text-5xl transform -rotate-12 animate-bounce drop-shadow-xl z-50">👆</div>
                )}
              </div>
            </div>
          </div>

          {/* ----- ステップ6〜9：アプリメイン画面 ----- */}
          <div className={`absolute inset-0 bg-[#f0f2f5] flex flex-col transition-all duration-500 z-10 ${step >= 6 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}`}>
            
            <div className="bg-[#4F95D3] text-white flex items-center justify-between px-4 py-3 shadow-md shrink-0 relative z-20">
              <div className="flex items-center gap-2">
                <div className="relative">
                  {step >= 8 ? (
                    <i className="fas fa-arrow-left text-lg"></i>
                  ) : (
                    <span className="font-black text-sm opacity-80">el-town</span>
                  )}
                  {step === 9 && (
                    <div className="absolute -inset-3 border-4 border-red-500 rounded-full animate-ping pointer-events-none"></div>
                  )}
                </div>
                {step >= 8 && <span className="font-bold text-sm ml-2">一覧に戻る</span>}
              </div>
              <div className="relative">
                <i className="fas fa-times text-lg"></i>
                {step === 9 && (
                   <div className="absolute -inset-2 border-4 border-red-500 rounded-full animate-ping pointer-events-none" style={{ animationDelay: '1.5s' }}></div>
                )}
              </div>
            </div>

            <div className="flex-1 relative overflow-hidden bg-[#7494C0]">
              
              <div className={`absolute inset-0 flex flex-col transition-all duration-500 ${step <= 7 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full pointer-events-none'}`}>
                
                <div className="flex-1 p-4 overflow-y-auto">
                  <div className="text-center font-black text-white mb-4 drop-shadow-sm">得留ｹ丘 電子掲示板</div>
                  
                  <div className="flex justify-between items-center mb-2 px-1 mt-2">
                    <div className="flex items-center">
                      <div className="w-6 h-6 rounded-full bg-qoin-main/10 flex items-center justify-center text-qoin-main mr-2 border border-qoin-main/20">
                        <i className="fas fa-bullhorn text-[10px]"></i>
                      </div>
                      <span className="text-[12px] text-gray-600 font-bold">役員</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-qoin-main text-[10px] font-black mr-2 animate-pulse shadow-sm px-1.5 py-0.5 bg-sky-100 border border-sky-200 rounded">新着</span>
                      <span className="text-[11px] text-gray-800 font-bold">2026/5/6配信</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl p-4 shadow-md border-[2.5px] border-qoin-main/50 relative mb-4">
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      <span className="bg-sky-100 text-sky-600 px-2 py-0.5 rounded text-[10px] font-bold">電子回覧板</span>
                    </div>
                    <h3 className="font-bold text-[15px] mb-1.5 leading-snug text-gray-800">
                      5月のゴミ収集日について
                    </h3>
                    <p className="text-gray-500 text-[13px] line-clamp-2 leading-relaxed">5月のゴミ収集日は以下の通りとなります。カラス被害が増えておりますのでネットを必ず...</p>
                    <div className="mt-3 pt-3 border-t border-gray-100 text-qoin-main text-[12px] font-bold flex justify-between items-center">
                      <span>詳細を確認する</span>
                      <i className="fas fa-chevron-right text-[10px]"></i>
                    </div>
                    {step === 6 && (
                      <div className="absolute right-4 bottom-4 text-5xl transform -rotate-12 animate-bounce drop-shadow-xl z-50">👆</div>
                    )}
                  </div>

                  <div className="flex justify-between items-center mb-2 px-1 mt-4">
                    <div className="flex items-center">
                      <div className="w-6 h-6 rounded-full bg-qoin-main/10 flex items-center justify-center text-qoin-main mr-2 border border-qoin-main/20">
                        <i className="fas fa-bullhorn text-[10px]"></i>
                      </div>
                      <span className="text-[12px] text-gray-600 font-bold">役員</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-[11px] text-gray-800 font-bold">2026/5/5配信</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 relative opacity-90 mb-4">
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded text-[10px] font-bold">イベント</span>
                    </div>
                    <h3 className="font-bold text-[15px] mb-1.5 leading-snug text-gray-800">清掃活動のお知らせ</h3>
                    <div className="text-orange-600 text-xs font-bold mb-1.5"><i className="fas fa-calendar-day mr-1"></i>開催: 2026-05-20</div>
                    <p className="text-gray-500 text-[13px] line-clamp-2 leading-relaxed">春の町内会・自治会一斉清掃を行います。ご協力のほどよろしくお願いいたします。</p>
                    <div className="mt-3 pt-3 border-t border-gray-100 text-qoin-main text-[12px] font-bold flex justify-between items-center">
                      <span>詳細を確認する</span>
                      <i className="fas fa-chevron-right text-[10px]"></i>
                    </div>
                    {step === 7 && (
                      <div className="absolute right-4 bottom-4 text-5xl transform -rotate-12 animate-bounce drop-shadow-xl z-50">👆</div>
                    )}
                  </div>
                </div>

                <div className={`bg-white border-t flex items-center justify-around p-2 pb-6 shrink-0 relative transition-all duration-300 ${step === 7 ? 'shadow-[0_0_15px_rgba(255,165,0,0.6)] ring-4 ring-orange-400' : ''}`}>
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-500 flex items-center justify-center mb-1 text-xl"><i className="fas fa-home"></i></div>
                    <span className="text-[10px] font-bold text-gray-700">全て</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center mb-1 text-xl"><i className="fas fa-clipboard-list"></i></div>
                    <span className="text-[10px] font-bold text-gray-700">回覧板</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-500 flex items-center justify-center mb-1 text-xl"><i className="fas fa-info-circle"></i></div>
                    <span className="text-[10px] font-bold text-gray-700">連絡</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center mb-1 text-xl"><i className="fas fa-calendar-alt"></i></div>
                    <span className="text-[10px] font-bold text-gray-700">イベント</span>
                  </div>
                </div>
              </div>

              <div className={`absolute inset-0 bg-white overflow-y-auto flex flex-col transition-all duration-500 ${step >= 8 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full pointer-events-none'}`}>
                <div className="p-4 pb-2">
                  <span className="text-xs bg-orange-100 text-orange-600 px-3 py-1 rounded-full font-bold mb-3 inline-block">イベント</span>
                  <h1 className="font-bold text-xl text-gray-800 mb-2">清掃活動のお知らせ</h1>
                  <p className="text-sm text-gray-700 mb-4">春の町内会・自治会一斉清掃を行います。公園前の集合となりますのでよろしくお願いいたします。</p>
                  
                  <div className={`bg-orange-50 border border-orange-100 rounded-2xl p-4 shadow-sm transition-transform duration-500 ${step === 8 ? 'scale-105 shadow-md border-orange-300' : 'scale-100'}`}>
                    <h4 className="font-bold text-orange-700 mb-3 border-b border-orange-200 pb-2 text-center">参加人数の入力</h4>
                    
                    <div className="flex items-center justify-between mb-3 bg-white p-2 rounded-xl border border-gray-100">
                      <span className="font-bold text-gray-700 text-sm">大人 <span className="text-[10px] text-gray-400 font-normal">（中学生以上）</span></span>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 font-bold flex items-center justify-center">-</div>
                        <span className="font-black w-4 text-center">1</span>
                        <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 font-bold flex items-center justify-center">+</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mb-4 bg-white p-2 rounded-xl border border-gray-100">
                      <span className="font-bold text-gray-700 text-sm">子供 <span className="text-[10px] text-gray-400 font-normal">（小学生以下）</span></span>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 font-bold flex items-center justify-center">-</div>
                        <span className="font-black w-4 text-center">0</span>
                        <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 font-bold flex items-center justify-center">+</div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <div className="flex-1 bg-white border border-gray-300 text-gray-600 font-bold py-3 rounded-xl text-center text-sm flex items-center justify-center">キャンセル</div>
                      <div className="flex-1 bg-orange-500 text-white font-black py-3 rounded-xl text-center shadow-md relative text-sm flex items-center justify-center">
                        確定する
                        {step === 8 && (
                          <div className="absolute right-4 -bottom-4 text-5xl transform -rotate-12 animate-bounce drop-shadow-xl z-50">👆</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {step === 9 && (
                  <div className="absolute top-2 left-6 text-5xl transform -rotate-[30deg] animate-pulse drop-shadow-xl z-50">👆</div>
                )}
                {step === 9 && (
                  <div className="absolute top-2 right-2 text-5xl transform -rotate-[30deg] animate-[bounce_1s_infinite] drop-shadow-xl z-50" style={{ animationDelay: '1.5s' }}>👆</div>
                )}
              </div>

            </div>
          </div>
          
        </div>

        {/* ガイダンス吹き出し */}
        <div className="bg-white rounded-2xl p-5 mt-6 shadow-md border-t-4 border-qoin-main relative min-h-[160px]">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-l-transparent border-b-8 border-b-qoin-main border-r-8 border-r-transparent"></div>
          
          <h3 className="text-lg font-black text-qoin-main mb-2">
            {step === 1 && "① QRコードを読み取る"}
            {step === 2 && "② メニューから「会員の方」へ"}
            {step === 3 && "③ LINE認証を許可する"}
            {step === 4 && "④ ご本人登録（名簿照合）"}
            {step === 5 && "⑤ 連携完了！"}
            {step === 6 && "⑥ 新着のお知らせを確認"}
            {step === 7 && "⑦ メニューと種類について"}
            {step === 8 && "⑧ イベントの出欠・参加人数入力"}
            {step === 9 && "⑨ 一覧に戻り、画面を閉じる"}
            {step === 10 && "⑩ 重要な情報はプッシュ通知で届く"}
          </h3>
          <p className="text-sm text-gray-700 font-bold leading-relaxed">
            {step === 1 && "町内会・自治会から配布されたチラシやポスターにあるQRコードをスマートフォンのカメラで読み取り、LINEの友だち追加をします。"}
            {step === 2 && "LINEのトーク画面下部にあるリッチメニューから「会員の方」ボタンをタップして、システムを開きます。"}
            {step === 3 && "初回のみ、LINEアカウントを利用するための認証画面が表示されます。「許可する」をタップして進んでください。"}
            {step === 4 && "ご自身の情報（町内会・自治会名、氏名、郵便番号）を入力して照合を行います。名字と名前の間は全角スペースを空けてください。同姓同名等で照合できない場合は「住所２（丁目番地）」も追加で入力してください。"}
            {step === 5 && "LINEアカウントと名簿の連携が完了しました。「アプリ画面へ進む」ボタンを押して、町内会・自治会からの案内を確認してみましょう。"}
            {step === 6 && "アプリを開くと最初の画面（トップ）が開きます。新しく届いた「新着」の未読回覧板は、一番上に優先して表示されます。"}
            {step === 7 && "お知らせの種類は「回覧板」「連絡」「イベント」に分かれており、下のボタンから絞り込めます。イベントはカレンダー形式でも確認できます。"}
            {step === 8 && "「イベント」の場合は出欠を取ることができます。参加する場合は、画面の入力フォームで「大人」「子供」それぞれの参加人数を入力して確定します。"}
            {step === 9 && "確認が終わったら、左上の「＜ 一覧に戻る」を押します。その後、右上の「×」ボタンを押して画面を閉じると、LINEのトーク画面に戻ります。"}
            {step === 10 && "役員から「回覧板」「連絡」「イベント」がプッシュ送信された場合、LINEの画面上に直接お知らせが届きます。そのままメッセージをタップして内容を確認できます。"}
          </p>
        </div>

      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { transform: translateY(0); }
          50% { transform: translateY(180px); }
          100% { transform: translateY(0); }
        }
        @keyframes typing {
          from { max-width: 0 }
          to { max-width: 100% }
        }
      `}} />
    </div>
  );
}
