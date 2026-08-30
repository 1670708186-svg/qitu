/* ════════════════════════════════════════════════════════════
 * autosave.js — 通用本地自动保存引擎 v1
 * 用法：
 *   1) 在要保存的容器上加  data-avs="存储键名"
 *   2) 段选择按钮组（如性别/历法切换）加  data-avs-seg="字段名"（按钮用 data-val 或 data-g 存值）
 *   3) 引擎自动：监听 input/change/段点击 → 防抖 400ms 写入 localStorage
 *   4) 读取历史：AutoSave.restore(键名, 容器)（通常在页面初始化完成后调用一次）
 *      AutoSave.clear(键名) 清空（如发布成功后清草稿）
 *   5) 动态生成的表单：在生成完后调 AutoSave.bind(容器)
 * 说明：type=password/hidden 不保存；checkbox 存 checked；恢复后不自动触发事件，
 *       页面可按需自行 dispatch（如日期联动、城市提示）。
 * ════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var timers = {};
  var boundScopes = [];

  function isScopeBound(scope) { return boundScopes.indexOf(scope) >= 0; }
  function markBound(scope) { boundScopes.push(scope); }

  function collect(scope) {
    var fields = Array.prototype.slice.call(scope.querySelectorAll('input, select, textarea')).filter(function (i) {
      var t = (i.type || '').toLowerCase();
      return t !== 'password' && t !== 'hidden';
    });
    var segs = Array.prototype.slice.call(scope.querySelectorAll('[data-avs-seg]'));
    return { fields: fields, segs: segs };
  }

  function segVal(btn) {
    var v = btn.getAttribute('data-val');
    if (v === null) v = btn.getAttribute('data-g');
    return v;
  }

  function read(scope) {
    var c = collect(scope), data = {};
    c.fields.forEach(function (f) {
      var id = f.id || f.name;
      if (!id) return;
      if (f.type === 'checkbox') data[id] = f.checked;
      else data[id] = f.value;
    });
    c.segs.forEach(function (s) {
      var active = s.querySelector('.active') || s.querySelector('.on');
      data[s.getAttribute('data-avs-seg')] = active ? (segVal(active) || '') : '';
    });
    return data;
  }

  function write(scope, data) {
    if (!data) return;
    var c = collect(scope);
    c.fields.forEach(function (f) {
      var id = f.id || f.name;
      if (!id || !(id in data)) return;
      try {
        if (f.type === 'checkbox') f.checked = !!data[id];
        else f.value = data[id];
      } catch (e) { /* 下拉选项动态变化时可能赋值失败，忽略 */ }
    });
    c.segs.forEach(function (s) {
      var v = data[s.getAttribute('data-avs-seg')];
      if (v === undefined || v === null || v === '') return;
      Array.prototype.forEach.call(s.children, function (b) {
        if (String(segVal(b)) === String(v)) {
          b.classList.add('active'); b.classList.add('on');
        } else {
          b.classList.remove('active'); b.classList.remove('on');
        }
      });
    });
  }

  function saveNow(scope) {
    var key = scope.getAttribute('data-avs');
    if (!key) return;
    try { localStorage.setItem(key, JSON.stringify(read(scope))); } catch (e) {}
  }

  function scheduleSave(scope) {
    var key = scope.getAttribute('data-avs');
    if (!key) return;
    clearTimeout(timers[key]);
    timers[key] = setTimeout(function () { saveNow(scope); }, 400);
  }

  function bind(scope) {
    if (!scope || isScopeBound(scope)) return;
    var key = scope.getAttribute('data-avs');
    if (!key) return;
    markBound(scope);
    scope.addEventListener('input', function () { scheduleSave(scope); });
    scope.addEventListener('change', function () { scheduleSave(scope); });
    Array.prototype.forEach.call(scope.querySelectorAll('[data-avs-seg]'), function (s) {
      s.addEventListener('click', function (e) {
        var b = e.target.closest ? e.target.closest('.seg-btn, [data-val], [data-g]') : null;
        if (!b || b.getAttribute('data-val') === null && b.getAttribute('data-g') === null) return;
        Array.prototype.forEach.call(s.children, function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        scheduleSave(scope);
      });
    });
  }

  function autoBind() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-avs]'), function (el) { bind(el); });
  }

  window.AutoSave = {
    bind: bind,
    save: saveNow,
    restore: function (key, scope) {
      var data = null;
      try { data = JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) {}
      if (data) write(scope, data);
      return data;
    },
    clear: function (key) { try { localStorage.removeItem(key); } catch (e) {} }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoBind);
  } else {
    autoBind();
  }
})();
