/* 王半仙 v3 API 配置：前端全站调用原站后端（跨域已开 CORS）
 * 原站：https://a6be461a3027cc06c.app.workbuddy.link（八字排盘 / 报告 / 每日 / 认证 API）
 * v3 是独立前端站点，无自带后端，全部 API 走原站。
 */
(function () {
    var ORIGIN = 'https://a6be461a3027cc06c.app.workbuddy.link';
    window.API_BASE = ORIGIN;
    window.IS_NATIVE_APP = false;
    // 全局 fetch 兜底：相对路径 /api/* 自动补全为原站绝对地址（防御个别页面漏用 API_BASE）
    var _fetch = window.fetch;
    window.fetch = function (url, opts) {
        if (typeof url === 'string' && url.indexOf('/api/') === 0) {
            url = ORIGIN + url;
        }
        return _fetch.call(window, url, opts);
    };
})();
