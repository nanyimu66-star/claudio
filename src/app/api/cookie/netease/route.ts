import { NextRequest, NextResponse } from "next/server";
import { saveCookie } from "@/services/netease";

export async function POST(req: NextRequest) {
  const { cookie } = await req.json();
  if (!cookie?.trim()) return NextResponse.json({ error: "cookie required" }, { status: 400 });
  saveCookie(cookie.trim());
  console.log(`[cookie] saved netease cookie (${cookie.trim().length} chars)`);
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const html = `<!DOCTYPE html>
<html><body style="font-family:sans-serif;background:#111;color:#eee;padding:40px;max-width:500px;margin:auto">
<h2>🔑 登录网易云</h2>

<!-- 二维码登录 -->
<div id="qr-section" style="background:#1a1a1a;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
  <div id="qr-placeholder" style="width:200px;height:200px;background:#000;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;border-radius:8px;color:#555;font-size:14px">加载中...</div>
  <div id="qr-status" style="font-size:14px;color:#aaa">请用网易云音乐 App 扫码登录</div>
  <button onclick="location.reload()" style="margin-top:12px;padding:6px 16px;background:#333;color:#ccc;border:1px solid #555;border-radius:4px;cursor:pointer">刷新二维码</button>
</div>

<details style="cursor:pointer;color:#888;font-size:14px">
<summary>或者手动粘贴 cookie（高级）</summary>
<div style="margin-top:12px">
<p style="color:#aaa;font-size:13px">F12 → 应用 → Cookies → localhost:3001 → 复制全部</p>
<textarea id="c" rows="3" style="width:100%;background:#222;color:#0f0;border:1px solid #444;padding:12px;font-size:13px;border-radius:6px"></textarea>
<button onclick="saveCookie()" style="margin-top:8px;padding:8px 24px;background:#555;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer">保存</button>
</div>
</details>

<p id="msg" style="margin-top:24px;font-size:15px"></p>

<script>
async function saveCookie() {
  const c = document.getElementById('c').value.trim();
  if (!c) return alert('请粘贴 cookie');
  const r = await fetch('/api/cookie/netease', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({cookie:c}) });
  const d = await r.json();
  document.getElementById('msg').innerHTML = d.ok ? '✅ 保存成功！重启服务器即可听歌' : '❌ 失败: ' + JSON.stringify(d);
}

// 二维码登录流程
(async () => {
  try {
    const qr = await fetch('/api/login/qr').then(r => r.json());
    if (qr.error) { document.getElementById('qr-placeholder').innerText = qr.error; return; }
    document.getElementById('qr-placeholder').innerHTML = '<img src="' + qr.qrimg + '" style="width:200px;height:200px;border-radius:8px">';

    // 轮询扫码结果
    const poll = setInterval(async () => {
      const res = await fetch('/api/login/check', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({key:qr.key}) }).then(r => r.json());

      if (res.code === 802) {
        document.getElementById('qr-status').innerText = '✅ 已扫码，确认中...';
      } else if (res.code === 803) {
        clearInterval(poll);
        document.getElementById('qr-status').innerHTML = '🎉 登录成功！cookie 已自动保存，重启服务器即可听歌';
        document.getElementById('msg').innerHTML = '✅ 登录成功，去重启服务器吧';
      } else if (res.code === 800) {
        clearInterval(poll);
        document.getElementById('qr-status').innerText = '二维码已过期，点刷新重试';
      }
    }, 2000);
  } catch (e) {
    document.getElementById('qr-placeholder').innerText = '❌ 连接失败: ' + e.message;
  }
})();
</script>
</body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html;charset=utf-8" } });
}
