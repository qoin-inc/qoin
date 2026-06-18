(()=>{var e={};e.id=768,e.ids=[768],e.modules={7849:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external")},2934:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external.js")},5403:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external")},4580:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external.js")},4749:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external")},5869:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},399:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},1017:e=>{"use strict";e.exports=require("path")},7310:e=>{"use strict";e.exports=require("url")},1088:(e,t,r)=>{"use strict";r.r(t),r.d(t,{GlobalError:()=>a.a,__next_app__:()=>x,originalPathname:()=>c,pages:()=>d,routeModule:()=>m,tree:()=>p}),r(5381),r(5425),r(1506),r(5866);var i=r(3191),n=r(8716),s=r(7922),a=r.n(s),o=r(5231),l={};for(let e in o)0>["default","tree","pages","GlobalError","originalPathname","__next_app__","routeModule"].indexOf(e)&&(l[e]=()=>o[e]);r.d(t,l);let p=["",{children:["resident",{children:["proxy",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(r.bind(r,5381)),"C:\\Users\\info\\.gemini\\antigravity\\app\\resident\\proxy\\page.tsx"]}]},{}]},{layout:[()=>Promise.resolve().then(r.bind(r,5425)),"C:\\Users\\info\\.gemini\\antigravity\\app\\resident\\layout.tsx"],metadata:{icon:[async e=>(await Promise.resolve().then(r.bind(r,7481))).default(e)],apple:[],openGraph:[],twitter:[],manifest:void 0}}]},{layout:[()=>Promise.resolve().then(r.bind(r,1506)),"C:\\Users\\info\\.gemini\\antigravity\\app\\layout.tsx"],"not-found":[()=>Promise.resolve().then(r.t.bind(r,5866,23)),"next/dist/client/components/not-found-error"],metadata:{icon:[async e=>(await Promise.resolve().then(r.bind(r,7481))).default(e)],apple:[],openGraph:[],twitter:[],manifest:void 0}}],d=["C:\\Users\\info\\.gemini\\antigravity\\app\\resident\\proxy\\page.tsx"],c="/resident/proxy/page",x={require:r,loadChunk:()=>Promise.resolve()},m=new i.AppPageRouteModule({definition:{kind:n.x.APP_PAGE,page:"/resident/proxy/page",pathname:"/resident/proxy",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:p}})},7873:()=>{},4222:(e,t,r)=>{Promise.resolve().then(r.bind(r,284))},5313:(e,t,r)=>{Promise.resolve().then(r.bind(r,9014))},4636:(e,t,r)=>{Promise.resolve().then(r.t.bind(r,2994,23)),Promise.resolve().then(r.t.bind(r,6114,23)),Promise.resolve().then(r.t.bind(r,9727,23)),Promise.resolve().then(r.t.bind(r,9671,23)),Promise.resolve().then(r.t.bind(r,1868,23)),Promise.resolve().then(r.t.bind(r,4759,23))},284:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>n});var i=r(326);function n({children:e}){return i.jsx(i.Fragment,{children:e})}r(7577)},9014:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>o});var i=r(326),n=r(7577),s=r(5047);function a(){let e=(0,s.useSearchParams)(),t=e.get("title")||"",r=e.get("date")||"",n=e.get("signer")||"",a=e.get("agent")||"",o=e.get("text")||"",l=(e=>{if(!e)return"";let t=e.split("-");if(3===t.length){let e=parseInt(t[0],10),r=parseInt(t[1],10),i=parseInt(t[2],10);if(!isNaN(e)&&!isNaN(r)&&!isNaN(i)){let t=e-2018,n="令和";e<2019&&(t=e-1988,n="平成");let s=1===t?"元":String(t);return`${n}${s}年${r}月${i}日`}}return e})(r);return(0,i.jsxs)("div",{className:"outer-proxy-wrapper bg-white min-h-screen p-8 md:p-16 flex items-center justify-center",children:[i.jsx("style",{children:`
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
      `}),(0,i.jsxs)("div",{className:"proxy-container",children:[i.jsx("div",{className:"proxy-body-text",children:o||`私は、${t}に出席できませんので、同総会における議決権を委任します。`}),(0,i.jsxs)("div",{className:"proxy-signatures",children:[i.jsx("div",{className:"proxy-sig-row",children:i.jsx("span",{className:"proxy-sig-date",children:l})}),(0,i.jsxs)("div",{className:"proxy-sig-row",children:[i.jsx("span",{className:"proxy-sig-label",children:"(本人)"}),i.jsx("span",{className:"proxy-sig-value",children:n})]}),a&&(0,i.jsxs)("div",{className:"proxy-sig-row",children:[i.jsx("span",{className:"proxy-sig-label",children:"(代理人)"}),i.jsx("span",{className:"proxy-sig-value",children:a})]})]})]})]})}function o(){return i.jsx(n.Suspense,{fallback:i.jsx("div",{className:"p-8 text-center text-gray-500",children:"読み込み中..."}),children:i.jsx(a,{})})}},5047:(e,t,r)=>{"use strict";var i=r(7389);r.o(i,"useRouter")&&r.d(t,{useRouter:function(){return i.useRouter}}),r.o(i,"useSearchParams")&&r.d(t,{useSearchParams:function(){return i.useSearchParams}})},1506:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>s,metadata:()=>n});var i=r(9510);r(7272),function(){var e=Error("Cannot find module '@/components/LiffProvider'");throw e.code="MODULE_NOT_FOUND",e}();let n={title:"el-town",description:"町内会・自治会向け電子回覧板アプリ el-town"};function s({children:e}){return(0,i.jsxs)("html",{lang:"ja",children:[(0,i.jsxs)("head",{children:[i.jsx("link",{href:"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css",rel:"stylesheet"}),i.jsx("link",{href:"https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Noto+Sans+JP:wght@400;700;900&display=swap",rel:"stylesheet"})]}),i.jsx("body",{className:"antialiased",children:i.jsx(Object(function(){var e=Error("Cannot find module '@/components/LiffProvider'");throw e.code="MODULE_NOT_FOUND",e}()),{children:e})})]})}},5425:(e,t,r)=>{"use strict";r.r(t),r.d(t,{$$typeof:()=>a,__esModule:()=>s,default:()=>o});var i=r(8570);let n=(0,i.createProxy)(String.raw`C:\Users\info\.gemini\antigravity\app\resident\layout.tsx`),{__esModule:s,$$typeof:a}=n;n.default;let o=(0,i.createProxy)(String.raw`C:\Users\info\.gemini\antigravity\app\resident\layout.tsx#default`)},5381:(e,t,r)=>{"use strict";r.r(t),r.d(t,{$$typeof:()=>a,__esModule:()=>s,default:()=>o});var i=r(8570);let n=(0,i.createProxy)(String.raw`C:\Users\info\.gemini\antigravity\app\resident\proxy\page.tsx`),{__esModule:s,$$typeof:a}=n;n.default;let o=(0,i.createProxy)(String.raw`C:\Users\info\.gemini\antigravity\app\resident\proxy\page.tsx#default`)},7481:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>n});var i=r(6621);let n=e=>[{type:"image/x-icon",sizes:"16x16",url:(0,i.fillMetadataSegment)(".",e.params,"favicon.ico")+""}]},7272:()=>{}};var t=require("../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),i=t.X(0,[948,471,621],()=>r(1088));module.exports=i})();