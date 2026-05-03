interface Env {
  RESEND_API_KEY?: string;
  CONTRACT_FROM_EMAIL?: string;
  CONTRACT_PHOTOGRAPHER_EMAIL?: string;
}

type SendContractBody = {
  slug?: string;
  clientName?: string;
  customerEmail?: string;
  photographerEmail?: string;
  subject?: string;
  pdfBase64?: string;
  pdfFilename?: string;
  formData?: Record<string, unknown>;
};

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: SendContractBody;
  try {
    body = (await context.request.json()) as SendContractBody;
  } catch {
    return json({ ok: false, message: '請提供正確的 JSON 內容' }, 400);
  }

  const slug = String(body.slug || '').trim();
  const clientName = String(body.clientName || '').trim();
  const customerEmail = String(body.customerEmail || '').trim();
  const pdfBase64 = String(body.pdfBase64 || '').trim();
  const pdfFilename = String(body.pdfFilename || '').trim() || `contract-${slug || 'client'}.pdf`;
  const photographerEmail = String(body.photographerEmail || '').trim()
    || context.env.CONTRACT_PHOTOGRAPHER_EMAIL
    || 'crownchief@gmail.com';

  if (!slug) return json({ ok: false, message: 'slug 不可空白' }, 400);
  if (!customerEmail) return json({ ok: false, message: 'customerEmail 不可空白' }, 400);
  if (!validEmail(customerEmail)) return json({ ok: false, message: 'Email 格式不正確' }, 400);
  if (!pdfBase64) return json({ ok: false, message: 'pdfBase64 不可空白' }, 400);

  const apiKey = context.env.RESEND_API_KEY;
  if (!apiKey) {
    return json({ ok: false, message: '尚未設定 Email API，請下載 PDF 後手動傳送。' }, 503);
  }

  const fromEmail = context.env.CONTRACT_FROM_EMAIL || 'Family Contract <onboarding@resend.dev>';
  const subject = body.subject || `小巴老師親子寫真｜預約確認書｜${clientName || slug}`;
  const text = [
    '您好，附件為本次親子寫真的預約確認書 PDF。',
    '請確認內容並完成訂金付款，匯款後請將末五碼傳給小巴老師確認。',
    '若您已付款，攝影師確認款項後會正式保留拍攝檔期。',
    '如內容有需要調整，請直接透過 Line 聯繫小巴老師。',
  ].join('\n');

  const resendPayload = {
    from: fromEmail,
    to: [customerEmail, photographerEmail],
    subject,
    text,
    attachments: [
      {
        filename: pdfFilename,
        content: pdfBase64,
      },
    ],
  };

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(resendPayload),
  });

  if (!resp.ok) {
    const detail = await resp.text();
    return json({ ok: false, message: `Resend 寄送失敗：${detail}` }, 500);
  }

  return json({
    ok: true,
    message: '合約 PDF 已寄出',
    sentTo: [customerEmail, photographerEmail],
  });
};
