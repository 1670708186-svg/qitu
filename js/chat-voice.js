/* 王半仙 v3 · 王半仙语音对话 + 播报
   语音输入：webkitSpeechRecognition（中文）
   语音播报：speechSynthesis（zh-CN） */
(function () {
  'use strict';

  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var supported = !!SR;
  var ttsOn = false;
  try { ttsOn = localStorage.getItem('qitu_tts') === '1'; } catch (e) {}

  function ttsAvailable() { return 'speechSynthesis' in window; }

  function setTts(on) {
    ttsOn = !!on;
    try { localStorage.setItem('qitu_tts', ttsOn ? '1' : '0'); } catch (e) {}
    if (!ttsOn) { try { window.speechSynthesis.cancel(); } catch (e) {} }
  }
  function isTtsOn() { return ttsOn; }

  /* 播报一段文本（自动截断过长内容，去掉 markdown 符号） */
  function speak(text, opts) {
    opts = opts || {};
    if (!ttsOn || !ttsAvailable()) return;
    try { window.speechSynthesis.cancel(); } catch (e) {}
    var clean = String(text || '')
      .replace(/[#*`>|【】]/g, '')
      .replace(/[-·•]\s*/g, '，')
      .replace(/[（）()\[\]「」『』]/g, '，')
      .replace(/[\s]+/g, ' ')
      .slice(0, 260);
    if (!clean) return;
    var u = new SpeechSynthesisUtterance(clean);
    u.lang = 'zh-CN';
    u.rate = 1.05;
    u.pitch = 1.02;
    var voices = [];
    try { voices = window.speechSynthesis.getVoices(); } catch (e) {}
    var zh = voices.filter(function (v) { return /zh|Chinese|普通话/i.test(v.lang + v.name); });
    if (zh.length) u.voice = zh[0];
    if (opts.onend) { u.onend = opts.onend; u.onerror = opts.onend; }
    try { window.speechSynthesis.speak(u); } catch (e) {}
  }
  function stopSpeak() { if (ttsAvailable()) { try { window.speechSynthesis.cancel(); } catch (e) {} } }

  /* 语音识别（一次性，回调结果文本） */
  function recognize(cb) {
    if (!supported) { cb(null, '浏览器不支持语音识别，请使用 Chrome/Edge'); return; }
    var rec = new SR();
    rec.lang = 'zh-CN';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = function (e) {
      var txt = '';
      for (var i = 0; i < e.results.length; i++) {
        var alt = e.results[i][0];
        if (alt && alt.transcript) txt += alt.transcript;
      }
      cb(txt || null);
    };
    rec.onerror = function (e) {
      var msg = { 'not-allowed': '麦克风权限被拒绝', 'no-speech': '没有听到声音', 'network': '语音识别网络异常', 'aborted': '已取消' }[e.error] || '语音识别失败';
      cb(null, msg);
    };
    rec.onend = function () { rec = null; };
    try { rec.start(); } catch (e) { cb(null, '语音识别启动失败'); }
  }

  window.ChatVoice = {
    supported: supported,
    ttsAvailable: ttsAvailable,
    setTts: setTts,
    isTtsOn: isTtsOn,
    speak: speak,
    stopSpeak: stopSpeak,
    recognize: recognize
  };
})();
