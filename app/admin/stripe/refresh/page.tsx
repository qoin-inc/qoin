'use client';

import Link from 'next/link';

export default function StripeRefreshPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Stripe登録中断
        </h2>
        <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
          <div className="text-yellow-500 text-5xl mb-4">
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <p className="text-gray-700 mb-6">
            登録手続きが中断されたか、リンクの有効期限が切れました。<br/>
            恐れ入りますが、設定画面から再度「Stripeと連携する」ボタンを押して手続きをやり直してください。
          </p>
          <Link 
            href="/admin" 
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            ダッシュボードへ戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
