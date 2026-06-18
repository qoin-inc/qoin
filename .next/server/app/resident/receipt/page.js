(()=>{var e={};e.id=451,e.ids=[451],e.modules={7849:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external")},2934:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external.js")},5403:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external")},4580:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external.js")},4749:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external")},5869:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},399:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},1017:e=>{"use strict";e.exports=require("path")},7310:e=>{"use strict";e.exports=require("url")},5126:(e,t,r)=>{"use strict";r.r(t),r.d(t,{GlobalError:()=>a.a,__next_app__:()=>m,originalPathname:()=>d,pages:()=>p,routeModule:()=>x,tree:()=>c}),r(4038),r(5425),r(1506),r(5866);var i=r(3191),s=r(8716),n=r(7922),a=r.n(n),o=r(5231),l={};for(let e in o)0>["default","tree","pages","GlobalError","originalPathname","__next_app__","routeModule"].indexOf(e)&&(l[e]=()=>o[e]);r.d(t,l);let c=["",{children:["resident",{children:["receipt",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(r.bind(r,4038)),"C:\\Users\\info\\.gemini\\antigravity\\app\\resident\\receipt\\page.tsx"]}]},{}]},{layout:[()=>Promise.resolve().then(r.bind(r,5425)),"C:\\Users\\info\\.gemini\\antigravity\\app\\resident\\layout.tsx"],metadata:{icon:[async e=>(await Promise.resolve().then(r.bind(r,7481))).default(e)],apple:[],openGraph:[],twitter:[],manifest:void 0}}]},{layout:[()=>Promise.resolve().then(r.bind(r,1506)),"C:\\Users\\info\\.gemini\\antigravity\\app\\layout.tsx"],"not-found":[()=>Promise.resolve().then(r.t.bind(r,5866,23)),"next/dist/client/components/not-found-error"],metadata:{icon:[async e=>(await Promise.resolve().then(r.bind(r,7481))).default(e)],apple:[],openGraph:[],twitter:[],manifest:void 0}}],p=["C:\\Users\\info\\.gemini\\antigravity\\app\\resident\\receipt\\page.tsx"],d="/resident/receipt/page",m={require:r,loadChunk:()=>Promise.resolve()},x=new i.AppPageRouteModule({definition:{kind:s.x.APP_PAGE,page:"/resident/receipt/page",pathname:"/resident/receipt",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:c}})},7873:()=>{},4222:(e,t,r)=>{Promise.resolve().then(r.bind(r,284))},9968:(e,t,r)=>{Promise.resolve().then(r.bind(r,5525))},4636:(e,t,r)=>{Promise.resolve().then(r.t.bind(r,2994,23)),Promise.resolve().then(r.t.bind(r,6114,23)),Promise.resolve().then(r.t.bind(r,9727,23)),Promise.resolve().then(r.t.bind(r,9671,23)),Promise.resolve().then(r.t.bind(r,1868,23)),Promise.resolve().then(r.t.bind(r,4759,23))},284:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>s});var i=r(326);function s({children:e}){return i.jsx(i.Fragment,{children:e})}r(7577)},5525:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>o});var i=r(326),s=r(7577),n=r(5047);function a(){let e=(0,n.useSearchParams)(),t=e.get("amount")||"0",r=e.get("name")||"",s=e.get("date")||"",a=e.get("town")||"",o=e.get("txId")||"",l=e.get("method")||"";return(0,i.jsxs)("div",{className:"outer-receipt-wrapper bg-white min-h-screen p-4 md:p-8 flex items-center justify-center",children:[i.jsx("style",{children:`
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
      `}),(0,i.jsxs)("div",{className:"receipt-container",children:[(0,i.jsxs)("div",{className:"receipt-date",children:["発行日: ",s]}),(0,i.jsxs)("div",{className:"receipt-header",children:[i.jsx("h1",{children:"領収書"}),i.jsx("div",{className:"receipt-line"})]}),(0,i.jsxs)("div",{className:"receipt-target",children:[r," 様"]}),i.jsx("p",{style:{fontSize:"12px",fontWeight:"bold",margin:0},children:"金額として、下記のとおり領収いたしました。"}),(0,i.jsxs)("div",{className:"receipt-amount",children:["領収金額： \xa5",parseInt(t).toLocaleString(),"-"]}),(0,i.jsxs)("div",{className:"receipt-details",children:[(0,i.jsxs)("div",{className:"receipt-row",children:[i.jsx("span",{className:"receipt-label",children:"但し書き"}),i.jsx("span",{className:"receipt-value",children:"会費として"})]}),(0,i.jsxs)("div",{className:"receipt-row",children:[i.jsx("span",{className:"receipt-label",children:"お支払方法"}),i.jsx("span",{className:"receipt-value",children:l})]}),(0,i.jsxs)("div",{className:"receipt-row",children:[i.jsx("span",{className:"receipt-label",children:"領収日"}),i.jsx("span",{className:"receipt-value",children:s})]}),(0,i.jsxs)("div",{className:"receipt-row",style:{borderBottom:"none"},children:[i.jsx("span",{className:"receipt-label",children:"決済番号"}),i.jsx("span",{className:"receipt-value",style:{fontFamily:"monospace"},children:o})]})]}),(0,i.jsxs)("div",{className:"receipt-footer",children:[(0,i.jsxs)("div",{className:"receipt-issuer",children:[i.jsx("p",{style:{fontSize:"10px",color:"#6b7280",marginBottom:"3px"},children:"領収者"}),i.jsx("p",{style:{fontSize:"14px",fontWeight:"900",color:"#111827"},children:a}),i.jsx("p",{style:{fontSize:"8px",color:"#6b7280",fontWeight:"normal"},children:"el-town オンライン集金受領"})]}),(0,i.jsxs)("div",{className:"receipt-stamp",children:[a.slice(0,3),i.jsx("br",{}),"領収済"]})]})]})]})}function o(){return i.jsx(s.Suspense,{fallback:i.jsx("div",{className:"p-8 text-center text-gray-500",children:"読み込み中..."}),children:i.jsx(a,{})})}},5047:(e,t,r)=>{"use strict";var i=r(7389);r.o(i,"useRouter")&&r.d(t,{useRouter:function(){return i.useRouter}}),r.o(i,"useSearchParams")&&r.d(t,{useSearchParams:function(){return i.useSearchParams}})},1506:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>n,metadata:()=>s});var i=r(9510);r(7272),function(){var e=Error("Cannot find module '@/components/LiffProvider'");throw e.code="MODULE_NOT_FOUND",e}();let s={title:"el-town",description:"町内会・自治会向け電子回覧板アプリ el-town"};function n({children:e}){return(0,i.jsxs)("html",{lang:"ja",children:[(0,i.jsxs)("head",{children:[i.jsx("link",{href:"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css",rel:"stylesheet"}),i.jsx("link",{href:"https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Noto+Sans+JP:wght@400;700;900&display=swap",rel:"stylesheet"})]}),i.jsx("body",{className:"antialiased",children:i.jsx(Object(function(){var e=Error("Cannot find module '@/components/LiffProvider'");throw e.code="MODULE_NOT_FOUND",e}()),{children:e})})]})}},5425:(e,t,r)=>{"use strict";r.r(t),r.d(t,{$$typeof:()=>a,__esModule:()=>n,default:()=>o});var i=r(8570);let s=(0,i.createProxy)(String.raw`C:\Users\info\.gemini\antigravity\app\resident\layout.tsx`),{__esModule:n,$$typeof:a}=s;s.default;let o=(0,i.createProxy)(String.raw`C:\Users\info\.gemini\antigravity\app\resident\layout.tsx#default`)},4038:(e,t,r)=>{"use strict";r.r(t),r.d(t,{$$typeof:()=>a,__esModule:()=>n,default:()=>o});var i=r(8570);let s=(0,i.createProxy)(String.raw`C:\Users\info\.gemini\antigravity\app\resident\receipt\page.tsx`),{__esModule:n,$$typeof:a}=s;s.default;let o=(0,i.createProxy)(String.raw`C:\Users\info\.gemini\antigravity\app\resident\receipt\page.tsx#default`)},7481:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>s});var i=r(6621);let s=e=>[{type:"image/x-icon",sizes:"16x16",url:(0,i.fillMetadataSegment)(".",e.params,"favicon.ico")+""}]},7272:()=>{}};var t=require("../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),i=t.X(0,[948,471,621],()=>r(5126));module.exports=i})();