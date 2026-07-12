'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import dynamic from 'next/dynamic';
import LiffProvider from '@/components/LiffProvider';
import '@/styles/homepage.css';
import { useRouter } from 'next/navigation';
// Direct LIFF import removed; will use window.liff within DynamicLiffProvider

// Leafletを使用するコンポーネントはSSRを無効化する
const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false });

export default function PortalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [town, setTown] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [towns, setTowns] = useState<any[]>([]);
  
  // タブ: 'food'(食べ・映えel-town), 'sight'(伝えel-town), 'map'(マイel-town)
  const [activeTab, setActiveTab] = useState<'food' | 'sight' | 'map'>('map');
  
  // マイel-town(地図)で選択された町内会ID
  const [selectedTownId, setSelectedTownId] = useState<number | null>(null);
  const [isMapModalExpanded, setIsMapModalExpanded] = useState(false);
  const [areTabsVisible, setAreTabsVisible] = useState(true);
  
  // モーダル用
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [postCategory, setPostCategory] = useState<'food' | 'sight'>('food');
  const [nickname, setNickname] = useState('');
  const [title, setTitle] = useState('');
  const [locationInfo, setLocationInfo] = useState('');

  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  // 画面下部のメニュー用 State
  const [richMenuTab, setRichMenuTab] = useState<'main' | 'fee_submenu' | 'settings_submenu'>('main');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkSessionAndFetchData();
  }, []);

  const checkSessionAndFetchData = async () => {
    let { data: { session } } = await supabase.auth.getSession();
    
    // セッションがない場合は、LIFFから直接復元を試みる（バックアップ機構）
    if (!session) {
      try {
          if (typeof window !== 'undefined' && (window as any).liff) {
            await (window as any).liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID || '2009817872-zldmH8LW' });
            if ((window as any).liff.isLoggedIn()) {
            const profile = await (window as any).liff.getProfile();
            const email = `${profile.userId}@line.eltown.local`;
          const password = `lineAuth_${profile.userId}_eltown`;
          const { data } = await supabase.auth.signInWithPassword({ email, password });
          if (data.session) {
            session = data.session;
          }
        }
      }
      } catch (e) {
        console.error('Portal LIFF fallback error:', e);
      }
    }

    if (!session) {
      router.push('/resident'); 
      return;
    }
    setUser(session.user);

    const { data: rosterData } = await supabase
      .from('resident_rosters')
      .select('neighborhood_id, withdrawal_status')
      .or(`user_auth_id.eq.${session.user.id},family_user_auth_id_1.eq.${session.user.id},family_user_auth_id_2.eq.${session.user.id}`)
      .single();

    if (rosterData) {
      if (rosterData.withdrawal_status === 'withdrawn') {
        await supabase.auth.signOut();
        try {
          if (typeof window !== 'undefined' && (window as any).liff && (window as any).liff.isLoggedIn()) {
            (window as any).liff.logout();
          }
        } catch (e) {
          console.error('Portal logout error:', e);
        }
        router.push('/resident?error=withdrawn');
        return;
      }

      const { data: townData } = await supabase
        .from('neighborhoods')
        .select('*')
        .eq('id', rosterData.neighborhood_id)
        .single();
      setTown(townData);
    } else {
      router.push('/resident');
      return;
    }

    await fetchData();
  };

  const fetchData = async () => {
    setLoading(true);
    const [{ data: postsData }, { data: neighborhoodsData }] = await Promise.all([
      supabase
        .from('public_posts')
        .select('*, neighborhoods(name, lat, lng)')
        .order('created_at', { ascending: false }),
      supabase
        .from('neighborhoods')
        .select('id, name, lat, lng')
        .not('lat', 'is', null)
        .not('lng', 'is', null),
    ]);

    if (postsData) {
      setPosts(postsData);
      
      const latestPostMap = new Map();
      postsData.forEach(post => {
        if (!latestPostMap.has(post.neighborhood_id)) {
          latestPostMap.set(post.neighborhood_id, {
            category: post.category,
            title: post.title,
            nickname: post.nickname,
          });
        }
      });
      setTowns((neighborhoodsData || []).map((item: any) => ({
        ...item,
        latestPost: latestPostMap.get(item.id) || null,
      })));
    }
    setLoading(false);
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('本当にこの情報を削除しますか？')) return;
    try {
      const { error } = await supabase.from('public_posts').delete().eq('id', postId);
      if (error) throw error;
      setPosts(posts.filter(p => p.id !== postId));
    } catch (err: any) {
      console.error('Delete error:', err);
      alert('削除に失敗しました。');
    }
  };

  const handleEditClick = (post: any) => {
    setEditingPostId(post.id);
    setPostCategory(post.category);
    setNickname(post.nickname);
    setTitle(post.title);
    setContent(post.content);
    setLocationInfo(post.location_info || '');

    setIsModalOpen(true);
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !title.trim() || !content.trim() || !town) return;
    
    setIsSubmitting(true);
    let imageUrl = '';

    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `portal_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(fileName, imageFile);

      if (!uploadError) {
        const { data } = supabase.storage.from('attachments').getPublicUrl(fileName);
        imageUrl = data.publicUrl;
      }
    }

    // 緯度経度の自動取得（まだ設定されていない場合）
    let currentTownLat = town.lat;
    let currentTownLng = town.lng;
    if (!currentTownLat && !currentTownLng && town.postal_code) {
       try {
         const res = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${town.postal_code.replace('-', '')}&country=japan&format=json`);
         const geoData = await res.json();
         if (geoData && geoData.length > 0) {
           currentTownLat = parseFloat(geoData[0].lat);
           currentTownLng = parseFloat(geoData[0].lon);
           await supabase.from('neighborhoods').update({ lat: currentTownLat, lng: currentTownLng }).eq('id', town.id);
           setTown({ ...town, lat: currentTownLat, lng: currentTownLng });
         }
       } catch (e) {
         console.error('Geocoding error:', e);
       }
    }

    try {
      const postData = {
        user_auth_id: user.id,
        neighborhood_id: town.id,
        category: postCategory,
        nickname,
        title,
        content,
        location_info: locationInfo, // 食べ・映え問わず場所を保存
        event_date: null,
        ...(imageUrl ? { image_url: imageUrl } : {})
      };

      if (editingPostId) {
        const { error: updateError } = await supabase
          .from('public_posts')
          .update(postData)
          .eq('id', editingPostId);
        if (updateError) throw updateError;
        alert('情報を更新しました！');
      } else {
        const { error: postError } = await supabase
          .from('public_posts')
          .insert(postData);
        if (postError) throw postError;
        alert('投稿が完了しました！');
      }
      setIsModalOpen(false);
      setIsSubmitting(false);
      setNickname('');
      setTitle('');
      setContent('');
      setLocationInfo('');

      setImageFile(null);
      setEditingPostId(null);
      setActiveTab(postCategory);
      fetchData();
    } catch (err: any) {
      alert(`エラーが発生しました。\n\n詳細:\n${err.message || err.details || JSON.stringify(err)}`);
      setIsSubmitting(false);
    }
  };



