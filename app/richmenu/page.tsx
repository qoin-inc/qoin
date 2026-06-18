import React from 'react';

export default function RichMenuGenerator() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-8">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold mb-2">LINEリッチメニュー画像（3列レイアウト）</h1>
        <p className="text-gray-600 mb-4">
          こちらの画面をスクリーンショットして切り抜き、LINEのカスタムリッチメニューにご利用ください。
        </p>
      </div>

      {/* 2500x843 px (LINE Small Rich Menu) */}
      <div 
        id="rich-menu-container"
        className="bg-white relative shadow-2xl rounded-sm flex justify-center items-center p-8 gap-6"
        style={{
          width: '2500px',
          height: '843px',
          transform: 'scale(0.4)', // 縮小表示
          transformOrigin: 'top center'
        }}
      >
        {/* 会員の方 */}
        <div className="flex-1 h-full rounded-[40px] border-[4px] border-gray-100 flex flex-col items-center justify-center bg-white shadow-sm hover:shadow-md transition">
          <div className="text-[#3b82f6] text-[150px] mb-12">
            <i className="fas fa-clipboard-list"></i>
          </div>
          <h2 className="text-[70px] font-black text-gray-800 tracking-widest mb-6">会員の方</h2>
          <p className="text-[35px] text-gray-500 font-bold tracking-wide">回覧板・新規登録</p>
        </div>

        {/* 役員の方 */}
        <div className="flex-1 h-full rounded-[40px] border-[4px] border-gray-100 flex flex-col items-center justify-center bg-white shadow-sm hover:shadow-md transition">
          <div className="text-[#10b981] text-[150px] mb-12">
            <i className="fas fa-user-tie"></i>
          </div>
          <h2 className="text-[70px] font-black text-gray-800 tracking-widest mb-6">役員の方</h2>
          <p className="text-[35px] text-gray-500 font-bold tracking-wide">管理画面を開く</p>
        </div>

        {/* マイel-town */}
        <div className="flex-1 h-full rounded-[40px] border-[4px] border-gray-100 flex flex-col items-center justify-center bg-white shadow-sm hover:shadow-md transition">
          <div className="text-[#f59e0b] text-[150px] mb-12">
            <i className="fas fa-home"></i>
          </div>
          <h2 className="text-[70px] font-black text-gray-800 tracking-widest mb-6">マイel-town</h2>
          <p className="text-[35px] text-gray-500 font-bold tracking-wide">ポータルサイト</p>
        </div>
      </div>
    </div>
  );
}
