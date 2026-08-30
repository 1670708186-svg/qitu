/* 强制版本刷新（防止浏览器缓存旧版 JS/CSS）
 * 思路：localStorage 记录上一次加载成功的版本号。
 *      若与当前 HTML 上的版本号不一致，自动 reload 一次（reload 时带 ?force=1 绕过反代缓存）。
 *      reload 一次后版本号匹配，不再 reload。
 */
(function() {
    try {
        // 从 HTML 上的资源 URL 提取版本号（?v=xxx）
        var scripts = document.querySelectorAll('script[src*="?v="]');
        var links = document.querySelectorAll('link[href*="?v="]');
        var currentVer = '';
        for (var i = 0; i < scripts.length; i++) {
            var m = scripts[i].src.match(/[?&]v=([^&]+)/);
            if (m) { currentVer = m[1]; break; }
        }
        if (!currentVer) {
            for (var j = 0; j < links.length; j++) {
                var m2 = links[j].href.match(/[?&]v=([^&]+)/);
                if (m2) { currentVer = m2[1]; break; }
            }
        }
        var storedVer = localStorage.getItem('wb_app_version');
        if (currentVer && storedVer !== currentVer) {
            localStorage.setItem('wb_app_version', currentVer);
            // 注意：不清 sessionStorage.reportData —— AI 报告生成可能比本脚本慢，清掉会导致"报告数据不存在"
            // 强制 reload 一次（带 ?force=1 提示反代不要缓存命中）
            if (!window.location.search.includes('force=1')) {
                var sep = window.location.search ? '&' : '?';
                window.location.replace(window.location.pathname + window.location.search + sep + 'force=1');
                return;
            }
        } else if (!storedVer && currentVer) {
            localStorage.setItem('wb_app_version', currentVer);
        }
    } catch (e) {}
})();