// Loading UI moved to JSX
const renderPostCard = (post: any) => {
  // Loading check before main return
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-qoin-light text-qoin-main"><i className="fas fa-spinner fa-spin text-3xl"></i></div>;
  }

    return (
      <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
        <div className="p-3 border-b border-gray-50 flex items-start justify-between">
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white mr-2 shadow-inner ${post.category === 'food' ? 'bg-orange-400' : 'bg-blue-500'}`}>
              <i className={`fas ${post.category === 'food' ? 'fa-camera-retro' : 'fa-bullhorn'} text-xs`} />
            </div>
            <div>
              <div
                className="text-xs font-black text-blue-600 cursor-pointer hover:text-blue-800 hover:underline transition inline-flex items-center"
                onClick={(e) => {
                  e.stopPropagation();
                  if (post.neighborhood_id) {
                    setSelectedTownId(post.neighborhood_id);
                    setIsMapModalExpanded(true);
                    setActiveTab('map');
                  }
                }}
              >
                <i className="fas fa-map-marker-alt mr-1" />
                {post.neighborhoods?.name || '不明な自治会'}
              </div>
              <span className="text-[10px] text-gray-400 font-normal ml-1">から</span>
              <div className="text-[10px] text-gray-500 mt-0.5">@{post.nickname}</div>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="text-[10px] text-gray-400 font-bold mb-1">
              {new Date(post.created_at).toLocaleDateString('ja-JP')}
            </div>
            {user && post.user_auth_id === user.id && (
              <div className="flex items-center gap-2 mt-1">
                <button onClick={() => handleEditClick(post)} className="text-gray-400 hover:text-blue-500 transition"><i className="fas fa-pen text-xs" /></button>
                <button onClick={() => handleDeletePost(post.id)} className="text-gray-400 hover:text-red-500 transition"><i className="fas fa-trash text-xs" /></button>
              </div>
            )}
          </div>
        </div>

        <div className="p-4">
          <h3 className={`font-black text-base mb-2 leading-tight ${post.category === 'food' ? 'text-orange-600' : 'text-blue-600'}`}>
            {post.title}
          </h3>
          {post.location_info && (
            <div className="text-xs text-gray-500 mb-2 flex items-start">
              <i className={`fas fa-map-marker-alt mt-0.5 mr-1.5 ${post.category === 'food' ? 'text-orange-400' : 'text-blue-400'}`} />
              <span>{post.location_info}</span>
            </div>
          )}
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mt-2 bg-gray-50 p-3 rounded-xl border border-gray-100">{post.content}</p>
        </div>

        {post.image_url && (
          <div className="w-full max-h-[400px] bg-gray-100 flex items-center justify-center overflow-hidden border-t border-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.image_url} alt="投稿画像" className="w-full h-full object-contain" />
          </div>
        )}
      </div>
    );
  };


  return (
  
    <div className="hero-bg portal-screen font-sans">
      <div className="portal-phone-shell">
        
        {/* ヘッダー (flex-shrink-0 を追加して潰れ・めり込みを防止、左矢印を削除、スリム化) */}
        <div className="portal-header">
          <h1>マイel-town</h1>
        </div>

        {/* コンテンツエリア (スクロール領域) */}
        <div ref={contentRef} className="portal-content hide-scrollbar">
          
          {/* ① 食べ・映えel-town (タイムライン) */}
          {activeTab === 'food' && (
            <div className="p-4 pt-6 space-y-4">
              {posts.filter(p => p.category === 'food').length === 0 ? (
                <div className="text-center text-gray-400 py-10 font-bold text-sm">お店やグルメ、景色などの情報がありません。<br/>(※もし投稿したのに表示されない場合、データベースの閲覧権限エラーです)<br/>最初の発信者になりましょう！</div>
              ) : (
                posts.filter(p => p.category === 'food').map(post => renderPostCard(post))
              )}
              {/* 自動スクロールのターゲット */}
              <div ref={activeTab === 'food' ? messagesEndRef : null} className="h-4" />
            </div>
          )}

          {/* ② 伝えel-town (タイムライン) */}
          {activeTab === 'sight' && (
            <div className="p-4 pt-6 space-y-4">
              {posts.filter(p => p.category === 'sight').length === 0 ? (
                <div className="text-center text-gray-400 py-10 font-bold text-sm">町内会・自治会の活動情報がありません。<br/>最初の発信者になりましょう！</div>
              ) : (
                posts.filter(p => p.category === 'sight').map(post => renderPostCard(post))
              )}
              {/* 自動スクロールのターゲット */}
              <div ref={activeTab === 'sight' ? messagesEndRef : null} className="h-4" />
            </div>
          )}

          {/* ③ マイel-town (全面地図) */}
          {activeTab === 'map' && (
             <div className="absolute inset-0 z-0">
                <MapComponent 
                  towns={towns} 
                  selectedTownId={selectedTownId}
                  onMarkerClick={(id) => {
                     setSelectedTownId(id);
                     setIsMapModalExpanded(true);
                  }} 
                />
                
                {/* 地図上のピンタップ時に表示される投稿一覧 */}
                {selectedTownId && (
                  <div className={`portal-map-sheet ${isMapModalExpanded ? 'expanded' : ''}`}>
                    <div className="portal-map-sheet-header">
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-300 rounded-full"></div>
                      <div className="pt-2">
                        <h3 className="font-black text-gray-800">{towns.find(t => t.id === selectedTownId)?.name || '町内会'} の投稿</h3>
                        <p className="text-xs text-gray-500">新しい順に表示</p>
                      </div>
                      <div className="portal-map-sheet-actions">
                        <button
                          type="button"
                          className="portal-map-sheet-toggle"
                          onClick={() => setIsMapModalExpanded((current) => !current)}
                        >
                          {isMapModalExpanded ? '閉じる' : '投稿を見る'} <i className={`fas ${isMapModalExpanded ? 'fa-chevron-down' : 'fa-chevron-up'}`}></i>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedTownId(null)}
                          className="portal-map-sheet-close"
                          aria-label="投稿一覧を終了"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    </div>
                    {isMapModalExpanded && <div className="portal-map-sheet-content">
                      {posts.filter(p => p.neighborhood_id === selectedTownId).length === 0 ? (
                        <div className="text-center text-gray-400 py-10 font-bold text-sm">投稿がありません。</div>
                      ) : (
                        posts.filter(p => p.neighborhood_id === selectedTownId).map(post => renderPostCard(post))
                      )}
                    </div>}
                  </div>
                )}
             </div>
          )}

        </div>

        {areTabsVisible && <nav className="portal-bottom-tabs" aria-label="マイel-town メニュー">
          <button type="button" className={activeTab === 'food' ? 'active food' : 'food'} onClick={() => setActiveTab('food')}>
            <i className="fas fa-camera-retro" /><span>食べ・映え<br />el-town</span>
          </button>
          <button type="button" className={activeTab === 'sight' ? 'active sight' : 'sight'} onClick={() => setActiveTab('sight')}>
            <i className="fas fa-bullhorn" /><span>伝え<br />el-town</span>
          </button>
          <button type="button" className={activeTab === 'map' ? 'active map' : 'map'} onClick={() => setActiveTab('map')}>
            <i className="fas fa-map-marked-alt" /><span>マイ<br />el-town</span>
          </button>
        </nav>}
        <button
          type="button"
          className="portal-tabs-toggle"
          aria-expanded={areTabsVisible}
          onClick={() => setAreTabsVisible((current) => !current)}
        >
          <i className="fas fa-keyboard" />
          <span>{areTabsVisible ? 'メニューを閉じる' : 'メニューを開く'}</span>
          <i className={`fas ${areTabsVisible ? 'fa-chevron-down' : 'fa-chevron-up'}`} />
        </button>

        {/* 投稿FABボタン (地図タブ以外で表示、あるいは常時表示) */}
        <button 
          onClick={() => {
             setPostCategory(activeTab === 'sight' ? 'sight' : 'food'); // タブに応じて初期カテゴリを変える
             setIsModalOpen(true);
          }}
          className={`portal-post-fab ${activeTab === 'map' ? 'is-hidden' : ''} ${areTabsVisible ? '' : 'tabs-hidden'}`}
        >
          <i className="fas fa-pen"></i>
        </button>

        {/* 投稿モーダル (全画面表示に変更し、キーボードによる見切れを防止) */}
        {isModalOpen && (
          <div className="portal-post-modal">
            <div className="portal-post-modal-header">
              <button type="button" onClick={() => {setIsModalOpen(false); setEditingPostId(null);}} className="portal-post-modal-close" aria-label="入力画面を閉じる"><i className="fas fa-times"></i></button>
              <h2>{editingPostId ? '情報の編集' : '情報の発信'}</h2>
                <button 
                  type="button"
                  onClick={handlePost} 
                  disabled={isSubmitting || !nickname.trim() || !title.trim() || !content.trim()}
                  className="portal-post-modal-submit"
                >
                  {isSubmitting ? '送信中...' : editingPostId ? '更新する' : '発信する'}
                </button>
              </div>
              
              <div className="portal-post-modal-body hide-scrollbar">
                
                {/* 記述シート案内 */}
                <div className="portal-post-modal-note">
                  {postCategory === 'food' ? (
                    <><i className="fas fa-info-circle mr-2 text-blue-500"></i>ご近所の美味しいお店や綺麗な景色の情報を投稿してください</>
                  ) : (
                    <><i className="fas fa-info-circle mr-2 text-blue-500"></i>町内会や自治会で行っている行事や活動を紹介してください</>
                  )}
                </div>
                
                {/* カテゴリ選択 */}
                <div className="portal-post-category-grid">
                  <button 
                    type="button"
                    onClick={() => setPostCategory('food')}
                    className={`food ${postCategory === 'food' ? 'active' : ''}`}
                  >
                    <i className="fas fa-camera-retro text-xl"></i>
                    <span className="text-xs">食べ・映えel-town</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setPostCategory('sight')}
                    className={`sight ${postCategory === 'sight' ? 'active' : ''}`}
                  >
                    <i className="fas fa-bullhorn text-xl"></i>
                    <span className="text-xs">伝えel-town</span>
                  </button>
                </div>

                {/* 共通項目: ニックネーム */}
                <div className="portal-post-field">
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    {postCategory === 'food' ? 'ニックネーム' : 'ニックネーム（団体名や役職名でも可）'} <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={nickname} onChange={e => setNickname(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800"
                    placeholder={postCategory === 'food' ? '例：はらぺこ太郎' : '例：広報委員 山田'}
                  />
                </div>

                {/* タイトル (お店名前 / イベント名) */}
                <div className="portal-post-field">
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    {postCategory === 'food' ? 'お店・スポット名' : '行事・活動のタイトル'} <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={title} onChange={e => setTitle(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800"
                    placeholder={postCategory === 'food' ? '例：駅前ベーカリー、秘密の絶景スポット' : '例：秋のホタル鑑賞会、毎月の清掃活動'}
                  />
                </div>

                {/* 個別項目: 場所 */}
                <div className="portal-post-field">
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    {postCategory === 'food' ? '場所・アクセス（任意）' : '開催場所（任意）'}
                  </label>
                  <input 
                    type="text" 
                    value={locationInfo} onChange={e => setLocationInfo(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800"
                    placeholder={postCategory === 'food' ? '例：七日町駅 徒歩3分' : '例：〇〇公園、町内会館'}
                  />
                </div>

                {/* アピール内容 */}
                <div className="portal-post-field">
                  <label className="block text-xs font-bold text-gray-500 mb-1">アピール内容 <span className="text-red-500">*</span></label>
                  <textarea 
                    value={content} onChange={e => setContent(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm h-32 focus:outline-none focus:ring-2 focus:ring-gray-800"
                    placeholder={postCategory === 'food' ? 'おすすめポイントや感想などを書いてください' : '活動の様子や参加募集などのメッセージを書いてください'}
                  ></textarea>
                </div>

                {/* 写真 */}
                <div className="portal-post-field">
                  <label className="block text-xs font-bold text-gray-500 mb-1">写真</label>
                  <div className="portal-post-file-picker">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={e => setImageFile(e.target.files ? e.target.files[0] : null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="w-full bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-4 text-center">
                      {imageFile ? (
                        <div className="text-sm font-bold text-qoin-main"><i className="fas fa-check-circle mr-1"></i> {imageFile.name}</div>
                      ) : (
                        <div className="text-sm text-gray-400"><i className="fas fa-image mr-1"></i> タップして写真を選ぶ</div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
        
    )}

      </div>
    </div>
  );
}
