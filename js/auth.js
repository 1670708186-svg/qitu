/* 王半仙认证工具：token 存取 / 带鉴权请求 / 登录守卫 / 老数据迁移 */
(function () {
    const TOKEN_KEY = 'qitu_token';
    const EXP_KEY = 'qitu_token_exp';

    window.QituAuth = {
        getToken() {
            try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
        },
        setToken(t, exp) {
            try {
                localStorage.setItem(TOKEN_KEY, t);
                if (exp) localStorage.setItem(EXP_KEY, String(exp));
            } catch (e) {}
        },
        clearToken() {
            try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(EXP_KEY); } catch (e) {}
        },
        isLoggedIn() {
            return !!this.getToken();
        },
        /**
         * 统一带 token 的 fetch；401 自动清 token
         * url 可以是相对路径(/api/xxx) 或完整 URL
         */
        authFetch(url, opts) {
            opts = opts || {};
            opts.headers = Object.assign({}, opts.headers || {});
            const t = this.getToken();
            if (t) {
                // 双头保险：部分公网网关会丢 Authorization 头，X-Auth-Token 作备用通道
                opts.headers['Authorization'] = 'Bearer ' + t;
                opts.headers['X-Auth-Token'] = t;
            }
            const fullUrl = url.startsWith('http') ? url : (window.API_BASE || '') + url;
            return fetch(fullUrl, opts).then(resp => {
                if (resp.status === 401) this.clearToken();
                return resp;
            });
        },
        /**
         * 发帖/咨询前置守卫：未登录跳转 login，返回 false
         * @param {string} backPage 当前页文件名（用于登录后回跳）
         */
        requireLogin(backPage) {
            if (this.isLoggedIn()) return true;
            const back = backPage || (location.pathname.split('/').pop() || 'index.html');
            const inApp = !!window.IS_NATIVE_APP;
            const loginUrl = inApp ? 'login.html' : '/login';
            location.href = loginUrl + '?redirect=' + encodeURIComponent(back);
            return false;
        },
        /**
         * 登录/注册成功后迁移 localStorage 旧报告到账号
         * 失败静默（不阻塞登录流程，localStorage 副本仍在）
         */
        async migrateLocalReports() {
            try {
                const raw = JSON.parse(localStorage.getItem('qitu_reports') || '[]') || [];
                const ids = raw.map(r => r && r.report_id).filter(Boolean);
                if (!ids.length) return;
                await this.authFetch('/api/auth/migrate-reports', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ report_ids: ids }),
                });
            } catch (e) {
                console.warn('迁移报告失败', e);
            }
        },
        /**
         * 取当前用户（已登录）或 null（未登录/失败）
         */
        async me() {
            if (!this.isLoggedIn()) return null;
            try {
                const r = await this.authFetch('/api/auth/me');
                if (!r.ok) { this.clearToken(); return null; }
                return await r.json();
            } catch (e) { return null; }
        },
        /** 脱敏手机号 */
        maskPhone(p) {
            if (!p || p.length < 8) return p || '';
            return p.slice(0, 3) + '****' + p.slice(-4);
        },
    };
})();
