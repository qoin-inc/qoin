'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function StripeReturnPage() {
  const [canClose, setCanClose] = useState(false);
  const [closeFailed, setCloseFailed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCanClose(true);
    }
  }, []);

  const handleClose = () => {
    if (typeof window !== 'undefined') {
      window.close();
      
      // 自動で閉じられなかった場合に備え、500ms後にエラーガイダンスを表示
      setTimeout(() => {
        setCloseFailed(true);
      }, 500);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-indigo-900">
          Stripe連携手続き完了
        </h2>
        <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-green-400 to-indigo-500"></div>
          
          <div className="text-green-500 text-6xl mb-4 animate-pulse">
            <i className="fas fa-check-circle animate-bounce"></i>
          </div>
          
          <h3 className="text-lg font-bold text-gray-800 mb-2">
            Stripe連携手続きが完了しました！
          </h3>
          
          <p className="text-xs md:text-sm text-gray-600 mb-8 leading-relaxed">
            アカウント登録・接続手続きが正常に完了しました。<br/>
            Stripeによるアカウント審査が自動的に開始されます。
          </p>

          <div className="space-y-3">
            {canClose && (
              <button
                onClick={handleClose}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-black text-white bg-green-600 hover:bg-green-700 transition cursor-pointer"
              >
                <i className="fas fa-times-circle mr-2 text-lg"></i>
                このタブ（登録画面）を閉じる
              </button>
            )}

            {closeFailed && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs md:text-sm p-4 rounded-xl text-left leading-relaxed animate-pulse">
                <p className="font-extrabold mb-1 flex items-center text-red-800">
                  <i className="fas fa-exclamation-triangle mr-1.5 text-base"></i>
                  自動でタブを閉じられませんでした
                </p>
                <p className="text-[11px] md:text-xs">
                  お使いのブラウザ（ChromeやSafari等）のセキュリティ制限により、このボタンから自動でタブを閉じることができません。
                </p>
                <p className="mt-2 font-black text-[12px] md:text-xs text-red-950">
                  【対処法】ブラウザのタブ切り替え（画面右上にある『2』などの数字ボタン）から、このタブを手動で閉じるか、元の「el-town」管理画面タブにお戻りください。
                </p>
              </div>
            )}
            
            <Link 
              href="/admin" 
              className="w-full flex justify-center py-3 px-4 border border-indigo-200 rounded-xl text-sm font-bold text-indigo-700 hover:bg-indigo-50 transition"
            >
              <i className="fas fa-home mr-2"></i>
              管理画面ダッシュボードへ進む
            </Link>
          </div>

          <p className="mt-6 text-[10px] text-gray-400 leading-normal">
            ※「このタブを閉じる」を押した後は、元の管理画面タブに戻ってページを再読み込みすることで、連携状況が反映されていることをご確認いただけます。
          </p>
        </div>
      </div>
    </div>
  );
}
